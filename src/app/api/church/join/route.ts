import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// GET - Listar igrejas disponíveis
export async function GET(request: NextRequest) {
  try {
    const churches = await db.church.findMany({
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        _count: {
          select: { members: true }
        }
      },
      orderBy: { name: "asc" }
    })

    return NextResponse.json({ churches })
  } catch (error) {
    console.error("Erro ao buscar igrejas:", error)
    return NextResponse.json(
      { error: "Erro ao buscar igrejas" },
      { status: 500 }
    )
  }
}

// POST - Entrar em uma igreja
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { churchId, inviteCode } = body

    let church

    if (inviteCode) {
      // Buscar igreja por código de convite
      church = await db.church.findFirst({
        where: { slug: inviteCode }
      })
    } else if (churchId) {
      church = await db.church.findUnique({
        where: { id: churchId }
      })
    }

    if (!church) {
      return NextResponse.json({ error: "Igreja não encontrada" }, { status: 404 })
    }

    // Atualizar usuário com churchId
    await db.user.update({
      where: { id: session.user.id },
      data: { churchId: church.id }
    })

    return NextResponse.json({ 
      success: true, 
      church: { id: church.id, name: church.name } 
    })
  } catch (error) {
    console.error("Erro ao entrar na igreja:", error)
    return NextResponse.json(
      { error: "Erro ao entrar na igreja" },
      { status: 500 }
    )
  }
}
