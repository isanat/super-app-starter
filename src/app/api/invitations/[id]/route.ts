import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// Constantes de penalização
const PENALTY_POINTS_CANCEL = 3
const MAX_PENALTY_POINTS = 9
const BLOCK_DAYS = 30

// GET - Detalhes do convite
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id } = await params

    const invitation = await db.eventInvitation.findFirst({
      where: {
        id,
        userId: session.user.id
      },
      include: {
        event: {
          include: { church: true }
        }
      }
    })

    if (!invitation) {
      return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 })
    }

    return NextResponse.json({ invitation })
  } catch (error) {
    console.error("Erro ao buscar convite:", error)
    return NextResponse.json({ error: "Erro ao buscar convite" }, { status: 500 })
  }
}

// PUT - Responder ao convite (confirmar, recusar, cancelar)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { action, cancelReason } = body // action: "confirm", "decline", "cancel"

    const invitation = await db.eventInvitation.findFirst({
      where: { id, userId: session.user.id },
      include: { event: true }
    })

    if (!invitation) {
      return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 })
    }

    const now = new Date()
    let newStatus = invitation.status
    let penaltyApplied = false
    let penaltyPoints = 0

    switch (action) {
      case "confirm":
        if (invitation.status !== "PENDING") {
          return NextResponse.json({ error: "Este convite já foi respondido" }, { status: 400 })
        }
        newStatus = "CONFIRMED"
        break

      case "decline":
        if (invitation.status !== "PENDING") {
          return NextResponse.json({ error: "Este convite já foi respondido" }, { status: 400 })
        }
        newStatus = "DECLINED"
        break

      case "cancel":
        // Só pode cancelar se já tinha confirmado
        if (invitation.status !== "CONFIRMED") {
          return NextResponse.json({ error: "Só é possível cancelar após confirmação" }, { status: 400 })
        }
        
        newStatus = "CANCELLED"
        penaltyApplied = true
        penaltyPoints = PENALTY_POINTS_CANCEL

        // Aplicar penalização ao usuário
        const currentUser = await db.user.findUnique({
          where: { id: session.user.id }
        })

        if (currentUser) {
          const newPenaltyPoints = currentUser.penaltyPoints + PENALTY_POINTS_CANCEL
          const shouldBlock = newPenaltyPoints >= MAX_PENALTY_POINTS
          const blockedUntil = shouldBlock 
            ? new Date(now.getTime() + BLOCK_DAYS * 24 * 60 * 60 * 1000)
            : null

          await db.user.update({
            where: { id: session.user.id },
            data: {
              penaltyPoints: newPenaltyPoints,
              isBlocked: shouldBlock,
              blockedUntil
            }
          })

          // Registrar no histórico
          await db.penaltyHistory.create({
            data: {
              userId: session.user.id,
              eventId: invitation.eventId,
              invitationId: invitation.id,
              points: PENALTY_POINTS_CANCEL,
              reason: "Cancelamento após confirmação",
              description: cancelReason || "Cancelou participação no evento"
            }
          })

          // Notificar usuário sobre penalização
          await db.notification.create({
            data: {
              userId: session.user.id,
              title: "⚠️ Penalização Aplicada",
              message: `Você recebeu ${PENALTY_POINTS_CANCEL} pontos de penalização por cancelar após confirmar. Total: ${newPenaltyPoints}/${MAX_PENALTY_POINTS}. ${shouldBlock ? `Você está bloqueado por ${BLOCK_DAYS} dias.` : ''}`,
              type: "PENALTY",
              data: JSON.stringify({ 
                penaltyPoints: PENALTY_POINTS_CANCEL, 
                totalPoints: newPenaltyPoints,
                isBlocked: shouldBlock 
              })
            }
          })
        }

        // Atualizar estatísticas do perfil
        await db.musicianProfile.updateMany({
          where: { userId: session.user.id },
          data: { totalCancels: { increment: 1 } }
        })
        break

      default:
        return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
    }

    // Atualizar convite
    const updatedInvitation = await db.eventInvitation.update({
      where: { id },
      data: {
        status: newStatus,
        respondedAt: now,
        cancelReason: cancelReason || null,
        penaltyApplied,
        penaltyPoints: penaltyPoints || null
      }
    })

    // Notificar diretor sobre a resposta
    const event = await db.event.findUnique({
      where: { id: invitation.eventId },
      include: { createdBy: true }
    })

    if (event?.createdById) {
      const userName = session.user.name
      const actionText = action === "confirm" ? "confirmou" : 
                        action === "decline" ? "recusou" : "cancelou"
      
      await db.notification.create({
        data: {
          userId: event.createdById,
          title: `Músico ${actionText} presença`,
          message: `${userName} ${actionText} participação em "${event.title}"${action === "cancel" ? " (penalizado)" : ""}`,
          type: action === "cancel" ? "CANCELLATION" : "CONFIRMATION",
          data: JSON.stringify({ 
            eventId: event.id, 
            invitationId: id,
            action 
          })
        }
      })
    }

    // Se confirmou, atualizar estatísticas do perfil
    if (action === "confirm") {
      await db.musicianProfile.updateMany({
        where: { userId: session.user.id },
        data: { totalEvents: { increment: 1 } }
      })
    }

    console.log(`✅ Convite ${id}: ${action}`)

    return NextResponse.json({ 
      success: true, 
      invitation: updatedInvitation,
      penaltyApplied,
      penaltyPoints
    })
  } catch (error) {
    console.error("Erro ao responder convite:", error)
    return NextResponse.json({ error: "Erro ao responder convite" }, { status: 500 })
  }
}
