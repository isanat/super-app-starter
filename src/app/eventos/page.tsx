"use client"

import * as React from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Calendar as CalendarIcon, Clock, CheckCircle, AlertCircle, List, Grid3X3, ChevronLeft, ChevronRight, Loader2, Music, Church, Bell, User } from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const EVENT_TYPES: Record<string, { name: string; icon: string; bg: string }> = {
  SABBATH_SCHOOL: { name: "Escola Sabatina", icon: "📚", bg: "bg-blue-50 dark:bg-blue-950" },
  DIVINE_SERVICE: { name: "Culto Divino", icon: "⛪", bg: "bg-emerald-50 dark:bg-emerald-950" },
  SABBATH_AFTERNOON: { name: "Sábado à Tarde", icon: "🌅", bg: "bg-orange-50 dark:bg-orange-950" },
  WEDNESDAY_SERVICE: { name: "Culto de Quarta", icon: "🕯️", bg: "bg-purple-50 dark:bg-purple-950" },
  SPECIAL_EVENT: { name: "Evento Especial", icon: "🎵", bg: "bg-pink-50 dark:bg-pink-950" },
  REHEARSAL: { name: "Ensaio", icon: "🎼", bg: "bg-amber-50 dark:bg-amber-950" },
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  PUBLISHED: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  CONFIRMED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  COMPLETED: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  PUBLISHED: "Publicado",
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
}

export default function EventosPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const isDirector = session?.user?.role === "DIRECTOR" || session?.user?.role === "ADMIN"
  
  const [viewMode, setViewMode] = React.useState<"list" | "calendar">("list")
  const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date())
  const [filterType, setFilterType] = React.useState<string>("all")

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const res = await fetch("/api/events")
      if (!res.ok) throw new Error("Erro ao carregar eventos")
      return res.json()
    },
  })

  const events = eventsData?.events || []

  const filteredEvents = events.filter((event: any) => {
    if (filterType !== "all" && event.type !== filterType) return false
    return true
  })

  const upcomingEvents = filteredEvents
    .filter((e: any) => new Date(e.date) >= new Date() && e.status !== "CANCELLED")
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const pastEvents = filteredEvents
    .filter((e: any) => new Date(e.date) < new Date() || e.status === "CANCELLED")
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const calendarDays = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: startDate, end: endDate })
  }

  const getEventsForDay = (date: Date) => {
    return events.filter((event: any) => isSameDay(new Date(event.date), date))
  }

  const getEventStats = (event: any) => {
    const invitations = event.invitations || []
    const confirmed = invitations.filter((i: any) => i.status === "CONFIRMED").length
    const total = invitations.length
    return { confirmed, total }
  }

  const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"]

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button onClick={() => router.push("/")} className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h1 className="font-semibold text-sm">Eventos</h1>
            </div>
            
            <div className="flex items-center gap-1">
              {isDirector && (
                <Button size="sm" className="h-8 text-xs bg-emerald-500 hover:bg-emerald-600" asChild>
                  <Link href="/eventos/novo">
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Novo
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {/* Filter and View Toggle */}
        <div className="flex items-center justify-between gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="SABBATH_SCHOOL">Escola Sabatina</SelectItem>
              <SelectItem value="DIVINE_SERVICE">Culto Divino</SelectItem>
              <SelectItem value="SABBATH_AFTERNOON">Sábado à Tarde</SelectItem>
              <SelectItem value="WEDNESDAY_SERVICE">Culto de Quarta</SelectItem>
              <SelectItem value="REHEARSAL">Ensaio</SelectItem>
              <SelectItem value="SPECIAL_EVENT">Especial</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setViewMode("list")}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === "calendar" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setViewMode("calendar")}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {viewMode === "list" ? (
          <div className="space-y-3">
            {/* Upcoming Events */}
            <div>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Próximos</h2>
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">Nenhum evento encontrado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingEvents.map((event: any) => {
                    const stats = getEventStats(event)
                    const eventType = EVENT_TYPES[event.type] || EVENT_TYPES.SPECIAL_EVENT
                    return (
                      <Link key={event.id} href={`/eventos/${event.id}`}>
                        <Card className="border border-slate-200 dark:border-slate-700 overflow-hidden">
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <div className={`h-10 w-10 rounded-lg ${eventType.bg} flex items-center justify-center text-lg flex-shrink-0`}>
                                {eventType.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <h3 className="font-medium text-sm truncate">{event.title}</h3>
                                  <Badge className={`${STATUS_COLORS[event.status]} text-[9px] h-4 px-1.5 flex-shrink-0`}>
                                    {STATUS_LABELS[event.status]}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <CalendarIcon className="h-3 w-3" />
                                    {format(new Date(event.date), "EEE, dd/MM", { locale: ptBR })}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(event.date), "HH:mm")}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="flex items-center gap-1 text-[10px]">
                                    <CheckCircle className="h-3 w-3 text-emerald-500" />
                                    <span className="text-emerald-600">{stats.confirmed}</span>
                                    <span className="text-slate-400">/{stats.total}</span>
                                  </div>
                                  <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-emerald-500 rounded-full"
                                      style={{ width: `${stats.total > 0 ? (stats.confirmed / stats.total) * 100 : 0}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Past Events */}
            {pastEvents.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Anteriores</h2>
                <div className="space-y-2">
                  {pastEvents.slice(0, 5).map((event: any) => {
                    const eventType = EVENT_TYPES[event.type] || EVENT_TYPES.SPECIAL_EVENT
                    return (
                      <Link key={event.id} href={`/eventos/${event.id}`}>
                        <Card className="border border-slate-200 dark:border-slate-700 opacity-60">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <div className={`h-8 w-8 rounded-lg ${eventType.bg} flex items-center justify-center text-sm`}>
                                {eventType.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-xs truncate">{event.title}</h3>
                                <p className="text-[10px] text-slate-500">
                                  {format(new Date(event.date), "dd/MM/yyyy")}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <Card className="border border-slate-200 dark:border-slate-700">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-3">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <h3 className="text-sm font-semibold capitalize">
                  {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                </h3>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
              
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
                        "min-h-[50px] p-1 rounded-md transition-colors",
                        !isCurrentMonth && "opacity-30",
                        isToday(day) && "bg-emerald-50 dark:bg-emerald-950 ring-1 ring-emerald-500"
                      )}
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
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
