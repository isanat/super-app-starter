import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// PUT - Marcar notificação como lida
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

    await db.notification.update({
      where: { 
        id,
        userId: session.user.id 
      },
      data: { 
        isRead: true,
        readAt: new Date()
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao atualizar notificação:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar notificação" },
      { status: 500 }
    )
  }
}
