import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { 
  calculateProgress,
  seedAchievements,
  getChurchRanking 
} from "@/lib/gamification"

// GET - Buscar dados de gamificação do usuário
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")

    // Ranking da igreja
    if (action === "ranking") {
      if (!session.user.churchId) {
        return NextResponse.json({ ranking: [] })
      }
      const ranking = await getChurchRanking(session.user.churchId, 10)
      return NextResponse.json({ ranking })
    }

    // Buscar dados do usuário
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        totalPoints: true,
        level: true,
        streak: true,
        churchId: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    // Buscar conquistas do usuário
    const achievements = await db.userAchievement.findMany({
      where: { userId: user.id },
      include: {
        achievement: true,
      },
      orderBy: { unlockedAt: "desc" },
    })

    // Buscar histórico de pontos recente
    const recentPoints = await db.pointHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    })

    // Calcular progresso
    const progress = calculateProgress(user.totalPoints)

    return NextResponse.json({
      user: {
        ...user,
        levelInfo: progress.currentLevel,
      },
      progress,
      achievements: achievements.map(a => ({
        id: a.achievement.id,
        code: a.achievement.code,
        name: a.achievement.name,
        description: a.achievement.description,
        icon: a.achievement.icon,
        category: a.achievement.category,
        unlockedAt: a.unlockedAt,
      })),
      recentPoints,
      totalAchievements: achievements.length,
    })
  } catch (error) {
    console.error("Erro ao buscar gamificação:", error)
    return NextResponse.json(
      { error: "Erro ao buscar dados de gamificação" },
      { status: 500 }
    )
  }
}

// POST - Inicializar conquistas padrão
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "DIRECTOR") {
      return NextResponse.json({ error: "Apenas diretores podem inicializar" }, { status: 401 })
    }

    await seedAchievements()

    return NextResponse.json({ message: "Conquistas inicializadas com sucesso" })
  } catch (error) {
    console.error("Erro ao inicializar conquistas:", error)
    return NextResponse.json(
      { error: "Erro ao inicializar conquistas" },
      { status: 500 }
    )
  }
}
