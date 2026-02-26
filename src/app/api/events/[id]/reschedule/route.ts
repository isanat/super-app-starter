import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// POST - Reagendar evento (solicita reconfirmação dos músicos)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.churchId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    if (session.user.role !== "DIRECTOR" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas diretores podem reagendar eventos" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { newDate, newEndTime, reason } = body

    if (!newDate) {
      return NextResponse.json({ error: "Nova data é obrigatória" }, { status: 400 })
    }

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

    // Atualizar o evento com a nova data
    const updatedEvent = await db.event.update({
      where: { id },
      data: {
        date: new Date(newDate),
        endTime: newEndTime ? new Date(newEndTime) : null,
        notes: event.notes 
          ? `${event.notes}\n\nReagendado em ${new Date().toLocaleDateString('pt-BR')}. Motivo: ${reason || 'Não informado'}`
          : `Reagendado em ${new Date().toLocaleDateString('pt-BR')}. Motivo: ${reason || 'Não informado'}`,
        status: "PUBLISHED" // Mantém publicado mas aguarda reconfirmação
      }
    })

    // Resetar todos os convites confirmados para PENDING e enviar notificação
    let reconfirmationCount = 0
    for (const invitation of event.invitations) {
      // Voltar status para PENDING
      await db.eventInvitation.update({
        where: { id: invitation.id },
        data: { 
          status: "PENDING",
          respondedAt: null
        }
      })

      // Criar notificação solicitando reconfirmação
      await db.notification.create({
        data: {
          userId: invitation.userId,
          title: "Reagendamento - Confirme sua Presença",
          message: `O evento "${event.title}" foi reagendado para ${new Date(newDate).toLocaleDateString('pt-BR')} às ${new Date(newDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. Por favor, confirme sua disponibilidade para a nova data.`,
          type: "EVENT_INVITE",
          data: JSON.stringify({ 
            eventId: id, 
            type: "RESCHEDULE_REQUEST",
            newDate,
            reason
          })
        }
      })
      reconfirmationCount++
    }

    return NextResponse.json({ 
      success: true, 
      event: updatedEvent,
      reconfirmationRequests: reconfirmationCount,
      message: `Evento reagendado. ${reconfirmationCount} músicos precisam confirmar a nova data.`
    })
  } catch (error) {
    console.error("Erro ao reagendar evento:", error)
    return NextResponse.json({ error: "Erro ao reagendar evento" }, { status: 500 })
  }
}
