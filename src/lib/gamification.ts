// Sistema de Gamificação - Louvor Conectado

import { db } from '@/lib/db'

// Níveis disponíveis
export const LEVELS = [
  { level: 1, name: 'Novo no Ministério', minPoints: 0, icon: '🌱' },
  { level: 2, name: 'Músico Ativo', minPoints: 51, icon: '🎵' },
  { level: 3, name: 'Ministrante', minPoints: 151, icon: '🎤' },
  { level: 4, name: 'Músico Destaque', minPoints: 301, icon: '🎸' },
  { level: 5, name: 'Líder de Louvor', minPoints: 501, icon: '⭐' },
  { level: 6, name: 'Referência Musical', minPoints: 801, icon: '👑' },
]

// Pontos por ação
export const POINTS = {
  EVENT_CONFIRMED: 10,      // Confirmou presença
  EVENT_ATTENDED: 20,       // Participou do evento
  REHEARSAL_ATTENDED: 15,   // Participou de ensaio
  LAST_MINUTE_FILL: 30,     // Substituição de última hora
  REFERRAL_JOINED: 25,      // Convidou músico que entrou
  STREAK_BONUS: 5,          // Bônus por sequência
  ACHIEVEMENT_BONUS: 0,     // Bônus variável por conquista
}

// Conquistas padrão
export const DEFAULT_ACHIEVEMENTS = [
  {
    code: 'em_chama',
    name: 'Em Chama',
    description: '5 eventos consecutivos confirmados',
    icon: '🔥',
    category: 'STREAK',
    requirement: 'events_consecutive:5',
    bonusPoints: 25,
  },
  {
    code: 'sempre_presente',
    name: 'Sempre Presente',
    description: '10 eventos sem faltar',
    icon: '⭐',
    category: 'PARTICIPATION',
    requirement: 'total_events:10',
    bonusPoints: 50,
  },
  {
    code: 'pontualidade',
    name: 'Pontualidade',
    description: 'Confirmou todos os convites em até 24h',
    icon: '⏰',
    category: 'PARTICIPATION',
    requirement: 'fast_confirmations:5',
    bonusPoints: 20,
  },
  {
    code: 'versatil',
    name: 'Versátil',
    description: 'Participou de 3 tipos de eventos diferentes',
    icon: '🎵',
    category: 'SKILL',
    requirement: 'event_types:3',
    bonusPoints: 30,
  },
  {
    code: 'conector',
    name: 'Conector',
    description: '3 músicos entraram pelo seu convite',
    icon: '👥',
    category: 'SOCIAL',
    requirement: 'referrals:3',
    bonusPoints: 40,
  },
  {
    code: 'na_retaxia',
    name: 'Na Retóxia',
    description: 'Aceitou 2 substituições de última hora',
    icon: '💪',
    category: 'SPECIAL',
    requirement: 'last_minute_fills:2',
    bonusPoints: 35,
  },
  {
    code: 'fiel_sabado',
    name: 'Fiel ao Sábado',
    description: 'Participou de todos os sábados do mês',
    icon: '📅',
    category: 'PARTICIPATION',
    requirement: 'all_saturdays_month:1',
    bonusPoints: 45,
  },
  {
    code: 'polivalente',
    name: 'Polivalente',
    description: 'Toca 2 ou mais instrumentos',
    icon: '🎻',
    category: 'SKILL',
    requirement: 'instruments:2',
    bonusPoints: 25,
  },
  {
    code: 'veterano',
    name: 'Veterano',
    description: '50 eventos participados',
    icon: '🎖️',
    category: 'PARTICIPATION',
    requirement: 'total_events:50',
    bonusPoints: 100,
  },
  {
    code: 'lenda',
    name: 'Lenda do Louvor',
    description: '100 eventos participados',
    icon: '🏆',
    category: 'SPECIAL',
    requirement: 'total_events:100',
    bonusPoints: 200,
  },
]

// Calcular nível baseado nos pontos
export function calculateLevel(totalPoints: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalPoints >= LEVELS[i].minPoints) {
      return LEVELS[i]
    }
  }
  return LEVELS[0]
}

// Calcular progresso para o próximo nível
export function calculateProgress(totalPoints: number) {
  const currentLevel = calculateLevel(totalPoints)
  const nextLevelIndex = LEVELS.findIndex(l => l.level === currentLevel.level) + 1
  
  if (nextLevelIndex >= LEVELS.length) {
    return { progress: 100, pointsToNext: 0, currentLevel, nextLevel: null }
  }
  
  const nextLevel = LEVELS[nextLevelIndex]
  const pointsInLevel = totalPoints - currentLevel.minPoints
  const pointsNeeded = nextLevel.minPoints - currentLevel.minPoints
  const progress = Math.round((pointsInLevel / pointsNeeded) * 100)
  const pointsToNext = nextLevel.minPoints - totalPoints
  
  return { progress, pointsToNext, currentLevel, nextLevel }
}

