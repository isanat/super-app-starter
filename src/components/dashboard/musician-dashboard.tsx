"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Calendar, CheckCircle, XCircle, Clock, AlertTriangle, Music, 
  Settings, LogOut, User, Phone, Bell, ChevronRight, CalendarDays
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"
import { signOut } from "next-auth/react"

const EVENT_TYPES: Record<string, { name: string; icon: string }> = {
  SABBATH_SCHOOL: { name: "Escola Sabatina", icon: "📚" },
  DIVINE_SERVICE: { name: "Culto Divino", icon: "⛪" },
  SABBATH_AFTERNOON: { name: "Sábado à Tarde", icon: "🌅" },
  WEDNESDAY_SERVICE: { name: "Culto de Quarta", icon: "🕯️" },
  SPECIAL_EVENT: { name: "Evento Especial", icon: "🎵" },
  REHEARSAL: { name: "Ensaio", icon: "🎼" },
}

export function MusicianDashboard() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [showRespondDialog, setShowRespondDialog] = useState(false)
  const [selectedInvitation, setSelectedInvitation] = useState<any>(null)
  const [cancelReason, setCancelReason] = useState("")

  // Buscar convites
  const { data: invitationsData, isLoading } = useQuery({
    queryKey: ["invitations"],
    queryFn: async () => {
      const res = await fetch("/api/invitations")
      return res.json()
    },
  })

  // Buscar notificações
  const { data: notificationsData } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications")
      return res.json()
    },
  })

  // Responder convite
  const respondMutation = useMutation({
    mutationFn: async (data: { invitationId: string; status: string; cancelReason?: string }) => {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "respond",
          ...data,
        }),
      })
      return res.json()
    },
    onSuccess: (data) => {
      if (data.penaltyApplied) {
        toast.error(`Penalização de ${data.penaltyPoints} pontos aplicada pelo cancelamento.`)
      } else {
        toast.success("Resposta enviada com sucesso!")
      }
      setShowRespondDialog(false)
      setSelectedInvitation(null)
      setCancelReason("")
      queryClient.invalidateQueries({ queryKey: ["invitations"] })
    },
    onError: () => {
      toast.error("Erro ao enviar resposta")
    },
  })

  const invitations = invitationsData?.invitations || []

  const pendingInvitations = invitations.filter((i: any) => i.status === "PENDING")
  const confirmedInvitations = invitations.filter((i: any) => i.status === "CONFIRMED")
  const pastInvitations = invitations.filter((i: any) => 
    i.status !== "PENDING" && new Date(i.event?.date) < new Date()
  )

  const handleRespond = (status: string) => {
    if (!selectedInvitation) return

    respondMutation.mutate({
      invitationId: selectedInvitation.id,
      status,
      cancelReason: status === "CANCELLED" ? cancelReason : undefined,
    })
  }

  const handleOpenRespond = (invitation: any) => {
    setSelectedInvitation(invitation)
    setShowRespondDialog(true)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Music className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Louvor Conectado</h1>
              <p className="text-xs text-muted-foreground">
                {session?.user?.name} • {session?.user?.role === "SINGER" ? "Cantor(a)" : "Instrumentalista"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {notificationsData?.notifications?.filter((n: any) => !n.isRead).length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                  {notificationsData?.notifications?.filter((n: any) => !n.isRead).length}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => signOut()}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Alert for blocked users */}
      {session?.user?.isBlocked && (
        <div className="bg-red-500 text-white p-4">
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <span>
              Você está bloqueado(a) para participar de eventos devido a múltiplos cancelamentos.
              {session.user.penaltyPoints} pontos de penalização acumulados.
            </span>
          </div>
        </div>
      )}

      {/* Penalty warning */}
      {!session?.user?.isBlocked && session?.user?.penaltyPoints > 0 && (
        <div className="bg-orange-100 dark:bg-orange-950 p-4">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-orange-700 dark:text-orange-300">
            <AlertTriangle className="h-5 w-5" />
            <span>
              Atenção: Você tem {session.user.penaltyPoints} pontos de penalização.
              Com 9 pontos você será bloqueado(a).
            </span>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Convites Pendentes</p>
                  <p className="text-2xl font-bold">{pendingInvitations.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Eventos Confirmados</p>
                  <p className="text-2xl font-bold">{confirmedInvitations.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pontos de Penalização</p>
                  <p className="text-2xl font-bold">{session?.user?.penaltyPoints || 0}/9</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">
              Pendentes ({pendingInvitations.length})
            </TabsTrigger>
            <TabsTrigger value="confirmed">
              Confirmados ({confirmedInvitations.length})
            </TabsTrigger>
            <TabsTrigger value="availability">
              Disponibilidade
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {pendingInvitations.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <CalendarDays className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum convite pendente</p>
                    <p className="text-sm">Novos convites aparecerão aqui</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {pendingInvitations.map((inv: any) => (
                  <Card key={inv.id} className="overflow-hidden">
                    <div className="bg-emerald-600 h-1" />
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <span>{EVENT_TYPES[inv.event?.type]?.icon || "📅"}</span>
                            {inv.event?.title}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {inv.event?.church?.name}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary" className="animate-pulse">
                          Novo
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {inv.event?.date && format(new Date(inv.event.date), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>
                            Função: {inv.role === "SINGER" ? "Cantor(a)" : "Instrumentalista"}
                            {inv.instrument && ` - ${inv.instrument}`}
                            {inv.vocalPart && ` - ${inv.vocalPart}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => {
                            setSelectedInvitation(inv)
                            handleRespond("CONFIRMED")
                          }}
                          disabled={respondMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Confirmar
                        </Button>
                        <Button 
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setSelectedInvitation(inv)
                            handleRespond("DECLINED")
                          }}
                          disabled={respondMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Recusar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="confirmed">
            {confirmedInvitations.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum evento confirmado</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {confirmedInvitations.map((inv: any) => (
                  <Card key={inv.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <span>{EVENT_TYPES[inv.event?.type]?.icon || "📅"}</span>
                            {inv.event?.title}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {inv.event?.church?.name}
                          </CardDescription>
                        </div>
                        <Badge className="bg-emerald-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Confirmado
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {inv.event?.date && format(new Date(inv.event.date), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </div>

                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleOpenRespond(inv)}
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Cancelar Participação
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="availability">
            <Card>
              <CardHeader>
                <CardTitle>Minha Disponibilidade Semanal</CardTitle>
                <CardDescription>
                  Configure quando você está disponível para participar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-3">Sábado Manhã</h4>
                      <p className="text-sm text-muted-foreground mb-2">8:00 - 12:00</p>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-emerald-500" />
                        <span className="text-sm">Disponível</span>
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-3">Sábado Tarde</h4>
                      <p className="text-sm text-muted-foreground mb-2">14:00 - 18:00</p>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-emerald-500" />
                        <span className="text-sm">Disponível</span>
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-3">Sábado Noite</h4>
                      <p className="text-sm text-muted-foreground mb-2">18:00 - 21:00</p>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-red-500" />
                        <span className="text-sm">Indisponível</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      💡 O sistema usará sua disponibilidade para sugerir você automaticamente para eventos.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Cancel dialog */}
      <Dialog open={showRespondDialog} onOpenChange={setShowRespondDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Participação</DialogTitle>
            <DialogDescription>
              Atenção: Cancelar após confirmação resultará em penalização de 3 pontos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="bg-orange-100 dark:bg-orange-950 p-4 rounded-lg">
              <div className="flex items-start gap-2 text-orange-700 dark:text-orange-300">
                <AlertTriangle className="h-5 w-5 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Você receberá 3 pontos de penalização.</p>
                  <p className="mt-1">Com 9 pontos você será bloqueado por 30 dias.</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Motivo do cancelamento</Label>
              <Textarea
                placeholder="Explique o motivo do cancelamento..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowRespondDialog(false)}
              >
                Voltar
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => handleRespond("CANCELLED")}
                disabled={respondMutation.isPending}
              >
                {respondMutation.isPending ? "Cancelando..." : "Confirmar Cancelamento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
