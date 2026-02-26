"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Calendar, Users, Music, CheckCircle, Clock, Plus, Send, 
  Sparkles, Church, LogOut, ChevronRight, ChevronLeft,
  User, Copy, Share2, Check, Bell, MapPin, Phone,
  Mail, Edit, CalendarDays, List, Grid3X3,
  AlertCircle, UserPlus, Home, Search, ExternalLink
} from "lucide-react"
import { QuickActionsFooter, FloatingActionButton } from "@/components/layout/quick-actions-footer"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

const EVENT_TYPES = [
  { id: "SABBATH_SCHOOL", name: "Escola Sabatina", icon: "📚", color: "bg-blue-500" },
  { id: "DIVINE_SERVICE", name: "Culto Divino", icon: "⛪", color: "bg-emerald-500" },
  { id: "SABBATH_AFTERNOON", name: "Sábado à Tarde", icon: "🌅", color: "bg-orange-500" },
  { id: "WEDNESDAY_SERVICE", name: "Culto de Quarta", icon: "🕯️", color: "bg-purple-500" },
  { id: "SPECIAL_EVENT", name: "Evento Especial", icon: "🎵", color: "bg-pink-500" },
  { id: "REHEARSAL", name: "Ensaio", icon: "🎼", color: "bg-yellow-500" },
]

