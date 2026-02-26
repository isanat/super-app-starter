import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// GET - Detalhes do evento
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.churchId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id } = await params

    const event = await db.event.findFirst({
      where: {
        id,
        churchId: session.user.churchId
      },
      include: {
        invitations: {
          include: {
            user: {
              include: {
                profile: true
              }
            }
          },
          orderBy: { createdAt: "asc" }
        },
        church: true,
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 })
    }

    // Estatísticas
    const stats = {
      total: event.invitations.length,
      confirmed: event.invitations.filter(i => i.status === "CONFIRMED").length,
      pending: event.invitations.filter(i => i.status === "PENDING").length,
      declined: event.invitations.filter(i => i.status === "DECLINED").length,
      cancelled: event.invitations.filter(i => i.status === "CANCELLED").length,
    }

    // Agrupar por função
    const byRole = {
      singers: event.invitations.filter(i => i.role === "SINGER"),
      instrumentalists: event.invitations.filter(i => i.role === "INSTRUMENTALIST"),
      worshipLeaders: event.invitations.filter(i => i.role === "WORSHIP_LEADER"),
      soundTechs: event.invitations.filter(i => i.role === "SOUND_TECH"),
      others: event.invitations.filter(i => i.role === "OTHER"),
    }

    return NextResponse.json({
      event,
      stats,
      byRole
    })
  } catch (error) {
    console.error("Erro ao buscar evento:", error)
    return NextResponse.json({ error: "Erro ao buscar evento" }, { status: 500 })
  }
}

// PUT - Atualizar evento com notificação
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.churchId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    if (session.user.role !== "DIRECTOR" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas diretores podem editar eventos" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const event = await db.event.findFirst({
      where: { id, churchId: session.user.churchId },
      include: {
        invitations: {
          where: { status: "CONFIRMED" },
          include: { user: true }
        }
      }
    })

    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 })
    }

    // Verificar se houve mudança relevante
    const dateChanged = body.date && new Date(body.date).getTime() !== event.date.getTime()
    const locationChanged = body.location && body.location !== event.location
    const timeChanged = body.endTime && 
      (!event.endTime || new Date(body.endTime).getTime() !== event.endTime.getTime())

    const updatedEvent = await db.event.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        type: body.type,
        date: body.date ? new Date(body.date) : undefined,
        endTime: body.endTime ? new Date(body.endTime) : null,
        location: body.location,
        notes: body.notes,
        setlist: body.setlist ? JSON.stringify(body.setlist) : null,
        status: body.status,
      }
    })

    // Enviar notificações para músicos confirmados se houver mudança relevante
    if (dateChanged || locationChanged || timeChanged) {
      const changeDetails = []
      if (dateChanged) changeDetails.push("data")
      if (timeChanged) changeDetails.push("horário")
      if (locationChanged) changeDetails.push("local")

      for (const invitation of event.invitations) {
        await db.notification.create({
          data: {
            userId: invitation.userId,
            title: "Evento Atualizado",
            message: `O evento "${event.title}" teve alterações na ${changeDetails.join(", ")}. Verifique os detalhes.`,
            type: "SYSTEM",
            data: JSON.stringify({ 
              eventId: id, 
              changes: changeDetails,
              type: "EVENT_UPDATED"
            })
          }
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      event: updatedEvent,
      notificationsSent: (dateChanged || locationChanged || timeChanged) ? event.invitations.length : 0
    })
  } catch (error) {
    console.error("Erro ao atualizar evento:", error)
    return NextResponse.json({ error: "Erro ao atualizar evento" }, { status: 500 })
  }
}

// DELETE - Cancelar evento (com ou sem penalização)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.churchId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    if (session.user.role !== "DIRECTOR" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas diretores podem cancelar eventos" }, { status: 403 })
    }

    const { id } = await params
    const url = new URL(request.url)
    const reason = url.searchParams.get("reason") || "Evento cancelado pelo diretor"
    const forgivePenalty = url.searchParams.get("forgivePenalty") === "true"

    const event = await db.event.findFirst({
      where: { id, churchId: session.user.churchId },
      include: {
        invitations: {
          include: { user: true }
        }
      }
    })

    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 })
    }

    // Marcar evento como cancelado
    await db.event.update({
      where: { id },
      data: { 
        status: "CANCELLED",
        notes: event.notes ? `${event.notes}\n\nMotivo do cancelamento: ${reason}` : `Motivo do cancelamento: ${reason}`
      }
    })

    // Processar cada convite
    for (const invitation of event.invitations) {
      // Notificar o músico
      await db.notification.create({
        data: {
          userId: invitation.userId,
          title: forgivePenalty ? "Evento Cancelado (Sem Penalização)" : "Evento Cancelado",
          message: `O evento "${event.title}" foi cancelado. ${forgivePenalty ? "Não haverá penalização para os músicos." : ""} Motivo: ${reason}`,
          type: "CANCELLATION",
          data: JSON.stringify({ 
            eventId: id, 
            forgivePenalty,
            reason 
          })
        }
      })

      // Se não perdoar penalização e o músico tinha confirmado, aplicar penalidade
      if (!forgivePenalty && invitation.status === "CONFIRMED") {
        // Aqui poderíamos aplicar penalização, mas como foi cancelado pelo diretor,
        // geralmente NÃO aplicamos penalização ao músico
        // A lógica atual não aplica penalização para cancelamento pelo diretor
      }

      // Marcar convite como cancelado
      await db.eventInvitation.update({
        where: { id: invitation.id },
        data: { 
          status: "CANCELLED",
          cancelReason: reason
        }
      })
    }

    return NextResponse.json({ 
      success: true, 
      cancelledInvitations: event.invitations.length,
      forgivePenalty
    })
  } catch (error) {
    console.error("Erro ao cancelar evento:", error)
    return NextResponse.json({ error: "Erro ao cancelar evento" }, { status: 500 })
  }
}
