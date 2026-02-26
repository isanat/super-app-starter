import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// GET - Listar membros do grupo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id } = await params

    const members = await db.groupMember.findMany({
      where: { groupId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            phone: true,
          }
        }
      },
      orderBy: { joinedAt: "asc" }
    })

    return NextResponse.json({ members })
  } catch (error) {
    console.error("Erro ao buscar membros:", error)
    return NextResponse.json({ error: "Erro ao buscar membros" }, { status: 500 })
  }
}

// POST - Adicionar membro ao grupo
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { email, role, instrument, vocalPart } = body

    if (!email) {
      return NextResponse.json({ error: "E-mail é obrigatório" }, { status: 400 })
    }

    // Verificar se o usuário é líder do grupo
    const memberRecord = await db.groupMember.findFirst({
      where: { groupId: id, userId: session.user.id, isLeader: true }
    })

    if (!memberRecord) {
      return NextResponse.json({ error: "Apenas líderes podem adicionar membros" }, { status: 403 })
    }

    // Buscar usuário pelo email
    const user = await db.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    // Verificar se já é membro
    const existingMember = await db.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId: user.id } }
    })

    if (existingMember) {
      return NextResponse.json({ error: "Usuário já é membro do grupo" }, { status: 400 })
    }

    // Adicionar membro
    const newMember = await db.groupMember.create({
      data: {
        groupId: id,
        userId: user.id,
        role: role || "MEMBER",
        isLeader: false,
        instrument,
        vocalPart,
      },
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
    })

    return NextResponse.json({ member: newMember })
  } catch (error) {
    console.error("Erro ao adicionar membro:", error)
    return NextResponse.json({ error: "Erro ao adicionar membro" }, { status: 500 })
  }
}

// DELETE - Remover membro do grupo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "ID do usuário é obrigatório" }, { status: 400 })
    }

    // Verificar se é líder ou está removendo a si mesmo
    const memberRecord = await db.groupMember.findFirst({
      where: { groupId: id, userId: session.user.id }
    })

    if (!memberRecord) {
      return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 })
    }

    if (!memberRecord.isLeader && session.user.id !== userId) {
      return NextResponse.json({ error: "Sem permissão para remover este membro" }, { status: 403 })
    }

    // Remover membro
    await db.groupMember.delete({
      where: { groupId_userId: { groupId: id, userId } }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao remover membro:", error)
    return NextResponse.json({ error: "Erro ao remover membro" }, { status: 500 })
  }
}
