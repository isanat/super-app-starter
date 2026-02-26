import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// GET - Listar convites do evento
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

    const invitations = await db.eventInvitation.findMany({
      where: { eventId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            penaltyPoints: true,
            isBlocked: true,
            profile: true
          }
        }
      },
      orderBy: { createdAt: "asc" }
    })

    return NextResponse.json({ invitations })
  } catch (error) {
    console.error("Erro ao buscar convites:", error)
    return NextResponse.json({ error: "Erro ao buscar convites" }, { status: 500 })
  }
}

// POST - Adicionar músicos à escala (enviar convites)
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
      return NextResponse.json({ error: "Apenas diretores podem escalar músicos" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { musicians } = body // Array de { userId, role, instrument?, vocalPart? }

    if (!musicians || !Array.isArray(musicians) || musicians.length === 0) {
      return NextResponse.json({ error: "Lista de músicos é obrigatória" }, { status: 400 })
    }

    // Verificar se evento existe
    const event = await db.event.findFirst({
      where: { id, churchId: session.user.churchId }
    })

    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 })
    }

    // Criar convites e notificações
    const createdInvitations = []
    
    for (const musician of musicians) {
      // Verificar se já existe convite
      const existing = await db.eventInvitation.findUnique({
        where: {
          eventId_userId: { eventId: id, userId: musician.userId }
        }
      })

      if (existing) {
        continue // Pular se já existe
      }

      // Verificar se usuário pertence à mesma igreja
      const user = await db.user.findFirst({
        where: { 
          id: musician.userId,
          churchId: session.user.churchId 
        }
      })

      if (!user) {
        continue // Pular se usuário não é da mesma igreja
      }

      // Criar convite
      const invitation = await db.eventInvitation.create({
        data: {
          eventId: id,
          userId: musician.userId,
          role: musician.role || "INSTRUMENTALIST",
          instrument: musician.instrument,
          vocalPart: musician.vocalPart,
          status: "PENDING",
        }
      })

      // Criar notificação
      await db.notification.create({
        data: {
          userId: musician.userId,
          title: "Você foi escalado! 🎵",
          message: `Você foi escalado para "${event.title}" em ${new Date(event.date).toLocaleDateString('pt-BR')}. Por favor, confirme sua presença.`,
          type: "EVENT_INVITE",
          data: JSON.stringify({ 
            eventId: id, 
            invitationId: invitation.id 
          })
        }
      })

      createdInvitations.push(invitation)
    }

    // Se houver convites, atualizar status do evento para PUBLISHED
    if (createdInvitations.length > 0) {
      await db.event.update({
        where: { id },
        data: { status: "PUBLISHED" }
      })
    }

    console.log(`✅ ${createdInvitations.length} convites enviados`)

    return NextResponse.json({ 
      success: true, 
      invitations: createdInvitations,
      count: createdInvitations.length 
    })
  } catch (error) {
    console.error("Erro ao enviar convites:", error)
    return NextResponse.json({ error: "Erro ao enviar convites" }, { status: 500 })
  }
}
