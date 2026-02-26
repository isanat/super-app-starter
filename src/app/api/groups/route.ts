import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// GET - Listar grupos
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Buscar grupos onde o usuário é membro ou é o criador
    const groups = await db.musicGroup.findMany({
      where: {
        OR: [
          { createdById: session.user.id },
          { 
            GroupMember: {
              some: { userId: session.user.id }
            }
          }
        ]
      },
      include: {
        GroupMember: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              }
            }
          }
        },
        User: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({ groups })
  } catch (error) {
    console.error("Erro ao buscar grupos:", error)
    return NextResponse.json({ error: "Erro ao buscar grupos" }, { status: 500 })
  }
}

// POST - Criar grupo
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, type, isPublic } = body

    if (!name || !type) {
      return NextResponse.json({ error: "Nome e tipo são obrigatórios" }, { status: 400 })
    }

    // Criar grupo e adicionar criador como líder
    const group = await db.musicGroup.create({
      data: {
        name,
        description,
        type,
        isPublic: isPublic ?? true,
        createdById: session.user.id,
      }
    })

    // Adicionar criador como líder
    await db.groupMember.create({
      data: {
        groupId: group.id,
        userId: session.user.id,
        role: "LEADER",
        isLeader: true,
      }
    })

    return NextResponse.json({ group })
  } catch (error) {
    console.error("Erro ao criar grupo:", error)
    return NextResponse.json({ error: "Erro ao criar grupo" }, { status: 500 })
  }
}
