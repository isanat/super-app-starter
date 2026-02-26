"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { 
  Calendar, CheckCircle, XCircle, Clock, AlertTriangle, Music, 
  LogOut, User, Bell, ChevronRight, CalendarDays,
  MapPin, Church, Edit, History, Star,
  Guitar, Mic, Clock3, Trophy, Flame, Sparkles,
  Home, CalendarCheck
} from "lucide-react"
import { GamificationCard } from "@/components/gamification/gamification-card"
import { QuickActionsFooter, FloatingActionButton } from "@/components/layout/quick-actions-footer"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, startOfWeek, endOfWeek } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

const EVENT_TYPES: Record<string, { name: string; icon: string; color: string }> = {
  SABBATH_SCHOOL: { name: "Escola Sabatina", icon: "📚", color: "bg-blue-500" },
  DIVINE_SERVICE: { name: "Culto Divino", icon: "⛪", color: "bg-emerald-500" },
  SABBATH_AFTERNOON: { name: "Sábado à Tarde", icon: "🌅", color: "bg-orange-500" },
  WEDNESDAY_SERVICE: { name: "Culto de Quarta", icon: "🕯️", color: "bg-purple-500" },
  SPECIAL_EVENT: { name: "Evento Especial", icon: "🎵", color: "bg-pink-500" },
  REHEARSAL: { name: "Ensaio", icon: "🎼", color: "bg-yellow-500" },
}

const WEEK_DAYS = [
  { id: "domingo", name: "Domingo", periods: ["manha", "tarde", "noite"] },
  { id: "segunda", name: "Segunda", periods: ["manha", "tarde", "noite"] },
  { id: "terca", name: "Terça", periods: ["manha", "tarde", "noite"] },
  { id: "quarta", name: "Quarta", periods: ["manha", "tarde", "noite"] },
  { id: "quinta", name: "Quinta", periods: ["manha", "tarde", "noite"] },
  { id: "sexta", name: "Sexta", periods: ["manha", "tarde", "noite"] },
  { id: "sabado", name: "Sábado", periods: ["manha", "tarde"] },
]

