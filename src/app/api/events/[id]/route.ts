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

// PUT - Atualizar evento
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
      where: { id, churchId: session.user.churchId }
    })

    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 })
    }

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

    return NextResponse.json({ success: true, event: updatedEvent })
  } catch (error) {
    console.error("Erro ao atualizar evento:", error)
    return NextResponse.json({ error: "Erro ao atualizar evento" }, { status: 500 })
  }
}

// DELETE - Excluir evento
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
      return NextResponse.json({ error: "Apenas diretores podem excluir eventos" }, { status: 403 })
    }

    const { id } = await params

    const event = await db.event.findFirst({
      where: { id, churchId: session.user.churchId }
    })

    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 })
    }

    // Marcar como cancelado em vez de excluir
    await db.event.update({
      where: { id },
      data: { status: "CANCELLED" }
    })

    // Notificar todos os convidados
    const invitations = await db.eventInvitation.findMany({
      where: { eventId: id },
      select: { userId: true }
    })

    for (const invitation of invitations) {
      await db.notification.create({
        data: {
          userId: invitation.userId,
          title: "Evento Cancelado",
          message: `O evento "${event.title}" foi cancelado.`,
          type: "CANCELLATION",
          data: JSON.stringify({ eventId: id })
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao excluir evento:", error)
    return NextResponse.json({ error: "Erro ao excluir evento" }, { status: 500 })
  }
}
