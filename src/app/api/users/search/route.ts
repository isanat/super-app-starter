import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// GET - Buscar usuário por email (para convidar músicos de outras igrejas)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "Email é obrigatório" }, { status: 400 })
    }

    // Buscar usuário pelo email (pode ser de qualquer igreja)
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        churchId: true,
        Church_User_churchIdToChurch: {
          select: {
            id: true,
            name: true,
          }
        },
        MusicianProfile: {
          select: {
            instruments: true,
            vocals: true,
            totalEvents: true,
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    // Verificar se é da mesma igreja
    const isSameChurch = user.churchId === session.user.churchId

    // Formatar resposta
    const formattedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      isSameChurch,
      church: user.Church_User_churchIdToChurch,
      instruments: user.MusicianProfile?.instruments 
        ? JSON.parse(user.MusicianProfile.instruments) 
        : [],
      vocals: user.MusicianProfile?.vocals 
        ? JSON.parse(user.MusicianProfile.vocals) 
        : [],
      totalEvents: user.MusicianProfile?.totalEvents || 0,
    }

    return NextResponse.json({ user: formattedUser })
  } catch (error) {
    console.error("Erro ao buscar usuário:", error)
    return NextResponse.json(
      { error: "Erro ao buscar usuário" },
      { status: 500 }
    )
  }
}
