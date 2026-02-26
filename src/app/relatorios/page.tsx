"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  TrendingUp, Users, Calendar, Music, CheckCircle, XCircle, 
  Clock, AlertTriangle, Star, Award, Target
} from "lucide-react"
import { AppLayout } from "@/components/layout/app-layout"
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns"
import { ptBR } from "date-fns/locale"

export default function RelatoriosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
    if (session?.user && session.user.role !== "DIRECTOR" && session.user.role !== "ADMIN") {
      router.push("/")
    }
  }, [status, session, router])

  // Buscar dados
  const { data: eventsData, isLoading: isLoadingEvents } = useQuery({
    queryKey: ["reports-events"],
    queryFn: async () => {
      const res = await fetch("/api/events")
      return res.json()
    },
  })

  const { data: musiciansData, isLoading: isLoadingMusicians } = useQuery({
    queryKey: ["reports-musicians"],
    queryFn: async () => {
      const res = await fetch("/api/users?role=MUSICIAN")
      return res.json()
    },
  })

  if (status === "loading" || isLoadingEvents || isLoadingMusicians) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      </AppLayout>
    )
  }

  const events = eventsData?.events || []
  const musicians = musiciansData?.users || []

  // Cálculos
  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const thisMonthEnd = endOfMonth(now)
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))

  const thisMonthEvents = events.filter((e: any) => {
    const date = new Date(e.date)
    return date >= thisMonthStart && date <= thisMonthEnd
  })

  const lastMonthEvents = events.filter((e: any) => {
    const date = new Date(e.date)
    return date >= lastMonthStart && date <= lastMonthEnd
  })

  const confirmedThisMonth = thisMonthEvents.filter((e: any) => e.status === "CONFIRMED" || e.status === "COMPLETED").length
  const confirmedLastMonth = lastMonthEvents.filter((e: any) => e.status === "CONFIRMED" || e.status === "COMPLETED").length

  // Músicos por status
  const activeMusicians = musicians.filter((m: any) => m.isActive && !m.isBlocked).length
  const blockedMusicians = musicians.filter((m: any) => m.isBlocked).length
  const totalMusicians = musicians.length

  // Taxa de confirmação
  const totalInvitations = events.reduce((acc: number, e: any) => acc + (e.EventInvitation?.length || 0), 0)
  const confirmedInvitations = events.reduce((acc: number, e: any) => {
    return acc + (e.EventInvitation?.filter((i: any) => i.status === "CONFIRMED").length || 0)
  }, 0)
  const confirmationRate = totalInvitations > 0 ? Math.round((confirmedInvitations / totalInvitations) * 100) : 0

  // Músicos com mais pontos de compromisso (ex-penalidades)
  const topReliable = [...musicians]
    .filter((m: any) => m.penaltyPoints < 9)
    .sort((a: any, b: any) => a.penaltyPoints - b.penaltyPoints)
    .slice(0, 5)

  // Músicos com mais eventos
  const topPerformers = [...musicians]
    .sort((a: any, b: any) => (b.totalPoints || 0) - (a.totalPoints || 0))
    .slice(0, 5)

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Relatórios e Analytics</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Visão geral do ministério de louvor
          </p>
        </div>

        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Eventos Este Mês</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{thisMonthEvents.length}</div>
              <p className="text-xs text-muted-foreground">
                {lastMonthEvents.length > 0 && (
                  <>
                    {thisMonthEvents.length > lastMonthEvents.length ? "+" : ""}
                    {thisMonthEvents.length - lastMonthEvents.length} vs mês anterior
                  </>
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Músicos Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeMusicians}</div>
              <Progress 
                value={totalMusicians > 0 ? (activeMusicians / totalMusicians) * 100 : 0} 
                className="h-2 mt-2" 
              />
              <p className="text-xs text-muted-foreground mt-1">
                de {totalMusicians} cadastrados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Confirmação</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{confirmationRate}%</div>
              <Progress value={confirmationRate} className="h-2 mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {confirmedInvitations} de {totalInvitations} convites
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pontos de Compromisso</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{blockedMusicians}</div>
              <p className="text-xs text-muted-foreground">
                músicos em pausa voluntária
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs de Detalhes */}
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="musicians">Músicos</TabsTrigger>
            <TabsTrigger value="events">Eventos</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Top Performers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-amber-500" />
                    Destaques do Mês
                  </CardTitle>
                  <CardDescription>Músicos com mais pontos de participação</CardDescription>
                </CardHeader>
                <CardContent>
                  {topPerformers.length > 0 ? (
                    <div className="space-y-3">
                      {topPerformers.map((m: any, index: number) => (
                        <div key={m.id} className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? "bg-amber-100 text-amber-700" :
                            index === 1 ? "bg-slate-200 text-slate-700" :
                            index === 2 ? "bg-orange-100 text-orange-700" :
                            "bg-slate-100 text-slate-600"
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{m.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {m.totalPoints || 0} pontos
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      Nenhum dado disponível
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Mais Confiáveis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-emerald-500" />
                    Maior Confiabilidade
                  </CardTitle>
                  <CardDescription>Menor índice de cancelamentos</CardDescription>
                </CardHeader>
                <CardContent>
                  {topReliable.length > 0 ? (
                    <div className="space-y-3">
                      {topReliable.map((m: any) => (
                        <div key={m.id} className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{m.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {m.penaltyPoints === 0 ? "Perfeito!" : `${m.penaltyPoints} pontos`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      Nenhum dado disponível
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="musicians" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Resumo de Músicos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
                      <p className="text-2xl font-bold text-emerald-700">{activeMusicians}</p>
                      <p className="text-sm text-emerald-600">Ativos</p>
                    </div>
                    <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
                      <p className="text-2xl font-bold text-amber-700">
                        {musicians.filter((m: any) => m.penaltyPoints > 0 && m.penaltyPoints < 9).length}
                      </p>
                      <p className="text-sm text-amber-600">Com observações</p>
                    </div>
                    <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                      <p className="text-2xl font-bold text-red-700">{blockedMusicians}</p>
                      <p className="text-sm text-red-600">Em pausa</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Resumo de Eventos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-center">
                      <p className="text-2xl font-bold">{events.length}</p>
                      <p className="text-sm text-muted-foreground">Total</p>
                    </div>
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950 rounded-lg text-center">
                      <p className="text-2xl font-bold text-emerald-700">{confirmedThisMonth}</p>
                      <p className="text-sm text-emerald-600">Confirmados</p>
                    </div>
                    <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg text-center">
                      <p className="text-2xl font-bold text-amber-700">
                        {events.filter((e: any) => e.status === "DRAFT").length}
                      </p>
                      <p className="text-sm text-amber-600">Rascunhos</p>
                    </div>
                    <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg text-center">
                      <p className="text-2xl font-bold text-red-700">
                        {events.filter((e: any) => e.status === "CANCELLED").length}
                      </p>
                      <p className="text-sm text-red-600">Cancelados</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
