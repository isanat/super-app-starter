import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// GET - Listar notificações do usuário
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const notifications = await db.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error("Erro ao buscar notificações:", error)
    return NextResponse.json(
      { error: "Erro ao buscar notificações" },
      { status: 500 }
    )
  }
}

// POST - Marcar como lida
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { notificationId, markAllRead } = body

    if (markAllRead) {
      await db.notification.updateMany({
        where: { 
          userId: session.user.id,
          isRead: false 
        },
        data: { 
          isRead: true,
          readAt: new Date()
        }
      })
      return NextResponse.json({ success: true })
    }

    if (notificationId) {
      await db.notification.update({
        where: { 
          id: notificationId,
          userId: session.user.id 
        },
        data: { 
          isRead: true,
          readAt: new Date()
        }
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Nenhuma ação especificada" }, { status: 400 })
  } catch (error) {
    console.error("Erro ao atualizar notificação:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar notificação" },
      { status: 500 }
    )
  }
}
