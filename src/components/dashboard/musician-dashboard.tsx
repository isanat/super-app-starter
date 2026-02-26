"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { 
  Calendar, CheckCircle, XCircle, Clock, AlertTriangle, Music, 
  Bell, ChevronRight, ChevronLeft,
  MapPin, Church, History, Trophy,
  Clock3, Sparkles, Settings, User
} from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, startOfWeek, endOfWeek, addMonths, subMonths } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { QuickActionsFooter } from "@/components/layout/quick-actions-footer"
import { GamificationCard } from "@/components/gamification/gamification-card"

const EVENT_TYPES: Record<string, { name: string; icon: string; color: string; bg: string }> = {
  SABBATH_SCHOOL: { name: "Escola Sabatina", icon: "📚", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
  DIVINE_SERVICE: { name: "Culto Divino", icon: "⛪", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950" },
  SABBATH_AFTERNOON: { name: "Sábado à Tarde", icon: "🌅", color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950" },
  WEDNESDAY_SERVICE: { name: "Culto de Quarta", icon: "🕯️", color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950" },
  SPECIAL_EVENT: { name: "Evento Especial", icon: "🎵", color: "text-pink-600", bg: "bg-pink-50 dark:bg-pink-950" },
  REHEARSAL: { name: "Ensaio", icon: "🎼", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950" },
}

const WEEK_DAYS = [
  { id: "domingo", name: "Dom", periods: ["manha", "tarde", "noite"] },
  { id: "segunda", name: "Seg", periods: ["manha", "tarde", "noite"] },
  { id: "terca", name: "Ter", periods: ["manha", "tarde", "noite"] },
  { id: "quarta", name: "Qua", periods: ["manha", "tarde", "noite"] },
  { id: "quinta", name: "Qui", periods: ["manha", "tarde", "noite"] },
  { id: "sexta", name: "Sex", periods: ["manha", "tarde", "noite"] },
  { id: "sabado", name: "Sáb", periods: ["manha", "tarde"] },
]

export function MusicianDashboard() {
  const { data: session } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  
  const [showDeclineDialog, setShowDeclineDialog] = useState(false)
  const [selectedInvitation, setSelectedInvitation] = useState<any>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [activeView, setActiveView] = useState<"pending" | "confirmed" | "calendar" | "availability">("pending")

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
  const { data: notificationsData } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications")
      return res.json()
    },
  })

  // Respond to invitation
  const respondMutation = useMutation({
    mutationFn: async (data: { invitationId: string; status: string }) => {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "respond", ...data }),
      })
      return res.json()
    },
    onSuccess: (data) => {
      if (data.penaltyApplied) {
        toast.error(`Ponto de atenção registrado`)
      } else {
        toast.success("Resposta enviada!")
      }
      setShowDeclineDialog(false)
      setSelectedInvitation(null)
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
    })
  }

  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
      {/* Compact Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center">
                <Music className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-sm">Louvor Conectado</h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Church className="h-3 w-3" />
                  {churchData?.church?.name || "Carregando..."}
                </p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-1">
              <button 
                className="relative h-9 w-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                onClick={() => router.push("/notificacoes")}
              >
                <Bell className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadNotifications.length}
                  </span>
                )}
              </button>
              
              <button 
                className="h-9 w-9 rounded-lg overflow-hidden hover:ring-2 hover:ring-emerald-500/30 transition-all"
                onClick={() => router.push("/perfil")}
              >
                <Avatar className="h-full w-full">
                  <AvatarImage src={session?.user?.image || undefined} />
                  <AvatarFallback className="bg-emerald-500 text-white text-xs font-medium">
                    {session?.user?.name?.charAt(0) || "M"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Warning Banner */}
      {(session?.user?.penaltyPoints || 0) > 0 && !session?.user?.isBlocked && (
        <div className="bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-900 px-4 py-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              <span className="font-medium">{session?.user?.penaltyPoints}/9</span> pontos de atenção
            </p>
          </div>
        </div>
      )}

      {/* Blocked Banner */}
      {session?.user?.isBlocked && (
        <div className="bg-red-50 dark:bg-red-950/50 border-b border-red-200 dark:border-red-900 px-4 py-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <p className="text-xs text-red-700 dark:text-red-300 font-medium">
              Conta bloqueada - Entre em contato com o diretor
            </p>
          </div>
        </div>
      )}

      <main className="px-4 py-4 space-y-5">
        {/* Stats Grid - 2x2 para mostrar todos sem scroll */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium uppercase tracking-wide">Pendentes</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{pendingInvitations.length}</p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium uppercase tracking-wide">Confirmados</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{confirmedInvitations.length}</p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-1.5 text-slate-500">
              <History className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium uppercase tracking-wide">Participações</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{pastInvitations.length}</p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
              <Trophy className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium uppercase tracking-wide">Pontos</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{profileData?.user?.totalPoints || 0}</p>
          </div>
        </div>

        {/* Pending Invitations - Horizontal Scroll */}
        {pendingInvitations.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Convites Pendentes</h2>
              {pendingInvitations.length > 3 && (
                <button className="text-xs text-emerald-600 font-medium" onClick={() => setActiveView("pending")}>
                  Ver todos
                </button>
              )}
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 pb-2 scroll-snap-x">
              {pendingInvitations.map((inv: any) => {
                const eventType = EVENT_TYPES[inv.event?.type] || EVENT_TYPES.SPECIAL_EVENT
                return (
                  <Card 
                    key={inv.id}
                    className="flex-shrink-0 w-[280px] border border-slate-200 dark:border-slate-700 scroll-snap-start"
                  >
                    <CardContent className="p-3.5">
                      <div className="flex items-start gap-3">
                        <div className={`h-10 w-10 rounded-lg ${eventType.bg} flex items-center justify-center text-lg`}>
                          {eventType.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-slate-900 dark:text-white truncate">{inv.event?.title}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {inv.event?.date && format(new Date(inv.event.date), "EEE, dd/MM 'às' HH:mm", { locale: ptBR })}
                          </p>
                          {inv.event?.location && (
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" /> {inv.event.location}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button 
                          size="sm"
                          className="flex-1 h-8 bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
                          onClick={() => { setSelectedInvitation(inv); handleRespond("CONFIRMED"); }}
                          disabled={respondMutation.isPending}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" /> Confirmar
                        </Button>
                        <Button 
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-xs"
                          onClick={() => { setSelectedInvitation(inv); setShowDeclineDialog(true); }}
                          disabled={respondMutation.isPending}
                        >
                          <XCircle className="h-3 w-3 mr-1" /> Recusar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          {[
            { id: "pending", label: "Pendentes", count: pendingInvitations.length },
            { id: "confirmed", label: "Confirmados" },
            { id: "calendar", label: "Calendário" },
            { id: "availability", label: "Disponibilidade" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              className={cn(
                "flex-1 px-2 py-2 rounded-md text-xs font-medium transition-all relative",
                activeView === tab.id
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1 h-4 w-4 rounded-full bg-amber-500 text-white text-[9px] inline-flex items-center justify-center">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[300px]">
          {/* Pending Tab */}
          {activeView === "pending" && (
            <div className="space-y-2">
              {pendingInvitations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="h-14 w-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                    <Calendar className="h-7 w-7 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Nenhum convite pendente</p>
                  <p className="text-xs text-slate-400 mt-1">Novos convites aparecerão aqui</p>
                </div>
              ) : (
                pendingInvitations.map((inv: any) => {
                  const eventType = EVENT_TYPES[inv.event?.type] || EVENT_TYPES.SPECIAL_EVENT
                  return (
                    <Card key={inv.id} className="border border-slate-200 dark:border-slate-700">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className={`h-11 w-11 rounded-lg ${eventType.bg} flex items-center justify-center text-xl`}>
                            {eventType.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm">{inv.event?.title}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {inv.event?.date && format(new Date(inv.event.date), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                            </p>
                            {inv.isGuest && (
                              <Badge variant="outline" className="mt-1 text-[10px] h-5 border-amber-500 text-amber-600">
                                Convidado
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button 
                            size="sm"
                            className="flex-1 h-8 bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
                            onClick={() => { setSelectedInvitation(inv); handleRespond("CONFIRMED"); }}
                            disabled={respondMutation.isPending}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" /> Confirmar
                          </Button>
                          <Button 
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-xs"
                            onClick={() => { setSelectedInvitation(inv); setShowDeclineDialog(true); }}
                            disabled={respondMutation.isPending}
                          >
                            <XCircle className="h-3 w-3 mr-1" /> Recusar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          )}

          {/* Confirmed Tab */}
          {activeView === "confirmed" && (
            <div className="space-y-2">
              {confirmedInvitations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="h-14 w-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="h-7 w-7 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Nenhum evento confirmado</p>
                </div>
              ) : (
                confirmedInvitations.map((inv: any) => {
                  const eventType = EVENT_TYPES[inv.event?.type] || EVENT_TYPES.SPECIAL_EVENT
                  return (
                    <Card key={inv.id} className="border border-slate-200 dark:border-slate-700">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-lg ${eventType.bg} flex items-center justify-center text-lg`}>
                            {eventType.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm">{inv.event?.title}</h3>
                            <p className="text-xs text-slate-500">
                              {inv.event?.date && format(new Date(inv.event.date), "EEE, dd/MM 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 text-[10px]">
                            <CheckCircle className="h-3 w-3 mr-0.5" /> Confirmado
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          )}

          {/* Calendar Tab */}
          {activeView === "calendar" && (
            <Card className="border border-slate-200 dark:border-slate-700">
              <CardContent className="p-3">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-3">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h3 className="text-sm font-semibold capitalize">
                    {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                  </h3>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-0.5">
                  {weekDays.map((day, i) => (
                    <div key={i} className="text-center text-[10px] font-medium text-slate-400 py-1.5">{day}</div>
                  ))}
                  {calendarDays().map((day, i) => {
                    const dayEvents = getEventsForDay(day)
                    const isCurrentMonth = day >= startOfMonth(currentMonth) && day <= endOfMonth(currentMonth)
                    
                    return (
                      <div 
                        key={i}
                        className={cn(
                          "min-h-[44px] p-1 rounded-md transition-colors",
                          !isCurrentMonth && "opacity-30",
                          isToday(day) && "bg-emerald-50 dark:bg-emerald-950 ring-1 ring-emerald-500"
                        )}
                      >
                        <div className={cn("text-xs font-medium text-center", isToday(day) && "text-emerald-600")}>
                          {format(day, "d")}
                        </div>
                        <div className="mt-0.5 space-y-0.5">
                          {dayEvents.slice(0, 2).map((inv: any) => (
                            <div 
                              key={inv.id} 
                              className={cn("text-[8px] px-1 py-0.5 rounded text-white truncate", EVENT_TYPES[inv.event?.type]?.bg?.replace('50', '500').replace('950', '700') || "bg-slate-500")}
                            >
                              {inv.event?.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Availability Tab */}
          {activeView === "availability" && (
            <Card className="border border-slate-200 dark:border-slate-700">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-3">
                  <Clock3 className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-sm font-semibold">Minha Disponibilidade</h3>
                </div>
                <p className="text-xs text-slate-500 mb-3">Configure quando você está disponível para participar</p>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left p-2 font-medium text-slate-500">Dia</th>
                        <th className="text-center p-2 font-medium text-slate-500">Manhã</th>
                        <th className="text-center p-2 font-medium text-slate-500">Tarde</th>
                        <th className="text-center p-2 font-medium text-slate-500">Noite</th>
                      </tr>
                    </thead>
                    <tbody>
                      {WEEK_DAYS.map((day) => (
                        <tr key={day.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                          <td className="p-2 font-medium">{day.name}</td>
                          {day.periods.map((period) => (
                            <td key={period} className="p-2 text-center">
                              <Switch
                                checked={currentAvailability[day.id]?.[period] || false}
                                onCheckedChange={(checked) => handleAvailabilityChange(day.id, period, checked)}
                                className="data-[state=checked]:bg-emerald-500 h-5 w-8"
                              />
                            </td>
                          ))}
                          {day.periods.length === 2 && <td className="p-2 text-center text-slate-300">—</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg">
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" />
                    O sistema usará sua disponibilidade para sugerir você para eventos.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Gamification Card */}
      <div className="px-4 pb-4">
        <GamificationCard />
      </div>

      {/* Quick Actions Footer */}
      <QuickActionsFooter
        userType="musician"
        pendingCount={pendingInvitations.length}
        notificationCount={unreadNotifications.length}
      />

      {/* Decline Dialog */}
      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogContent className="max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Recusar Convite
            </DialogTitle>
            <DialogDescription className="text-sm">
              Tem certeza que deseja recusar este convite?
            </DialogDescription>
          </DialogHeader>
          {selectedInvitation && (
            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
              <p className="font-medium text-sm">{selectedInvitation.event?.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedInvitation.event?.date && format(new Date(selectedInvitation.event.date), "dd/MM/yyyy 'às' HH:mm")}
              </p>
            </div>
          )}
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1 h-9 text-sm" onClick={() => setShowDeclineDialog(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              className="flex-1 h-9 text-sm"
              onClick={() => handleRespond("DECLINED")}
              disabled={respondMutation.isPending}
            >
              {respondMutation.isPending ? "Enviando..." : "Recusar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