// Adicionar pontos ao usuário
export async function addPoints(
  userId: string,
  points: number,
  action: string,
  reason: string,
  options?: {
    eventId?: string
    invitationId?: string
    description?: string
  }
) {
  // Criar histórico de pontos
  await db.pointHistory.create({
    data: {
      userId,
      points,
      action: action as any,
      reason,
      description: options?.description,
      eventId: options?.eventId,
      invitationId: options?.invitationId,
    },
  })

  // Atualizar total de pontos e nível do usuário
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { totalPoints: true },
  })

  if (!user) return null

  const newTotalPoints = user.totalPoints + points
  const newLevel = calculateLevel(newTotalPoints)

  const updatedUser = await db.user.update({
    where: { id: userId },
    data: {
      totalPoints: newTotalPoints,
      level: newLevel.level,
    },
  })

  return {
    totalPoints: newTotalPoints,
    level: newLevel,
    pointsAdded: points,
  }
}

// Atualizar streak do usuário
export async function updateStreak(userId: string, eventDate: Date) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { streak: true, lastEventDate: true },
  })

  if (!user) return null

  let newStreak = 1

  if (user.lastEventDate) {
    const lastDate = new Date(user.lastEventDate)
    const diffDays = Math.floor((eventDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays <= 7) {
      // Se o último evento foi há menos de 7 dias, continua o streak
      newStreak = user.streak + 1
    }
  }

  await db.user.update({
    where: { id: userId },
    data: {
      streak: newStreak,
      lastEventDate: eventDate,
    },
  })

  return newStreak
}

// Verificar e conceder conquistas
export async function checkAchievements(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      achievements: {
        include: { achievement: true },
      },
      invitations: {
        where: { status: 'CONFIRMED' },
        include: { event: true },
      },
    },
  })

  if (!user) return []

  const unlockedCodes = user.achievements.map(ua => ua.achievement.code)
  const newAchievements: any[] = []

  // Buscar todas as conquistas
  const allAchievements = await db.achievement.findMany()

  for (const achievement of allAchievements) {
    if (unlockedCodes.includes(achievement.code)) continue

    const [type, value] = achievement.requirement.split(':')
    let shouldUnlock = false

    switch (type) {
      case 'events_consecutive':
        shouldUnlock = user.streak >= parseInt(value)
        break
      case 'total_events':
        const confirmedEvents = user.invitations.filter(i => i.status === 'CONFIRMED').length
        shouldUnlock = confirmedEvents >= parseInt(value)
        break
      case 'instruments':
        if (user.profile?.instruments) {
          const instruments = JSON.parse(user.profile.instruments)
          shouldUnlock = instruments.length >= parseInt(value)
        }
        break
      case 'referrals':
        // TODO: implementar contagem de referrals
        break
      case 'last_minute_fills':
        // TODO: implementar contagem de substituições de última hora
        break
    }

    if (shouldUnlock) {
      // Conceder conquista
      await db.userAchievement.create({
        data: {
          userId,
          achievementId: achievement.id,
        },
      })

      // Adicionar pontos bônus
      if (achievement.bonusPoints > 0) {
        await addPoints(
          userId,
          achievement.bonusPoints,
          'ACHIEVEMENT_BONUS',
          `Conquista: ${achievement.name}`,
          { description: achievement.description }
        )
      }

      newAchievements.push(achievement)
    }
  }

  return newAchievements
}

// Inicializar conquistas padrão no banco
export async function seedAchievements() {
  for (const achievement of DEFAULT_ACHIEVEMENTS) {
    await db.achievement.upsert({
      where: { code: achievement.code },
      create: achievement,
      update: achievement,
    })
  }
}

// Buscar ranking da igreja
export async function getChurchRanking(churchId: string, limit: number = 10) {
  const users = await db.user.findMany({
    where: {
      churchId,
      role: { in: ['MUSICIAN', 'SINGER', 'INSTRUMENTALIST'] },
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      avatar: true,
      totalPoints: true,
      level: true,
      streak: true,
      profile: {
        select: {
          instruments: true,
        },
      },
    },
    orderBy: {
      totalPoints: 'desc',
    },
    take: limit,
  })

  return users.map((user, index) => ({
    ...user,
    position: index + 1,
    levelInfo: calculateLevel(user.totalPoints),
    instruments: user.profile?.instruments ? JSON.parse(user.profile.instruments) : [],
  }))
}
