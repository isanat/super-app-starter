'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Trophy, Flame, Clock } from 'lucide-react'

const LEVELS = [
  { level: 1, name: 'Novo no Ministério', minPoints: 0, icon: '🌱' },
  { level: 2, name: 'Músico Ativo', minPoints: 51, icon: '🎵' },
  { level: 3, name: 'Ministrante', minPoints: 151, icon: '🎤' },
  { level: 4, name: 'Músico Destaque', minPoints: 301, icon: '🎸' },
  { level: 5, name: 'Líder de Louvor', minPoints: 501, icon: '⭐' },
  { level: 6, name: 'Referência Musical', minPoints: 801, icon: '👑' },
]

interface GamificationCardProps {
  userId?: string
}

export function GamificationCard({ userId }: GamificationCardProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['gamification', userId],
    queryFn: async () => {
      const res = await fetch('/api/gamification')
      if (!res.ok) {
        // Se não autorizado, retornar dados padrão
        if (res.status === 401) {
          return null
        }
        throw new Error('Erro ao carregar gamificação')
      }
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded-lg" />
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Se não há dados (não logado ou erro), mostrar estado inicial
  if (!data) {
    return (
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm">Nível Atual</p>
              <div className="flex items-center gap-2">
                <span className="text-3xl">🌱</span>
                <div>
                  <h3 className="font-bold text-xl">Novo no Ministério</h3>
                  <p className="text-emerald-100 text-sm">0 pontos</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <CardContent className="pt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Próximo: 🎵 Músico Ativo
              </span>
              <span className="font-medium">51 pts</span>
            </div>
            <Progress value={0} className="h-2" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const { user, progress, achievements, recentPoints, totalAchievements } = data

  return (
    <div className="space-y-4">
      {/* Card Principal - Nível e Progresso */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm">Nível Atual</p>
              <div className="flex items-center gap-2">
                <span className="text-3xl">{progress.currentLevel?.icon}</span>
                <div>
                  <h3 className="font-bold text-xl">{progress.currentLevel?.name}</h3>
                  <p className="text-emerald-100 text-sm">{user.totalPoints} pontos</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <Flame className="h-5 w-5 text-orange-300" />
                <span className="font-bold">{user.streak}</span>
              </div>
              <p className="text-xs text-emerald-100">sequência</p>
            </div>
          </div>
        </div>
        
        <CardContent className="pt-4">
          {progress.nextLevel && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Próximo: {progress.nextLevel.icon} {progress.nextLevel.name}
                </span>
                <span className="font-medium">{progress.pointsToNext} pts</span>
              </div>
              <Progress value={progress.progress} className="h-2" />
            </div>
          )}
          
          {!progress.nextLevel && (
            <div className="text-center py-2">
              <span className="text-emerald-600 font-medium">
                🎉 Nível máximo alcançado!
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conquistas Recentes */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Conquistas
            </CardTitle>
            <Badge variant="secondary">{totalAchievements}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {achievements.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Participe de eventos para desbloquear conquistas!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {achievements.slice(0, 3).map((achievement: any) => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                >
                  <span className="text-2xl">{achievement.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{achievement.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {achievement.description}
                    </p>
                  </div>
                </div>
              ))}
              {achievements.length > 3 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{achievements.length - 3} conquistas
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Pontos */}
      {recentPoints && recentPoints.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentPoints.slice(0, 5).map((point: any) => (
                <div
                  key={point.id}
                  className="flex items-center justify-between py-1"
                >
                  <span className="text-sm text-muted-foreground">
                    {point.reason}
                  </span>
                  <span className={`font-medium text-sm ${point.points > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {point.points > 0 ? '+' : ''}{point.points} pts
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Componente de Ranking para o dashboard do diretor
export function RankingCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['gamification', 'ranking'],
    queryFn: async () => {
      const res = await fetch('/api/gamification?action=ranking')
      if (!res.ok) {
        if (res.status === 401) {
          return { ranking: [] }
        }
        throw new Error('Erro ao carregar ranking')
      }
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Ranking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data?.ranking || data.ranking.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Músicos Mais Ativos
          </CardTitle>
          <CardDescription>
            Ranking baseado em participação e pontos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum músico com pontos ainda</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Músicos Mais Ativos
        </CardTitle>
        <CardDescription>
          Ranking baseado em participação e pontos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.ranking.map((musician: any) => (
            <div
              key={musician.id}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                musician.position <= 3 ? 'bg-yellow-50 dark:bg-yellow-950/30' : 'hover:bg-muted'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm ${
                musician.position === 1 ? 'bg-yellow-400 text-yellow-900' :
                musician.position === 2 ? 'bg-gray-300 text-gray-700' :
                musician.position === 3 ? 'bg-amber-600 text-amber-100' :
                'bg-muted text-muted-foreground'
              }`}>
                {musician.position}
              </div>
              <Avatar className="h-8 w-8">
                <AvatarImage src={musician.avatar} />
                <AvatarFallback className="text-xs">
                  {musician.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{musician.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {musician.levelInfo?.icon} {musician.levelInfo?.name}
                  </span>
                  {musician.streak > 0 && (
                    <span className="text-xs text-orange-500 flex items-center gap-0.5">
                      <Flame className="h-3 w-3" /> {musician.streak}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm">{musician.totalPoints}</p>
                <p className="text-xs text-muted-foreground">pts</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
