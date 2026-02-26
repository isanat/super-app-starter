import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { addPoints, updateStreak, POINTS } from "@/lib/gamification"

// GET - Listar convites do usuário
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const where: any = {
      userId: session.user.id,
    }

    if (status) {
      where.status = status
    }

    const invitations = await db.eventInvitation.findMany({
      where,
      include: {
        event: {
          include: {
            church: { select: { name: true } },
            createdBy: { select: { name: true } }
          }
        }
      },
      orderBy: { invitedAt: "desc" }
    })

    return NextResponse.json({ invitations })
  } catch (error) {
    console.error("Erro ao buscar convites:", error)
    return NextResponse.json(
      { error: "Erro ao buscar convites" },
      { status: 500 }
    )
  }
}

// POST - Enviar convites (diretor) ou responder convite (músico)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    // Ação: Enviar convites para múltiplos músicos
    if (action === "sendInvites") {
      if (session.user.role !== "DIRECTOR") {
        return NextResponse.json({ error: "Apenas diretores podem enviar convites" }, { status: 403 })
      }

      const { eventId, invitations } = body // invitations: [{ userId, role, instrument, vocalPart }]
      
      if (!eventId || !Array.isArray(invitations)) {
        return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
      }

      // Verificar se o evento pertence à igreja do diretor
      const event = await db.event.findFirst({
        where: { id: eventId, churchId: session.user.churchId }
      })

      if (!event) {
        return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 })
      }

      // Criar convites
      const createdInvitations = await Promise.all(
        invitations.map(inv => 
          db.eventInvitation.create({
            data: {
              eventId,
              userId: inv.userId,
              role: inv.role || "MUSICIAN",
              instrument: inv.instrument,
              vocalPart: inv.vocalPart,
              status: "PENDING",
            }
          })
        )
      )

      // Criar notificações para cada músico
      await Promise.all(
        invitations.map(inv =>
          db.notification.create({
            data: {
              userId: inv.userId,
              title: "Novo convite para evento!",
              message: `Você foi convidado para "${event.title}" em ${new Date(event.date).toLocaleDateString('pt-BR')}`,
              type: "EVENT_INVITE",
              data: JSON.stringify({ eventId, invitationId: createdInvitations.find(ci => ci.userId === inv.userId)?.id }),
              sentViaApp: true,
            }
          })
        )
      )

      // Atualizar status do evento para PUBLISHED
      await db.event.update({
        where: { id: eventId },
        data: { status: "PUBLISHED" }
      })

      return NextResponse.json({ 
        success: true, 
        invitationsCreated: createdInvitations.length 
      })
    }

    // Ação: Responder convite (confirmar ou recusar)
    if (action === "respond") {
      const { invitationId, status, cancelReason } = body

      if (!invitationId || !status) {
        return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
      }

      const invitation = await db.eventInvitation.findFirst({
        where: { 
          id: invitationId,
          userId: session.user.id 
        },
        include: { event: true }
      })

      if (!invitation) {
        return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 })
      }

      // Se está cancelando após ter confirmado
      if (invitation.status === "CONFIRMED" && status === "CANCELLED") {
        // Aplicar penalização
        const PENALTY_POINTS = 3
        
        await db.$transaction([
          // Atualizar convite
          db.eventInvitation.update({
            where: { id: invitationId },
            data: { 
              status: "CANCELLED", 
              cancelReason,
              penaltyApplied: true,
              penaltyPoints: PENALTY_POINTS,
              respondedAt: new Date()
            }
          }),
          // Adicionar pontos ao usuário
          db.user.update({
            where: { id: session.user.id },
            data: { 
              penaltyPoints: { increment: PENALTY_POINTS },
              isBlocked: session.user.penaltyPoints + PENALTY_POINTS >= 9,
              blockedUntil: session.user.penaltyPoints + PENALTY_POINTS >= 9 
                ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias
                : null
            }
          }),
          // Registrar no histórico
          db.penaltyHistory.create({
            data: {
              userId: session.user.id,
              eventId: invitation.eventId,
              invitationId,
              points: PENALTY_POINTS,
              reason: "Cancelamento após confirmação",
              description: cancelReason || "Cancelou participação sem justificativa"
            }
          }),
          // Notificar diretor
          db.notification.create({
            data: {
              userId: invitation.event.createdById,
              title: "Músico cancelou participação",
              message: `${session.user.name} cancelou a participação em "${invitation.event.title}"`,
              type: "CANCELLATION",
              data: JSON.stringify({ eventId: invitation.eventId, userId: session.user.id }),
            }
          })
        ])

        return NextResponse.json({ 
          success: true, 
          penaltyApplied: true,
          penaltyPoints: PENALTY_POINTS,
          message: "Cancelamento registrado. Penalização aplicada."
        })
      }

      // Resposta normal (confirmar ou recusar)
      const updatedInvitation = await db.eventInvitation.update({
        where: { id: invitationId },
        data: { 
          status,
          respondedAt: new Date()
        }
      })

      // Notificar diretor sobre confirmação
      if (status === "CONFIRMED") {
        await db.notification.create({
          data: {
            userId: invitation.event.createdById,
            title: "Músico confirmou participação",
            message: `${session.user.name} confirmou presença em "${invitation.event.title}"`,
            type: "CONFIRMATION",
            data: JSON.stringify({ eventId: invitation.eventId, userId: session.user.id }),
          }
        })

        // Atualizar estatísticas do músico
        await db.musicianProfile.update({
          where: { userId: session.user.id },
          data: { totalEvents: { increment: 1 } }
        })

        // ===== GAMIFICAÇÃO: Adicionar pontos por confirmar =====
        // Verificar se é substituição de última hora (menos de 24h antes do evento)
        const hoursUntilEvent = (new Date(invitation.event.date).getTime() - Date.now()) / (1000 * 60 * 60)
        const isLastMinute = hoursUntilEvent > 0 && hoursUntilEvent < 24

        if (isLastMinute) {
          // Substituição de última hora: +30 pontos
          await addPoints(
            session.user.id,
            POINTS.LAST_MINUTE_FILL,
            "LAST_MINUTE_FILL",
            "Substituição de última hora!",
            { eventId: invitation.eventId, invitationId }
          )
        } else {
          // Confirmação normal: +10 pontos
          await addPoints(
            session.user.id,
            POINTS.EVENT_CONFIRMED,
            "EVENT_CONFIRMED",
            "Confirmou presença no evento",
            { eventId: invitation.eventId, invitationId }
          )
        }
      }

      return NextResponse.json({ success: true, invitation: updatedInvitation })
    }

    // Ação: Gerar escala automática
    if (action === "autoGenerate") {
      if (session.user.role !== "DIRECTOR") {
        return NextResponse.json({ error: "Apenas diretores podem gerar escala" }, { status: 403 })
      }

      const { eventId, needs } = body // needs: { singers: 2, guitar: 1, bass: 1, drums: 1 }

      if (!eventId || !needs) {
        return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
      }

      const event = await db.event.findFirst({
        where: { id: eventId, churchId: session.user.churchId }
      })

      if (!event) {
        return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 })
      }

      // Buscar músicos disponíveis
      const res = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: event.title,
          type: event.type,
          date: event.date,
          autoSuggest: true
        })
      })
      
      const { suggestedMusicians } = await res.json()

      // Montar escala automaticamente baseado nas necessidades
      const scale: any[] = []
      const assigned = new Set<string>()

      for (const [role, count] of Object.entries(needs)) {
        const needed = count as number
        let assigned_count = 0

        for (const musician of suggestedMusicians) {
          if (assigned_count >= needed) break
          if (assigned.has(musician.id)) continue

          // Verificar se o músico atende ao papel
          const instruments = musician.instruments || []
          const vocals = musician.vocals || []

          const matchesRole = 
            (role === 'singer' && vocals.length > 0) ||
            (role !== 'singer' && instruments.includes(role))

          if (matchesRole) {
            scale.push({
              userId: musician.id,
              role: role === 'singer' ? 'SINGER' : 'INSTRUMENTALIST',
              instrument: role !== 'singer' ? role : undefined,
              vocalPart: role === 'singer' ? vocals[0] : undefined,
            })
            assigned.add(musician.id)
            assigned_count++
          }
        }
      }

      return NextResponse.json({ 
        suggestedScale: scale,
        musicians: suggestedMusicians.filter(m => assigned.has(m.id))
      })
    }

    return NextResponse.json({ error: "Ação não reconhecida" }, { status: 400 })
  } catch (error) {
    console.error("Erro ao processar convites:", error)
    return NextResponse.json(
      { error: "Erro ao processar convites" },
      { status: 500 }
    )
  }
}
