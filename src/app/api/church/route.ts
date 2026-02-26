import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// GET - Buscar informações da igreja
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.churchId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const church = await db.church.findUnique({
      where: { id: session.user.churchId },
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
      }
    })

    return NextResponse.json({ church })
  } catch (error) {
    console.error("Erro ao buscar igreja:", error)
    return NextResponse.json({ error: "Erro ao buscar igreja" }, { status: 500 })
  }
}

// PATCH - Atualizar informações da igreja
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.churchId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Apenas diretores podem atualizar
    if (session.user.role !== "DIRECTOR" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas diretores podem atualizar" }, { status: 403 })
    }

    const body = await request.json()
    const { name, slug, address, city, state, phone, email, serviceTimes } = body

    const church = await db.church.update({
      where: { id: session.user.churchId },
      data: {
        name,
        slug,
        address,
        city,
        state,
        phone,
        email,
        serviceTimes,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ church })
  } catch (error) {
    console.error("Erro ao atualizar igreja:", error)
    return NextResponse.json({ error: "Erro ao atualizar igreja" }, { status: 500 })
  }
}
