import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// GET - Listar usuários/músicos
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.churchId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role")

    const where: any = {
      churchId: session.user.churchId,
      isActive: true,
    }

    if (role) {
      where.role = role
    }

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        penaltyPoints: true,
        isBlocked: true,
        weeklyAvailability: true,
        MusicianProfile: {
          select: {
            instruments: true,
            vocals: true,
            totalEvents: true,
          }
        }
      },
      orderBy: { name: "asc" }
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Erro ao buscar usuários:", error)
    return NextResponse.json(
      { error: "Erro ao buscar usuários" },
      { status: 500 }
    )
  }
}
