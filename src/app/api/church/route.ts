import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// GET - Buscar dados da igreja do usuário
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { churchId: true, role: true }
    })

    if (!user?.churchId) {
      return NextResponse.json({ church: null })
    }

    const church = await db.church.findUnique({
      where: { id: user.churchId },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        city: true,
        state: true,
        phone: true,
        email: true,
        serviceTimes: true,
        _count: {
          select: { User_User_churchIdToChurch: true }
        }
      }
    })

    return NextResponse.json({ church })
  } catch (error) {
    console.error("Erro ao buscar igreja:", error)
    return NextResponse.json(
      { error: "Erro ao buscar igreja" },
      { status: 500 }
    )
  }
}