export function MusicianDashboard() {
  const { data: session } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  
  const [showDeclineDialog, setShowDeclineDialog] = useState(false)
  const [selectedInvitation, setSelectedInvitation] = useState<any>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [activeTab, setActiveTab] = useState("pending")

  // Fetch invitations
  const { data: invitationsData, isLoading } = useQuery({
    queryKey: ["invitations"],
    queryFn: async () => {
      const res = await fetch("/api/invitations")
      return res.json()
    },
  })

  // Fetch church data
  const { data: churchData } = useQuery({
    queryKey: ["church"],
    queryFn: async () => {
      const res = await fetch("/api/church")
      return res.json()
    },
  })

  // Fetch user profile
  const { data: profileData, refetch: refetchProfile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/users/me")
      return res.json()
    },
  })

  // Fetch notifications
  const { data: notificationsData, refetch: refetchNotifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications")
      return res.json()
    },
  })

  // Respond to invitation
  const respondMutation = useMutation({
    mutationFn: async (data: { invitationId: string; status: string; cancelReason?: string }) => {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "respond", ...data }),
      })
      return res.json()
    },
    onSuccess: (data) => {
      if (data.penaltyApplied) {
        toast.error(`Penalização de ${data.penaltyPoints} pontos aplicada pelo cancelamento.`)
      } else {
        toast.success("Resposta enviada com sucesso!")
      }
      setShowDeclineDialog(false)
      setSelectedInvitation(null)
      setCancelReason("")
      queryClient.invalidateQueries({ queryKey: ["invitations"] })
    },
    onError: () => {
      toast.error("Erro ao enviar resposta")
    },
  })

  // Update availability
  const updateAvailabilityMutation = useMutation({
    mutationFn: async (availability: any) => {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeklyAvailability: JSON.stringify(availability) }),
      })
      return res.json()
    },
    onSuccess: () => {
      toast.success("Disponibilidade atualizada!")
      refetchProfile()
    },
  })

  const invitations = invitationsData?.invitations || []
  const notifications = notificationsData?.notifications || []
  const unreadNotifications = notifications.filter((n: any) => !n.isRead)

  const pendingInvitations = invitations.filter((i: any) => i.status === "PENDING")
  const confirmedInvitations = invitations.filter((i: any) => i.status === "CONFIRMED")
  const pastInvitations = invitations.filter((i: any) => 
    i.status !== "PENDING" && new Date(i.event?.date) < new Date()
  )

  // Calendar helpers
  const calendarDays = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: startDate, end: endDate })
  }

  const getEventsForDay = (date: Date) => {
    return invitations.filter((i: any) => {
      const eventDate = new Date(i.event?.date)
      return isSameDay(eventDate, date) && i.status !== "DECLINED"
    })
  }

  // Availability
  const currentAvailability = profileData?.user?.weeklyAvailability 
    ? JSON.parse(profileData.user.weeklyAvailability) 
    : {}

  const handleAvailabilityChange = (day: string, period: string, value: boolean) => {
    const newAvailability = {
      ...currentAvailability,
      [day]: {
        ...currentAvailability[day],
        [period]: value
      }
    }
    updateAvailabilityMutation.mutate(newAvailability)
  }

  const handleRespond = (status: string) => {
    if (!selectedInvitation) return
    respondMutation.mutate({
      invitationId: selectedInvitation.id,
      status,
      cancelReason: status === "CANCELLED" ? cancelReason : undefined,
    })
  }

  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 pb-footer">
      {/* Header - Modern & Clean */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo & Church */}
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Music className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg gradient-text">Louvor Conectado</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Church className="h-3 w-3" />
                  {churchData?.church?.name || "Carregando..."}
                </p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Notifications */}
              <button 
                className="relative h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors press-effect"
                onClick={() => {}}
              >
                <Bell className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unreadNotifications.length}
                  </span>
                )}
              </button>
              
              {/* Profile */}
              <button 
                className="h-10 w-10 rounded-xl overflow-hidden ring-2 ring-emerald-500/20 hover:ring-emerald-500/40 transition-all press-effect"
                onClick={() => router.push("/perfil")}
              >
                <Avatar className="h-full w-full">
                  <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-semibold">
                    {session?.user?.name?.charAt(0) || "M"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Warning Banners */}
      {session?.user?.isBlocked && (
        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Conta Bloqueada</p>
              <p className="text-sm text-red-100">{session.user.penaltyPoints} pontos de penalização acumulados</p>
            </div>
          </div>
        </div>
      )}

      {!session?.user?.isBlocked && (session?.user?.penaltyPoints || 0) > 0 && (
        <div className="bg-gradient-to-r from-orange-400 to-orange-500 text-white px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Atenção: {session?.user?.penaltyPoints}/9 pontos</p>
              <p className="text-sm text-orange-100">Com 9 pontos você será bloqueado(a)</p>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-4">
        {/* Quick Stats - Horizontal Scroll */}
        <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2 -mx-4 px-4">
          <div className="flex-shrink-0 w-[140px] rounded-2xl bg-gradient-to-br from-orange-400 to-orange-500 p-4 text-white shadow-lg shadow-orange-500/20">
            <Clock className="h-6 w-6 opacity-80" />
            <p className="text-3xl font-bold mt-2 numeric-display">{pendingInvitations.length}</p>
            <p className="text-sm text-orange-100">Pendentes</p>
          </div>
          
          <div className="flex-shrink-0 w-[140px] rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-500 p-4 text-white shadow-lg shadow-emerald-500/20">
            <CheckCircle className="h-6 w-6 opacity-80" />
            <p className="text-3xl font-bold mt-2 numeric-display">{confirmedInvitations.length}</p>
            <p className="text-sm text-emerald-100">Confirmados</p>
          </div>
          
          <div className="flex-shrink-0 w-[140px] rounded-2xl bg-gradient-to-br from-purple-400 to-purple-500 p-4 text-white shadow-lg shadow-purple-500/20">
            <History className="h-6 w-6 opacity-80" />
            <p className="text-3xl font-bold mt-2 numeric-display">{pastInvitations.length}</p>
            <p className="text-sm text-purple-100">Participações</p>
          </div>
          
          <div className="flex-shrink-0 w-[140px] rounded-2xl bg-gradient-to-br from-slate-600 to-slate-700 p-4 text-white shadow-lg shadow-slate-500/20">
            <Trophy className="h-6 w-6 opacity-80" />
            <p className="text-3xl font-bold mt-2 numeric-display">{session?.user?.penaltyPoints || 0}</p>
            <p className="text-sm text-slate-300">Penalizações</p>
          </div>
        </div>

        {/* Pending Invitations - Quick Actions */}
        {pendingInvitations.length > 0 && (
          <div className="mt-6">
            <h2 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Convites Aguardando Resposta
            </h2>
            <div className="space-y-3">
              {pendingInvitations.slice(0, 3).map((inv: any) => (
                <div 
                  key={inv.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-card border border-slate-100 dark:border-slate-700 press-effect"
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-14 w-14 rounded-xl ${EVENT_TYPES[inv.event?.type]?.color || "bg-slate-500"} flex items-center justify-center text-2xl shadow-lg`}>
                      {EVENT_TYPES[inv.event?.type]?.icon || "📅"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white">{inv.event?.title}</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {inv.event?.date && format(new Date(inv.event.date), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <Badge variant="secondary" className="animate-pulse bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                          Novo
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                        <MapPin className="h-3 w-3" />
                        <span>{inv.event?.location || churchData?.church?.name}</span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button 
                          className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-500/20"
                          onClick={() => { setSelectedInvitation(inv); handleRespond("CONFIRMED"); }}
                          disabled={respondMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Confirmar
                        </Button>
                        <Button 
                          variant="outline"
                          className="flex-1 rounded-xl border-slate-200 dark:border-slate-700"
                          onClick={() => { setSelectedInvitation(inv); setShowDeclineDialog(true); }}
                          disabled={respondMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Recusar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-4 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
              Pendentes
              {pendingInvitations.length > 0 && (
                <Badge className="ml-1 h-5 w-5 rounded-full bg-orange-500 text-white text-xs p-0 flex items-center justify-center">
                  {pendingInvitations.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="confirmed" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
              Confirmados
            </TabsTrigger>
            <TabsTrigger value="calendar" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
              Calendário
            </TabsTrigger>
            <TabsTrigger value="availability" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
              Disponível
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {pendingInvitations.length === 0 ? (
              <div className="content-placeholder">
                <div className="h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <CalendarDays className="h-10 w-10 text-slate-400" />
                </div>
                <p className="font-medium text-slate-600 dark:text-slate-300">Nenhum convite pendente</p>
                <p className="text-sm text-slate-400 dark:text-slate-500">Novos convites aparecerão aqui</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingInvitations.map((inv: any) => (
                  <div key={inv.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-card border border-slate-100 dark:border-slate-700">
                    <div className="flex items-start gap-3">
                      <div className={`h-14 w-14 rounded-xl ${EVENT_TYPES[inv.event?.type]?.color || "bg-slate-500"} flex items-center justify-center text-2xl`}>
                        {EVENT_TYPES[inv.event?.type]?.icon || "📅"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{inv.event?.title}</h3>
                        <p className="text-sm text-slate-500">
                          {inv.event?.date && format(new Date(inv.event.date), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        </p>
                        {inv.isGuest && inv.guestFromChurchId && (
                          <div className="mt-1">
                            <Badge className="bg-amber-500 text-white text-xs">Convidado de {inv.User?.Church_User_churchIdToChurch?.name || 'outra igreja'}</Badge>
                          </div>
                        )}
                        {inv.event?.location && (
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" /> {inv.event.location}
                          </p>
                        )}
                        <div className="flex gap-2 mt-3">
                          <Button 
                            className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600"
                            onClick={() => { setSelectedInvitation(inv); handleRespond("CONFIRMED"); }}
                            disabled={respondMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" /> Confirmar
                          </Button>
                          <Button 
                            variant="outline"
                            className="flex-1"
                            onClick={() => { setSelectedInvitation(inv); setShowDeclineDialog(true); }}
                            disabled={respondMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-2" /> Recusar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="confirmed" className="mt-4">
            {confirmedInvitations.length === 0 ? (
              <div className="content-placeholder">
                <div className="h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <CheckCircle className="h-10 w-10 text-slate-400" />
                </div>
                <p className="font-medium text-slate-600 dark:text-slate-300">Nenhum evento confirmado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {confirmedInvitations.map((inv: any) => (
                  <div key={inv.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-card border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-12 w-12 rounded-xl ${EVENT_TYPES[inv.event?.type]?.color || "bg-slate-500"} flex items-center justify-center text-xl`}>
                          {EVENT_TYPES[inv.event?.type]?.icon || "📅"}
                        </div>
                        <div>
                          <h3 className="font-semibold">{inv.event?.title}</h3>
                          <p className="text-sm text-slate-500">
                            {inv.event?.date && format(new Date(inv.event.date), "dd/MM 'às' HH:mm")}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                        <CheckCircle className="h-3 w-3 mr-1" /> Confirmado
                      </Badge>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={() => { setSelectedInvitation(inv); setShowDeclineDialog(true); }}
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" /> Cancelar Participação
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="calendar" className="mt-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-card border border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
                  <ChevronRight className="h-4 w-4 rotate-180" />
                </Button>
                <h3 className="font-semibold">{format(currentMonth, "MMMM yyyy", { locale: ptBR })}</h3>
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((day, i) => (
                  <div key={i} className="text-center text-xs font-medium text-slate-400 py-2">{day}</div>
                ))}
                {calendarDays().map((day, i) => {
                  const dayEvents = getEventsForDay(day)
                  const isCurrentMonth = day >= startOfMonth(currentMonth) && day <= endOfMonth(currentMonth)
                  
                  return (
                    <div 
                      key={i}
                      className={cn(
                        "min-h-[60px] p-1 rounded-lg transition-colors",
                        !isCurrentMonth && "opacity-30",
                        isToday(day) && "bg-emerald-50 dark:bg-emerald-950 ring-2 ring-emerald-500"
                      )}
                    >
                      <div className={cn("text-sm font-medium", isToday(day) && "text-emerald-600")}>
                        {format(day, "d")}
                      </div>
                      <div className="mt-0.5 space-y-0.5">
                        {dayEvents.slice(0, 2).map((inv: any) => (
                          <div key={inv.id} className={cn("text-[9px] px-1 py-0.5 rounded text-white truncate", EVENT_TYPES[inv.event?.type]?.color || "bg-slate-500")}>
                            {inv.event?.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="availability" className="mt-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                <h3 className="font-semibold flex items-center gap-2">
                  <Clock3 className="h-5 w-5 text-emerald-500" />
                  Minha Disponibilidade
                </h3>
                <p className="text-sm text-slate-500 mt-1">Configure quando você está disponível</p>
              </div>
              <div className="p-4">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-700">
                        <th className="text-left p-2 text-sm font-medium text-slate-500">Dia</th>
                        <th className="text-center p-2 text-sm font-medium text-slate-500">Manhã</th>
                        <th className="text-center p-2 text-sm font-medium text-slate-500">Tarde</th>
                        <th className="text-center p-2 text-sm font-medium text-slate-500">Noite</th>
                      </tr>
                    </thead>
                    <tbody>
                      {WEEK_DAYS.map((day) => (
                        <tr key={day.id} className="border-b border-slate-100 dark:border-slate-700 last:border-0">
                          <td className="p-2 font-medium text-sm">{day.name}</td>
                          {day.periods.map((period) => (
                            <td key={period} className="p-2 text-center">
                              <Switch
                                checked={currentAvailability[day.id]?.[period] || false}
                                onCheckedChange={(checked) => handleAvailabilityChange(day.id, period, checked)}
                                className="data-[state=checked]:bg-emerald-500"
                              />
                            </td>
                          ))}
                          {day.periods.length === 2 && <td className="p-2 text-center text-slate-300">—</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl">
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    O sistema usará sua disponibilidade para sugerir você para eventos compatíveis.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Gamification Card */}
        <div className="mt-6">
          <GamificationCard />
        </div>
      </main>

      {/* Quick Actions Footer */}
      <QuickActionsFooter
        userType="musician"
        pendingCount={pendingInvitations.length}
        notificationCount={unreadNotifications.length}
      />

      {/* Decline Dialog */}
      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Recusar Convite
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja recusar este convite? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {selectedInvitation && (
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                <p className="font-medium">{selectedInvitation.event?.title}</p>
                <p className="text-sm text-slate-500">
                  {selectedInvitation.event?.date && format(new Date(selectedInvitation.event.date), "dd/MM/yyyy 'às' HH:mm")}
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowDeclineDialog(false)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1 rounded-xl"
                onClick={() => handleRespond("DECLINED")}
                disabled={respondMutation.isPending}
              >
                {respondMutation.isPending ? "Enviando..." : "Recusar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