export function DirectorDashboard() {
  const { data: session } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  
  const [showNewEvent, setShowNewEvent] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showGuestInviteDialog, setShowGuestInviteDialog] = useState(false)
  const [step, setStep] = useState(1)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar")

  // Guest invite state
  const [guestSearchEmail, setGuestSearchEmail] = useState("")
  const [foundGuest, setFoundGuest] = useState<any>(null)
  const [guestChurchName, setGuestChurchName] = useState("")
  const [isSearchingGuest, setIsSearchingGuest] = useState(false)

  const [eventForm, setEventForm] = useState({
    title: "",
    type: "SABBATH_SCHOOL",
    date: "",
    time: "09:00",
    location: "",
    notes: "",
  })

  const [suggestedMusicians, setSuggestedMusicians] = useState<any[]>([])
  const [selectedMusicians, setSelectedMusicians] = useState<any[]>([])
  const [copied, setCopied] = useState(false)

  // Fetch church data
  const { data: churchData } = useQuery({
    queryKey: ["church"],
    queryFn: async () => {
      const res = await fetch("/api/church")
      return res.json()
    },
  })

  const eventLocation = eventForm.location || churchData?.church?.name || ""

  // Fetch events
  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const res = await fetch("/api/events")
      return res.json()
    },
  })

  // Fetch musicians
  const { data: musiciansData } = useQuery({
    queryKey: ["musicians"],
    queryFn: async () => {
      const res = await fetch("/api/users?role=MUSICIAN")
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

  const notifications = notificationsData?.notifications || []
  const unreadNotifications = notifications.filter((n: any) => !n.isRead)
  const events = eventsData?.events || []
  const musicians = musiciansData?.users || []
  
  // Calculate metrics
  const upcomingEvents = events.filter((e: any) => 
    new Date(e.date) >= new Date() && e.status !== "CANCELLED"
  )
  
  const thisMonthEvents = events.filter((e: any) => {
    const eventDate = new Date(e.date)
    return eventDate >= startOfMonth(currentMonth) && eventDate <= endOfMonth(currentMonth)
  })
  
  const pendingInvites = events.flatMap((e: any) => 
    e.invitations?.filter((i: any) => i.status === "PENDING") || []
  )
  
  const confirmedInvites = events.flatMap((e: any) => 
    e.invitations?.filter((i: any) => i.status === "CONFIRMED") || []
  )

  // Calendar helpers
  const getEventsForDay = (date: Date) => {
    return events.filter((e: any) => {
      const eventDate = new Date(e.date)
      return isSameDay(eventDate, date)
    })
  }

  const calendarDays = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: startDate, end: endDate })
  }

  // Mutations
  const suggestMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, autoSuggest: true }),
      })
      return res.json()
    },
    onSuccess: (data) => {
      setSuggestedMusicians(data.suggestedMusicians || [])
      setStep(2)
    },
  })

  const createEventMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      return res.json()
    },
  })

  const sendInvitesMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      return res.json()
    },
    onSuccess: () => {
      toast.success("Convites enviados com sucesso!")
      setShowNewEvent(false)
      setStep(1)
      setSelectedMusicians([])
      queryClient.invalidateQueries({ queryKey: ["events"] })
    },
  })

  const handleSuggestMusicians = () => {
    if (!eventForm.title || !eventForm.date) {
      toast.error("Preencha título e data do evento")
      return
    }
    const dateTime = new Date(`${eventForm.date}T${eventForm.time}`)
    suggestMutation.mutate({
      title: eventForm.title,
      type: eventForm.type,
      date: dateTime.toISOString(),
    })
  }

  const handleSelectMusician = (musician: any) => {
    if (selectedMusicians.find(m => m.id === musician.id)) {
      setSelectedMusicians(prev => prev.filter(m => m.id !== musician.id))
    } else {
      setSelectedMusicians(prev => [...prev, musician])
    }
  }

  const handleConfirmEvent = async () => {
    const dateTime = new Date(`${eventForm.date}T${eventForm.time}`)
    const event = await createEventMutation.mutateAsync({
      title: eventForm.title,
      type: eventForm.type,
      date: dateTime.toISOString(),
      location: eventLocation,
      notes: eventForm.notes,
    })

    if (event.event?.id && selectedMusicians.length > 0) {
      await sendInvitesMutation.mutateAsync({
        action: "sendInvites",
        eventId: event.event.id,
        invitations: selectedMusicians.map(m => ({
          userId: m.id,
          role: m.vocals?.length > 0 ? "SINGER" : "INSTRUMENTALIST",
          instrument: m.instruments?.[0],
          vocalPart: m.vocals?.[0],
          isGuest: m.isGuest || false,
          guestFromChurchId: m.guestFromChurchId || null,
          guestFromChurchName: m.guestFromChurchName || null,
        })),
      })
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      })
      refetchNotifications()
    } catch (error) {
      console.error('Erro ao marcar notificação:', error)
    }
  }

  const handleCopyInviteLink = () => {
    const inviteCode = churchData?.church?.slug
    if (inviteCode) {
      const inviteLink = `${window.location.origin}/entrar-igreja?codigo=${inviteCode}`
      navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      toast.success("Link copiado!")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleShareWhatsApp = () => {
    const inviteCode = churchData?.church?.slug
    if (inviteCode) {
      const inviteLink = `${window.location.origin}/entrar-igreja?codigo=${inviteCode}`
      const message = encodeURIComponent(`🎵 *Louvor Conectado*\n\nVocê foi convidado para fazer parte do ministério de louvor!\n\nClique no link para entrar:\n${inviteLink}`)
      window.open(`https://wa.me/?text=${message}`, "_blank")
    }
  }

  // Search guest musician by email
  const handleSearchGuest = async () => {
    if (!guestSearchEmail) {
      toast.error("Digite um email para buscar")
      return
    }

    setIsSearchingGuest(true)
    setFoundGuest(null)

    try {
      const res = await fetch(`/api/users/search?email=${encodeURIComponent(guestSearchEmail)}`)
      const data = await res.json()

      if (data.error) {
        toast.error(data.error)
        setFoundGuest(null)
      } else {
        setFoundGuest(data.user)
        if (data.user.church) {
          setGuestChurchName(data.user.church.name)
        }
      }
    } catch (error) {
      toast.error("Erro ao buscar usuário")
      setFoundGuest(null)
    } finally {
      setIsSearchingGuest(false)
    }
  }

  // Add guest to selected musicians
  const handleAddGuestMusician = () => {
    if (!foundGuest) return

    const guestMusician = {
      id: foundGuest.id,
      name: foundGuest.name,
      email: foundGuest.email,
      instruments: foundGuest.instruments || [],
      vocals: foundGuest.vocals || [],
      isGuest: true,
      guestFromChurchId: foundGuest.church?.id,
      guestFromChurchName: guestChurchName || foundGuest.church?.name || "Igreja não informada",
    }

    // Check if already selected
    if (selectedMusicians.find(m => m.id === foundGuest.id)) {
      toast.error("Músico já está na lista")
      return
    }

    setSelectedMusicians(prev => [...prev, guestMusician])
    toast.success(`${foundGuest.name} adicionado como convidado!`)
    setShowGuestInviteDialog(false)
    setFoundGuest(null)
    setGuestSearchEmail("")
    setGuestChurchName("")
  }

  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 pb-footer">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
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
            
            <div className="flex items-center gap-2">
              {/* Notifications */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="relative h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors press-effect">
                    <Bell className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                    {unreadNotifications.length > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                        {unreadNotifications.length}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 rounded-2xl" align="end">
                  <div className="flex items-center justify-between p-4 border-b">
                    <h4 className="font-semibold">Notificações</h4>
                    {unreadNotifications.length > 0 && (
                      <Badge variant="secondary">{unreadNotifications.length} novas</Badge>
                    )}
                  </div>
                  <ScrollArea className="h-72">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-slate-400">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma notificação</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {notifications.slice(0, 10).map((notification: any) => (
                          <div
                            key={notification.id}
                            className={cn(
                              "p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
                              !notification.isRead && 'bg-blue-50/50 dark:bg-blue-950/50'
                            )}
                            onClick={() => markAsRead(notification.id)}
                          >
                            <p className="font-medium text-sm">{notification.title}</p>
                            <p className="text-xs text-slate-500 line-clamp-2">{notification.message}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              {format(new Date(notification.createdAt), "dd/MM HH:mm")}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>

              {/* Invite Button */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowInviteDialog(true)}
                className="rounded-xl hidden sm:flex"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Convidar
              </Button>
              
              {/* Profile */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="h-10 w-10 rounded-xl overflow-hidden ring-2 ring-emerald-500/20 hover:ring-emerald-500/40 transition-all press-effect">
                    <Avatar className="h-full w-full">
                      <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-semibold">
                        {session?.user?.name?.charAt(0) || "D"}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 rounded-2xl" align="end">
                  <div className="space-y-1">
                    <div className="px-2 py-1.5">
                      <p className="font-medium text-sm">{session?.user?.name}</p>
                      <p className="text-xs text-slate-500">{session?.user?.email}</p>
                    </div>
                    <div className="border-t pt-2">
                      <Button variant="ghost" size="sm" className="w-full justify-start rounded-xl" onClick={() => router.push("/perfil")}>
                        <Edit className="h-4 w-4 mr-2" />
                        Meu Perfil
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-red-500 rounded-xl" onClick={() => signOut()}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Sair
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4">
        {/* Quick Stats */}
        <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2 -mx-4 px-4">
          <div className="flex-shrink-0 w-[140px] rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-500 p-4 text-white shadow-lg shadow-emerald-500/20">
            <CalendarDays className="h-6 w-6 opacity-80" />
            <p className="text-3xl font-bold mt-2 numeric-display">{thisMonthEvents.length}</p>
            <p className="text-sm text-emerald-100">Este Mês</p>
          </div>
          
          <div className="flex-shrink-0 w-[140px] rounded-2xl bg-gradient-to-br from-blue-400 to-blue-500 p-4 text-white shadow-lg shadow-blue-500/20">
            <Clock className="h-6 w-6 opacity-80" />
            <p className="text-3xl font-bold mt-2 numeric-display">{upcomingEvents.length}</p>
            <p className="text-sm text-blue-100">Próximos</p>
          </div>
          
          <div className="flex-shrink-0 w-[140px] rounded-2xl bg-gradient-to-br from-purple-400 to-purple-500 p-4 text-white shadow-lg shadow-purple-500/20">
            <Users className="h-6 w-6 opacity-80" />
            <p className="text-3xl font-bold mt-2 numeric-display">{musicians.length}</p>
            <p className="text-sm text-purple-100">Músicos</p>
          </div>
          
          <div className="flex-shrink-0 w-[140px] rounded-2xl bg-gradient-to-br from-orange-400 to-orange-500 p-4 text-white shadow-lg shadow-orange-500/20">
            <AlertCircle className="h-6 w-6 opacity-80" />
            <p className="text-3xl font-bold mt-2 numeric-display">{pendingInvites.length}</p>
            <p className="text-sm text-orange-100">Pendentes</p>
          </div>
          
          <div className="flex-shrink-0 w-[140px] rounded-2xl bg-gradient-to-br from-green-500 to-green-600 p-4 text-white shadow-lg shadow-green-500/20">
            <CheckCircle className="h-6 w-6 opacity-80" />
            <p className="text-3xl font-bold mt-2 numeric-display">{confirmedInvites.length}</p>
            <p className="text-sm text-green-100">Confirmados</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            onClick={() => setShowNewEvent(true)}
            className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-card border border-slate-100 dark:border-slate-700 text-left hover:shadow-lg transition-all press-effect group"
          >
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform">
              <Plus className="h-6 w-6" />
            </div>
            <h3 className="font-semibold mt-3">Novo Evento</h3>
            <p className="text-sm text-slate-500">Criar e enviar convites</p>
          </button>

          <button
            onClick={() => setShowInviteDialog(true)}
            className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-card border border-slate-100 dark:border-slate-700 text-left hover:shadow-lg transition-all press-effect group"
          >
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform">
              <UserPlus className="h-6 w-6" />
            </div>
            <h3 className="font-semibold mt-3">Convidar Músico</h3>
            <p className="text-sm text-slate-500">Adicionar à equipe</p>
          </button>
        </div>

        {/* Calendar */}
        <div className="mt-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="rounded-xl">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="font-semibold min-w-[140px] text-center">
                  {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="rounded-xl">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant={viewMode === "calendar" ? "default" : "ghost"} 
                  size="icon"
                  onClick={() => setViewMode("calendar")}
                  className="rounded-xl"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button 
                  variant={viewMode === "list" ? "default" : "ghost"} 
                  size="icon"
                  onClick={() => setViewMode("list")}
                  className="rounded-xl"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {viewMode === "calendar" ? (
              <div className="p-3">
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
                          "min-h-[70px] p-1 rounded-xl transition-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700",
                          !isCurrentMonth && "opacity-30",
                          isToday(day) && "bg-emerald-50 dark:bg-emerald-950 ring-2 ring-emerald-500"
                        )}
                        onClick={() => router.push("/eventos")}
                      >
                        <div className={cn("text-sm font-medium", isToday(day) && "text-emerald-600")}>
                          {format(day, "d")}
                        </div>
                        <div className="mt-0.5 space-y-0.5">
                          {dayEvents.slice(0, 2).map((event: any) => (
                            <div
                              key={event.id}
                              className={cn(
                                "text-[9px] px-1 py-0.5 rounded text-white truncate",
                                EVENT_TYPES.find(t => t.id === event.type)?.color || "bg-slate-500"
                              )}
                            >
                              {EVENT_TYPES.find(t => t.id === event.type)?.icon} {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-[9px] text-center text-slate-400">+{dayEvents.length - 2}</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <ScrollArea className="h-[350px]">
                {upcomingEvents.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum evento agendado</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {upcomingEvents.map((event: any) => (
                      <div
                        key={event.id}
                        className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/eventos/${event.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-12 w-12 rounded-xl flex items-center justify-center text-xl text-white",
                            EVENT_TYPES.find(t => t.id === event.type)?.color || "bg-slate-500"
                          )}>
                            {EVENT_TYPES.find(t => t.id === event.type)?.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{event.title}</h4>
                            <p className="text-sm text-slate-500">
                              {format(new Date(event.date), "EEE, dd/MM 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant={event.status === "PUBLISHED" ? "default" : "secondary"} className="rounded-lg">
                              {event.status === "DRAFT" ? "Rascunho" : "Publicado"}
                            </Badge>
                            <p className="text-xs text-slate-400 mt-1">
                              {event.invitations?.filter((i: any) => i.status === "CONFIRMED").length || 0}/{event.invitations?.length || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}
          </div>
        </div>

        {/* Musicians List */}
        <div className="mt-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-500" />
                Músicos
              </h3>
              <Badge variant="secondary" className="rounded-lg">{musicians.length}</Badge>
            </div>
            <ScrollArea className="h-[200px]">
              {musicians.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  <User className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Nenhum músico cadastrado</p>
                  <Button variant="link" className="mt-2" onClick={() => setShowInviteDialog(true)}>
                    Convidar músicos
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {musicians.map((musician: any) => (
                    <div key={musician.id} className="p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-gradient-to-br from-purple-400 to-purple-500 text-white">
                          {musician.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{musician.name}</p>
                        <div className="flex gap-1 flex-wrap">
                          {musician.MusicianProfile?.instruments && 
                            JSON.parse(musician.MusicianProfile.instruments).slice(0, 2).map((inst: string) => (
                              <Badge key={inst} variant="outline" className="text-[10px] px-1.5 py-0 rounded-lg">
                                {inst}
                              </Badge>
                            ))
                          }
                        </div>
                      </div>
                      <Badge variant={musician.isActive ? "default" : "secondary"} className="text-xs rounded-lg">
                        {musician.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </main>

      {/* FAB - New Event */}
      <FloatingActionButton
        onClick={() => setShowNewEvent(true)}
        icon={<Plus className="h-6 w-6" />}
        label="Novo Evento"
      />

      {/* Quick Actions Footer */}
      <QuickActionsFooter
        userType="director"
        onNewEvent={() => setShowNewEvent(true)}
        onInvite={() => setShowInviteDialog(true)}
        notificationCount={unreadNotifications.length}
      />

      {/* New Event Dialog */}
      <Dialog open={showNewEvent} onOpenChange={setShowNewEvent}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {step === 1 && "Criar Evento"}
              {step === 2 && "Selecionar Músicos"}
              {step === 3 && "Confirmar Escala"}
            </DialogTitle>
          </DialogHeader>
          
          {step === 1 && (
            <div className="space-y-4 mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    placeholder="Ex: Escola Sabatina"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={eventForm.type} onValueChange={(v) => setEventForm({ ...eventForm, type: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.icon} {t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Horário</Label>
                  <Input type="time" value={eventForm.time} onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })} className="rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Local</Label>
                <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                  <Church className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="font-medium text-emerald-700 dark:text-emerald-300">{eventLocation || "Carregando..."}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea placeholder="Observações..." value={eventForm.notes} onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })} className="rounded-xl" />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowNewEvent(false)} className="rounded-xl">Cancelar</Button>
                <Button className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl" onClick={handleSuggestMusicians} disabled={suggestMutation.isPending}>
                  {suggestMutation.isPending ? (
                    <><Sparkles className="h-4 w-4 mr-2 animate-spin" /> Buscando...</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" /> Sugerir Músicos</>
                  )}
                </Button>
              </div>
            </div>
          )}
          
          {step === 2 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-500">Clique nos músicos para selecioná-los</p>
                <Badge variant="secondary" className="rounded-lg">{selectedMusicians.length} selecionados</Badge>
              </div>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {suggestedMusicians.map((musician) => {
                    const isSelected = selectedMusicians.find(m => m.id === musician.id)
                    return (
                      <div 
                        key={musician.id} 
                        onClick={() => handleSelectMusician(musician)}
                        className={cn(
                          "p-3 rounded-xl border cursor-pointer transition-all press-effect",
                          isSelected ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>{musician.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{musician.name}</p>
                              <div className="flex gap-1 flex-wrap">
                                {musician.instruments?.map((inst: string) => (
                                  <Badge key={inst} variant="outline" className="text-xs">{inst}</Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          {isSelected && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                        </div>
                      </div>
                    )
                  })}
                  {/* Selected guest musicians */}
                  {selectedMusicians.filter(m => m.isGuest).map((musician) => (
                    <div 
                      key={musician.id} 
                      className="p-3 rounded-xl border border-amber-500 bg-amber-50 dark:bg-amber-950"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-amber-500">{musician.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{musician.name}</p>
                              <Badge className="bg-amber-500 text-white text-xs">Convidado</Badge>
                            </div>
                            <div className="flex gap-1 flex-wrap items-center">
                              {musician.instruments?.map((inst: string) => (
                                <Badge key={inst} variant="outline" className="text-xs">{inst}</Badge>
                              ))}
                              <span className="text-xs text-amber-600">{musician.guestFromChurchName}</span>
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSelectedMusicians(prev => prev.filter(m => m.id !== musician.id))}
                          className="text-red-500"
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              {/* Add guest musician button */}
              <Button 
                variant="outline" 
                className="w-full mt-3 rounded-xl border-amber-500 text-amber-600 hover:bg-amber-50"
                onClick={() => setShowGuestInviteDialog(true)}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Adicionar Músico Convidado (outra igreja)
              </Button>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)} className="rounded-xl">Voltar</Button>
                <Button className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl" onClick={() => setStep(3)} disabled={selectedMusicians.length === 0}>
                  Continuar <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
          
          {step === 3 && (
            <div className="mt-4 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                <h4 className="font-medium">{eventForm.title}</h4>
                <div className="text-sm text-slate-500 space-y-1 mt-2">
                  <p>📅 {eventForm.date && format(new Date(eventForm.date), "EEEE, dd 'de' MMMM", { locale: ptBR })} às {eventForm.time}</p>
                  <p>📍 {eventLocation}</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Escala ({selectedMusicians.length} músicos)</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectedMusicians.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{m.name}</span>
                        {m.isGuest && (
                          <Badge className="bg-amber-500 text-white text-xs">Convidado - {m.guestFromChurchName}</Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {m.instruments?.map((inst: string) => (
                          <Badge key={inst} variant="outline" className="text-xs">{inst}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(2)} className="rounded-xl">Voltar</Button>
                <Button className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl" onClick={handleConfirmEvent} disabled={createEventMutation.isPending || sendInvitesMutation.isPending}>
                  {createEventMutation.isPending || sendInvitesMutation.isPending ? (
                    <><Sparkles className="h-4 w-4 mr-2 animate-spin" /> Processando...</>
                  ) : (
                    <><Send className="h-4 w-4 mr-2" /> Confirmar e Enviar</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-500" />
              Convidar Músico
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-slate-500">
              Compartilhe o link abaixo para convidar músicos para sua igreja.
            </p>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={`${window.location.origin}/entrar-igreja?codigo=${churchData?.church?.slug || ""}`}
                className="rounded-xl text-sm"
              />
              <Button variant="outline" size="icon" onClick={handleCopyInviteLink} className="rounded-xl flex-shrink-0">
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button 
              variant="outline" 
              className="w-full rounded-xl"
              onClick={handleShareWhatsApp}
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Compartilhar no WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Guest Invite Dialog */}
      <Dialog open={showGuestInviteDialog} onOpenChange={setShowGuestInviteDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5 text-amber-500" />
              Adicionar Músico Convidado
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-slate-500">
              Busque um músico de outra igreja pelo email para convidá-lo como convidado especial.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Email do músico"
                type="email"
                value={guestSearchEmail}
                onChange={(e) => setGuestSearchEmail(e.target.value)}
                className="rounded-xl"
                onKeyDown={(e) => e.key === 'Enter' && handleSearchGuest()}
              />
              <Button 
                onClick={handleSearchGuest} 
                disabled={isSearchingGuest}
                className="rounded-xl"
              >
                {isSearchingGuest ? (
                  <Sparkles className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Found guest */}
            {foundGuest && (
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-amber-500 text-white">
                      {foundGuest.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{foundGuest.name}</p>
                    <p className="text-sm text-slate-500">{foundGuest.email}</p>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {foundGuest.instruments?.map((inst: string) => (
                        <Badge key={inst} variant="outline" className="text-xs">{inst}</Badge>
                      ))}
                      {foundGuest.vocals?.map((vocal: string) => (
                        <Badge key={vocal} variant="outline" className="text-xs">{vocal}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
                
                {foundGuest.isSameChurch ? (
                  <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-sm text-blue-600 dark:text-blue-300">
                      Este músico já é da sua igreja. Adicione-o normalmente na lista.
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Igreja de origem</Label>
                      <Input
                        placeholder="Nome da igreja do músico"
                        value={guestChurchName}
                        onChange={(e) => setGuestChurchName(e.target.value)}
                        className="rounded-xl"
                      />
                    </div>
                    <Button 
                      className="w-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl"
                      onClick={handleAddGuestMusician}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Adicionar como Convidado
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
