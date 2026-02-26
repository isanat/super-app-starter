"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Calendar, Users, Music, CheckCircle, Clock, Plus,
  Sparkles, Church, LogOut, ChevronRight, ChevronLeft,
  User, Bell, MapPin, UserPlus, Grid3X3, List,
  AlertCircle, ExternalLink, Settings
} from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { QuickActionsFooter, FloatingActionButton } from "@/components/layout/quick-actions-footer"
import { RankingCard } from "@/components/gamification/gamification-card"

const EVENT_TYPES = [
  { id: "SABBATH_SCHOOL", name: "Escola Sabatina", icon: "📚", bg: "bg-blue-50 dark:bg-blue-950" },
  { id: "DIVINE_SERVICE", name: "Culto Divino", icon: "⛪", bg: "bg-emerald-50 dark:bg-emerald-950" },
  { id: "SABBATH_AFTERNOON", name: "Sábado à Tarde", icon: "🌅", bg: "bg-orange-50 dark:bg-orange-950" },
  { id: "WEDNESDAY_SERVICE", name: "Culto de Quarta", icon: "🕯️", bg: "bg-purple-50 dark:bg-purple-950" },
  { id: "SPECIAL_EVENT", name: "Evento Especial", icon: "🎵", bg: "bg-pink-50 dark:bg-pink-950" },
  { id: "REHEARSAL", name: "Ensaio", icon: "🎼", bg: "bg-amber-50 dark:bg-amber-950" },
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
      toast.success("Convites enviados!")
      setShowNewEvent(false)
      setStep(1)
      setSelectedMusicians([])
      queryClient.invalidateQueries({ queryKey: ["events"] })
    },
  })

  const handleSuggestMusicians = () => {
    if (!eventForm.title || !eventForm.date) {
      toast.error("Preencha título e data")
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
              {/* Notifications */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="relative h-9 w-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors">
                    <Bell className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                    {unreadNotifications.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                        {unreadNotifications.length}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0 rounded-xl" align="end">
                  <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-semibold">Notificações</h4>
                    {unreadNotifications.length > 0 && (
                      <Badge variant="secondary" className="text-[10px]">{unreadNotifications.length} novas</Badge>
                    )}
                  </div>
                  <ScrollArea className="h-64">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-slate-400">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">Nenhuma notificação</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {notifications.slice(0, 10).map((notification: any) => (
                          <div
                            key={notification.id}
                            className={cn(
                              "p-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
                              !notification.isRead && 'bg-blue-50/50 dark:bg-blue-950/50'
                            )}
                            onClick={() => markAsRead(notification.id)}
                          >
                            <p className="font-medium text-xs">{notification.title}</p>
                            <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">{notification.message}</p>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {format(new Date(notification.createdAt), "dd/MM HH:mm")}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>

              <button 
                className="h-9 w-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                onClick={() => router.push("/configuracoes")}
              >
                <Settings className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              </button>
              
              {/* Profile */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="h-9 w-9 rounded-lg overflow-hidden hover:ring-2 hover:ring-emerald-500/30 transition-all">
                    <Avatar className="h-full w-full">
                      <AvatarFallback className="bg-emerald-500 text-white text-xs font-medium">
                        {session?.user?.name?.charAt(0) || "D"}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 rounded-xl" align="end">
                  <div className="space-y-1">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{session?.user?.name}</p>
                      <p className="text-xs text-slate-500">{session?.user?.email}</p>
                    </div>
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-2">
                      <Button variant="ghost" size="sm" className="w-full justify-start rounded-lg text-xs" onClick={() => router.push("/perfil")}>
                        <User className="h-3 w-3 mr-2" />
                        Meu Perfil
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-red-500 rounded-lg text-xs" onClick={() => signOut()}>
                        <LogOut className="h-3 w-3 mr-2" />
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

      <main className="px-4 py-4 space-y-5">
        {/* Horizontal Stats Cards */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1">
          <div className="flex-shrink-0 min-w-[90px] bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
            <Calendar className="h-3.5 w-3.5 text-emerald-500 mb-1" />
            <p className="text-xl font-bold text-slate-900 dark:text-white">{thisMonthEvents.length}</p>
            <p className="text-[10px] text-slate-500">Este Mês</p>
          </div>
          
          <div className="flex-shrink-0 min-w-[90px] bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
            <Clock className="h-3.5 w-3.5 text-blue-500 mb-1" />
            <p className="text-xl font-bold text-slate-900 dark:text-white">{upcomingEvents.length}</p>
            <p className="text-[10px] text-slate-500">Próximos</p>
          </div>
          
          <div className="flex-shrink-0 min-w-[90px] bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
            <Users className="h-3.5 w-3.5 text-purple-500 mb-1" />
            <p className="text-xl font-bold text-slate-900 dark:text-white">{musicians.length}</p>
            <p className="text-[10px] text-slate-500">Músicos</p>
          </div>
          
          <div className="flex-shrink-0 min-w-[90px] bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
            <AlertCircle className="h-3.5 w-3.5 text-orange-500 mb-1" />
            <p className="text-xl font-bold text-slate-900 dark:text-white">{pendingInvites.length}</p>
            <p className="text-[10px] text-slate-500">Pendentes</p>
          </div>
          
          <div className="flex-shrink-0 min-w-[90px] bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
            <CheckCircle className="h-3.5 w-3.5 text-green-500 mb-1" />
            <p className="text-xl font-bold text-slate-900 dark:text-white">{confirmedInvites.length}</p>
            <p className="text-[10px] text-slate-500">Confirmados</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowNewEvent(true)}
            className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 text-left active:scale-[0.98] transition-transform group"
          >
            <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
              <Plus className="h-5 w-5" />
            </div>
            <h3 className="font-medium text-sm mt-3">Novo Evento</h3>
            <p className="text-xs text-slate-500 mt-0.5">Criar e enviar convites</p>
          </button>

          <button
            onClick={() => setShowInviteDialog(true)}
            className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 text-left active:scale-[0.98] transition-transform group"
          >
            <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
              <UserPlus className="h-5 w-5" />
            </div>
            <h3 className="font-medium text-sm mt-3">Convidar</h3>
            <p className="text-xs text-slate-500 mt-0.5">Adicionar à equipe</p>
          </button>
        </div>

        {/* Calendar */}
        <Card className="border border-slate-200 dark:border-slate-700">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <h3 className="text-sm font-semibold min-w-[110px] text-center capitalize">
                  {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                </h3>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex items-center gap-0.5">
                <Button 
                  variant={viewMode === "calendar" ? "secondary" : "ghost"} 
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewMode("calendar")}
                >
                  <Grid3X3 className="h-3 w-3" />
                </Button>
                <Button 
                  variant={viewMode === "list" ? "secondary" : "ghost"} 
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {viewMode === "calendar" ? (
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
                        "min-h-[50px] p-1 rounded-md transition-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800",
                        !isCurrentMonth && "opacity-30",
                        isToday(day) && "bg-emerald-50 dark:bg-emerald-950 ring-1 ring-emerald-500"
                      )}
                      onClick={() => router.push("/eventos")}
                    >
                      <div className={cn("text-xs font-medium text-center", isToday(day) && "text-emerald-600")}>
                        {format(day, "d")}
                      </div>
                      <div className="mt-0.5 space-y-0.5">
                        {dayEvents.slice(0, 2).map((event: any) => (
                          <div
                            key={event.id}
                            className="text-[8px] px-1 py-0.5 rounded bg-slate-500 text-white truncate"
                          >
                            {event.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <ScrollArea className="h-[280px]">
                {upcomingEvents.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">
                    <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">Nenhum evento agendado</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {upcomingEvents.map((event: any) => (
                      <div
                        key={event.id}
                        className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                        onClick={() => router.push(`/eventos/${event.id}`)}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            "h-9 w-9 rounded-lg flex items-center justify-center text-base",
                            EVENT_TYPES.find(t => t.id === event.type)?.bg || "bg-slate-100"
                          )}>
                            {EVENT_TYPES.find(t => t.id === event.type)?.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-medium truncate">{event.title}</h4>
                            <p className="text-[10px] text-slate-500">
                              {format(new Date(event.date), "EEE, dd/MM 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                              {event.invitations?.filter((i: any) => i.status === "CONFIRMED").length || 0}/{event.invitations?.length || 0}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Musicians List */}
        <Card className="border border-slate-200 dark:border-slate-700">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <Users className="h-4 w-4 text-purple-500" />
                Músicos
              </h3>
              <Badge variant="secondary" className="text-[10px]">{musicians.length}</Badge>
            </div>
            <ScrollArea className="h-[180px]">
              {musicians.length === 0 ? (
                <div className="p-4 text-center text-slate-400">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Nenhum músico cadastrado</p>
                  <Button variant="link" size="sm" className="mt-1 text-xs" onClick={() => setShowInviteDialog(true)}>
                    Convidar músicos
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {musicians.map((musician: any) => (
                    <div key={musician.id} className="p-2 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-purple-100 text-purple-600 text-xs">
                          {musician.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{musician.name}</p>
                        <div className="flex gap-1 flex-wrap">
                          {musician.MusicianProfile?.instruments && 
                            JSON.parse(musician.MusicianProfile.instruments).slice(0, 2).map((inst: string) => (
                              <Badge key={inst} variant="outline" className="text-[9px] h-4 px-1">
                                {inst}
                              </Badge>
                            ))
                          }
                        </div>
                      </div>
                      <Badge variant={musician.isActive ? "default" : "secondary"} className="text-[9px] h-4 px-1.5">
                        {musician.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </main>

      {/* FAB - New Event */}
      <button
        onClick={() => setShowNewEvent(true)}
        className="fixed bottom-20 right-4 h-12 w-12 rounded-full bg-emerald-500 text-white shadow-lg flex items-center justify-center lg:hidden active:scale-95 transition-transform z-40"
      >
        <Plus className="h-5 w-5" />
      </button>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base">Convidar Músico</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-2">Compartilhe o link de convite:</p>
              <Button variant="outline" className="w-full h-9 text-xs" onClick={handleCopyInviteLink}>
                {copied ? "✓ Copiado!" : "Copiar Link de Convite"}
              </Button>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500">ou</p>
            </div>
            <Button variant="outline" className="w-full h-9 text-xs" onClick={handleShareWhatsApp}>
              Compartilhar via WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Event Dialog */}
      <Dialog open={showNewEvent} onOpenChange={setShowNewEvent}>
        <DialogContent className="max-w-md rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              {step === 1 && "Criar Evento"}
              {step === 2 && "Selecionar Músicos"}
              {step === 3 && "Confirmar Escala"}
            </DialogTitle>
          </DialogHeader>
          
          {step === 1 && (
            <div className="space-y-3 mt-2">
              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Título</Label>
                  <Input
                    placeholder="Ex: Escola Sabatina"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={eventForm.type} onValueChange={(v) => setEventForm({ ...eventForm, type: v })}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((t) => (
                        <SelectItem key={t.id} value={t.id} className="text-sm">{t.icon} {t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Data</Label>
                    <Input type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Horário</Label>
                    <Input type="time" value={eventForm.time} onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })} className="h-9 text-sm" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Local</Label>
                  <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                    <Church className="h-4 w-4 text-emerald-600" />
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">{eventLocation || "Carregando..."}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Observações</Label>
                  <Textarea placeholder="Observações..." value={eventForm.notes} onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })} className="text-sm min-h-[60px]" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowNewEvent(false)} className="h-8">Cancelar</Button>
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 h-8" onClick={handleSuggestMusicians} disabled={suggestMutation.isPending}>
                  {suggestMutation.isPending ? (
                    <><Sparkles className="h-3 w-3 mr-1 animate-spin" /> Buscando...</>
                  ) : (
                    <><Sparkles className="h-3 w-3 mr-1" /> Sugerir Músicos</>
                  )}
                </Button>
              </div>
            </div>
          )}
          
          {step === 2 && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-500">Toque nos músicos para selecioná-los</p>
                <Badge variant="secondary" className="text-[10px]">{selectedMusicians.length} selecionados</Badge>
              </div>
              <ScrollArea className="h-52">
                <div className="space-y-1.5">
                  {suggestedMusicians.map((musician) => {
                    const isSelected = selectedMusicians.find(m => m.id === musician.id)
                    return (
                      <div 
                        key={musician.id} 
                        onClick={() => handleSelectMusician(musician)}
                        className={cn(
                          "p-2.5 rounded-lg border cursor-pointer transition-all",
                          isSelected ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">{musician.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-medium">{musician.name}</p>
                              <div className="flex gap-1 flex-wrap">
                                {musician.instruments?.map((inst: string) => (
                                  <Badge key={inst} variant="outline" className="text-[9px] h-4 px-1">{inst}</Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          {isSelected && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
              <Button 
                variant="outline" 
                size="sm"
                className="w-full mt-3 h-8 text-xs border-amber-500 text-amber-600 hover:bg-amber-50"
                onClick={() => setShowGuestInviteDialog(true)}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Adicionar Músico Convidado
              </Button>
              <div className="flex justify-between pt-3">
                <Button variant="outline" size="sm" onClick={() => setStep(1)} className="h-8">Voltar</Button>
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 h-8" onClick={() => setStep(3)} disabled={selectedMusicians.length === 0}>
                  Continuar <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          )}
          
          {step === 3 && (
            <div className="mt-2 space-y-3">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                <h4 className="text-sm font-medium">{eventForm.title}</h4>
                <div className="text-xs text-slate-500 space-y-0.5 mt-1.5">
                  <p>📅 {eventForm.date && format(new Date(eventForm.date), "EEE, dd 'de' MMM", { locale: ptBR })} às {eventForm.time}</p>
                  <p>📍 {eventLocation}</p>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-medium mb-2">Escala ({selectedMusicians.length} músicos)</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedMusicians.map((m) => (
                    <Badge key={m.id} variant="secondary" className="text-[10px]">
                      {m.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="outline" size="sm" onClick={() => setStep(2)} className="h-8">Voltar</Button>
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 h-8" onClick={handleConfirmEvent} disabled={createEventMutation.isPending || sendInvitesMutation.isPending}>
                  {createEventMutation.isPending || sendInvitesMutation.isPending ? "Criando..." : "Criar Evento"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Guest Invite Dialog */}
      <Dialog open={showGuestInviteDialog} onOpenChange={setShowGuestInviteDialog}>
        <DialogContent className="max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base">Adicionar Convidado</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Email do músico"
                value={guestSearchEmail}
                onChange={(e) => setGuestSearchEmail(e.target.value)}
                className="h-9 text-sm"
              />
              <Button size="sm" className="h-9" onClick={handleSearchGuest} disabled={isSearchingGuest}>
                {isSearchingGuest ? "..." : "Buscar"}
              </Button>
            </div>
            
            {foundGuest && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">{foundGuest.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{foundGuest.name}</p>
                    <p className="text-xs text-slate-500">{foundGuest.email}</p>
                  </div>
                </div>
                <Button size="sm" className="w-full mt-2 h-8 text-xs" onClick={handleAddGuestMusician}>
                  Adicionar como Convidado
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Actions Footer */}
      <QuickActionsFooter
        userType="director"
        onNewEvent={() => setShowNewEvent(true)}
        onInvite={() => setShowInviteDialog(true)}
        notificationCount={unreadNotifications.length}
      />
    </div>
  )
}
