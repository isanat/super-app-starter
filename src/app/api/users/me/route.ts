import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// GET - Obter perfil do usuário atual
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        role: true,
        penaltyPoints: true,
        isBlocked: true,
        blockedUntil: true,
        churchId: true,
        createdAt: true,
        church: {
          select: { id: true, name: true, slug: true }
        },
        musicianProfile: {
          select: {
            instruments: true,
            vocals: true,
            bio: true,
            totalEvents: true,
            totalCancels: true,
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Erro ao buscar perfil:", error)
    return NextResponse.json({ error: "Erro ao buscar perfil" }, { status: 500 })
  }
}

// PUT - Atualizar perfil do usuário atual
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { name, phone, instruments, vocals, bio } = body

    // Atualizar dados básicos do usuário
    const updateData: any = {}
    if (name) updateData.name = name
    if (phone) updateData.phone = phone

    if (Object.keys(updateData).length > 0) {
      await db.user.update({
        where: { id: session.user.id },
        data: updateData
      })
    }

    // Atualizar perfil de músico
    const profileUpdateData: any = {}
    if (instruments) profileUpdateData.instruments = JSON.stringify(instruments)
    if (vocals) profileUpdateData.vocals = JSON.stringify(vocals)
    if (bio !== undefined) profileUpdateData.bio = bio

    if (Object.keys(profileUpdateData).length > 0) {
      await db.musicianProfile.upsert({
        where: { userId: session.user.id },
        update: profileUpdateData,
        create: {
          userId: session.user.id,
          ...profileUpdateData
        }
      })
    }

    console.log("✅ Perfil atualizado:", session.user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error)
    return NextResponse.json({ error: "Erro ao atualizar perfil" }, { status: 500 })
  }
}
