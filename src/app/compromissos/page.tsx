"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  History, TrendingUp, TrendingDown, Calendar, Clock, AlertCircle,
  CheckCircle, XCircle, Info
} from "lucide-react"
import { AppLayout } from "@/components/layout/app-layout"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export default function CompromissosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  // Buscar histórico de compromissos
  const { data: historyData, isLoading } = useQuery({
    queryKey: ["commitment-history"],
    queryFn: async () => {
      const res = await fetch("/api/users/commitment-history")
      return res.json()
    },
  })

  // Buscar convites para histórico de participação
  const { data: invitationsData } = useQuery({
    queryKey: ["invitations-history"],
    queryFn: async () => {
      const res = await fetch("/api/invitations")
      return res.json()
    },
  })

  if (status === "loading" || isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      </AppLayout>
    )
  }

  const history = historyData?.history || []
  const invitations = invitationsData?.invitations || []

  // Separar por tipo
  const confirmations = invitations.filter((i: any) => i.status === "CONFIRMED")
  const cancellations = invitations.filter((i: any) => i.status === "CANCELLED")
  const pending = invitations.filter((i: any) => i.status === "PENDING")

  // Calcular taxa de comparecimento
  const total = invitations.length
  const attended = confirmations.length
  const attendanceRate = total > 0 ? Math.round((attended / total) * 100) : 0

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            📊 Índice de Compromisso
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Acompanhe seu histórico de participação e comprometimento
          </p>
        </div>

        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                Taxa de Comparecimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">{attendanceRate}%</div>
              <p className="text-sm text-muted-foreground">
                {attended} de {total} eventos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                Participações Confirmadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{confirmations.length}</div>
              <p className="text-sm text-muted-foreground">
                eventos participados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                Cancelamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{cancellations.length}</div>
              <p className="text-sm text-muted-foreground">
                eventos cancelados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Explicação do Sistema */}
        <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-emerald-800 dark:text-emerald-200">
                  Como funciona o Índice de Compromisso?
                </h3>
                <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                  Este sistema foi criado para valorizar sua participação! Cada confirmação soma pontos, 
                  e cancelamentos após confirmação geram "pontos de atenção" (até 9 pontos). 
                  Se atingir 9 pontos, você entrará em um período de reflexão de 30 dias. 
                  É uma forma de incentivar o comprometimento, não uma punição! 💚
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs de Histórico */}
        <Tabs defaultValue="participation">
          <TabsList>
            <TabsTrigger value="participation">Participações</TabsTrigger>
            <TabsTrigger value="attention">Pontos de Atenção</TabsTrigger>
          </TabsList>

          <TabsContent value="participation" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Histórico de Participações
                </CardTitle>
                <CardDescription>
                  Todos os eventos em que você participou
                </CardDescription>
              </CardHeader>
              <CardContent>
                {confirmations.length > 0 ? (
                  <div className="space-y-3">
                    {confirmations.map((inv: any) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                            <CheckCircle className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-medium">{inv.event?.title || "Evento"}</p>
                            <p className="text-sm text-muted-foreground">
                              {inv.event?.date && format(new Date(inv.event.date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-800">
                          Presente ✓
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma participação registrada ainda</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attention" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Pontos de Atenção
                </CardTitle>
                <CardDescription>
                  Cancelamentos após confirmação geram pontos para reflexão
                </CardDescription>
              </CardHeader>
              <CardContent>
                {history.length > 0 ? (
                  <div className="space-y-3">
                    {history.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                            <AlertCircle className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="font-medium">{item.reason}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.description || "Cancelamento registrado"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(item.createdAt), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-amber-100 text-amber-800">
                          +{item.points} pontos
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Parabéns! Nenhum ponto de atenção registrado 🎉</p>
                    <p className="text-sm mt-1">Continue mantendo seu comprometimento!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Seus Pontos Atuais */}
        <Card>
          <CardHeader>
            <CardTitle>Seu Índice Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-2">
                  <span>Pontos de atenção</span>
                  <span className="font-medium">
                    {session?.user?.penaltyPoints || 0} / 9
                  </span>
                </div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      (session?.user?.penaltyPoints || 0) >= 6 
                        ? "bg-red-500" 
                        : (session?.user?.penaltyPoints || 0) >= 3 
                          ? "bg-amber-500" 
                          : "bg-emerald-500"
                    }`}
                    style={{ width: `${((session?.user?.penaltyPoints || 0) / 9) * 100}%` }}
                  />
                </div>
              </div>
              <div className="text-center">
                <div className={`text-3xl font-bold ${
                  (session?.user?.penaltyPoints || 0) >= 6 
                    ? "text-red-600" 
                    : (session?.user?.penaltyPoints || 0) >= 3 
                      ? "text-amber-600" 
                      : "text-emerald-600"
                }`}>
                  {session?.user?.penaltyPoints || 0}
                </div>
                <p className="text-xs text-muted-foreground">pontos</p>
              </div>
            </div>
            
            {(session?.user?.penaltyPoints || 0) === 0 && (
              <p className="text-sm text-emerald-600 mt-4 text-center">
                🌟 Excelente! Você está com índice perfeito!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
