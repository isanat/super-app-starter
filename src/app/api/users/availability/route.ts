import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// GET - Obter disponibilidade do usuário
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { weeklyAvailability: true }
    })

    let availability = {
      sabado_manha: true,
      sabado_tarde: true,
      sabado_noite: true,
      quarta_tarde: true,
      quarta_noite: true,
      outros: true
    }

    if (user?.weeklyAvailability) {
      try {
        availability = JSON.parse(user.weeklyAvailability)
      } catch {}
    }

    return NextResponse.json({ availability })
  } catch (error) {
    console.error("Erro ao buscar disponibilidade:", error)
    return NextResponse.json({ error: "Erro ao buscar disponibilidade" }, { status: 500 })
  }
}

// PUT - Atualizar disponibilidade semanal
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { availability } = body

    // Validar estrutura
    const validKeys = ["sabado_manha", "sabado_tarde", "sabado_noite", "quarta_tarde", "quarta_noite", "outros"]
    const filteredAvailability: Record<string, boolean> = {}
    
    for (const key of validKeys) {
      if (typeof availability[key] === "boolean") {
        filteredAvailability[key] = availability[key]
      }
    }

    await db.user.update({
      where: { id: session.user.id },
      data: {
        weeklyAvailability: JSON.stringify(filteredAvailability)
      }
    })

    console.log("✅ Disponibilidade atualizada:", session.user.id)

    return NextResponse.json({ 
      success: true, 
      availability: filteredAvailability 
    })
  } catch (error) {
    console.error("Erro ao atualizar disponibilidade:", error)
    return NextResponse.json({ error: "Erro ao atualizar disponibilidade" }, { status: 500 })
  }
}
