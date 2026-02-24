'use client'

import * as React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Calendar as CalendarIcon, Clock, CheckCircle, AlertCircle, XCircle, List, Grid, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { AppLayout } from '@/components/layout/app-layout'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Mock events data
const mockEvents = [
  {
    id: '1',
    title: 'Escola Sabatina',
    type: 'SABBATH_SCHOOL',
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    time: '09:00',
    status: 'PUBLISHED',
    confirmed: 4,
    pending: 2,
    total: 6,
  },
  {
    id: '2',
    title: 'Culto Divino',
    type: 'DIVINE_SERVICE',
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    time: '10:30',
    status: 'PUBLISHED',
    confirmed: 5,
    pending: 1,
    total: 6,
  },
  {
    id: '3',
    title: 'Culto de Quarta',
    type: 'WEDNESDAY_SERVICE',
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    time: '19:30',
    status: 'DRAFT',
    confirmed: 3,
    pending: 3,
    total: 6,
  },
  {
    id: '4',
    title: 'Ensaio Geral',
    type: 'REHEARSAL',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    time: '15:00',
    status: 'PUBLISHED',
    confirmed: 8,
    pending: 0,
    total: 8,
  },
  {
    id: '5',
    title: 'Sábado à Tarde',
    type: 'SABBATH_AFTERNOON',
    date: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
    time: '16:00',
    status: 'DRAFT',
    confirmed: 2,
    pending: 4,
    total: 6,
  },
]

const eventTypeLabels: Record<string, string> = {
  SABBATH_SCHOOL: 'Escola Sabatina',
  DIVINE_SERVICE: 'Culto Divino',
  SABBATH_AFTERNOON: 'Sábado à Tarde',
  WEDNESDAY_SERVICE: 'Culto de Quarta',
  SPECIAL_EVENT: 'Evento Especial',
  REHEARSAL: 'Ensaio',
  OTHER: 'Outro',
}

const eventTypeColors: Record<string, string> = {
  SABBATH_SCHOOL: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  DIVINE_SERVICE: 'bg-blue-100 text-blue-800 border-blue-200',
  SABBATH_AFTERNOON: 'bg-amber-100 text-amber-800 border-amber-200',
  WEDNESDAY_SERVICE: 'bg-purple-100 text-purple-800 border-purple-200',
  SPECIAL_EVENT: 'bg-rose-100 text-rose-800 border-rose-200',
  REHEARSAL: 'bg-gray-100 text-gray-800 border-gray-200',
  OTHER: 'bg-gray-100 text-gray-800 border-gray-200',
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PUBLISHED: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-emerald-100 text-emerald-800',
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  DRAFT: 'Rascunho',
  PUBLISHED: 'Publicado',
  CONFIRMED: 'Confirmado',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
}

export default function EventosPage() {
  const { user } = useAuthStore()
  const isDirector = user?.role === 'DIRECTOR' || user?.role === 'ADMIN'
  const [viewMode, setViewMode] = React.useState<'list' | 'calendar'>('list')
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date())
  const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date())
  const [filterType, setFilterType] = React.useState<string>('all')
  const [filterStatus, setFilterStatus] = React.useState<string>('all')

  const filteredEvents = mockEvents.filter((event) => {
    if (filterType !== 'all' && event.type !== filterType) return false
    if (filterStatus !== 'all' && event.status !== filterStatus) return false
    return true
  })

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const getEventsForDay = (date: Date) => {
    return mockEvents.filter((event) => isSameDay(event.date, date))
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Eventos</h1>
            <p className="text-muted-foreground">
              Gerencie as escalas e eventos da sua igreja.
            </p>
          </div>
          {isDirector && (
            <Button asChild>
              <Link href="/eventos/novo">
                <Plus className="mr-2 h-4 w-4" />
                Novo Evento
              </Link>
            </Button>
          )}
        </div>

        {/* Filters and View Toggle */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="SABBATH_SCHOOL">Escola Sabatina</SelectItem>
                <SelectItem value="DIVINE_SERVICE">Culto Divino</SelectItem>
                <SelectItem value="SABBATH_AFTERNOON">Sábado à Tarde</SelectItem>
                <SelectItem value="WEDNESDAY_SERVICE">Culto de Quarta</SelectItem>
                <SelectItem value="REHEARSAL">Ensaio</SelectItem>
                <SelectItem value="SPECIAL_EVENT">Evento Especial</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="DRAFT">Rascunho</SelectItem>
                <SelectItem value="PUBLISHED">Publicado</SelectItem>
                <SelectItem value="CONFIRMED">Confirmado</SelectItem>
                <SelectItem value="COMPLETED">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4 mr-2" />
              Lista
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
            >
              <Grid className="h-4 w-4 mr-2" />
              Calendário
            </Button>
          </div>
        </div>

        {/* Content */}
        {viewMode === 'list' ? (
          <div className="space-y-4">
            {filteredEvents.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CalendarIcon className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-lg font-medium">Nenhum evento encontrado</p>
                  <p className="text-muted-foreground">
                    Tente ajustar os filtros ou crie um novo evento.
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredEvents.map((event) => (
                <Link key={event.id} href={`/eventos/${event.id}`}>
                  <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-lg">{event.title}</h3>
                            <Badge className={eventTypeColors[event.type]}>
                              {eventTypeLabels[event.type]}
                            </Badge>
                            <Badge className={statusColors[event.status]}>
                              {statusLabels[event.status]}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="h-4 w-4" />
                              {format(event.date, "EEEE, d 'de' MMMM", { locale: ptBR })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {event.time}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-3 text-sm">
                            <span className="flex items-center gap-1 text-emerald-600">
                              <CheckCircle className="h-4 w-4" />
                              {event.confirmed}
                            </span>
                            <span className="flex items-center gap-1 text-amber-600">
                              <AlertCircle className="h-4 w-4" />
                              {event.pending}
                            </span>
                          </div>
                          <div className="w-24">
                            <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                              <div
                                className="h-full bg-emerald-500"
                                style={{
                                  width: `${(event.confirmed / event.total) * 100}%`,
                                }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 text-center">
                              {event.confirmed}/{event.total} confirmados
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Calendar */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                    <div
                      key={day}
                      className="text-center text-sm font-medium text-muted-foreground py-2"
                    >
                      {day}
                    </div>
                  ))}
                  {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ))}
                  {days.map((day) => {
                    const dayEvents = getEventsForDay(day)
                    const isSelected = isSameDay(day, selectedDate)
                    const isCurrentDay = isToday(day)

                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                        className={`aspect-square p-1 rounded-lg text-sm relative transition-colors
                          ${isSelected ? 'bg-primary text-primary-foreground' : ''}
                          ${isCurrentDay && !isSelected ? 'ring-2 ring-primary' : ''}
                          ${!isSelected && !isCurrentDay ? 'hover:bg-accent' : ''}
                        `}
                      >
                        <span className="block">{format(day, 'd')}</span>
                        {dayEvents.length > 0 && (
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                            {dayEvents.slice(0, 3).map((_, i) => (
                              <div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isSelected ? 'bg-primary-foreground' : 'bg-primary'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Selected Day Events */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
                </CardTitle>
                <CardDescription>
                  {getEventsForDay(selectedDate).length === 0
                    ? 'Nenhum evento neste dia'
                    : `${getEventsForDay(selectedDate).length} evento(s)`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getEventsForDay(selectedDate).map((event) => (
                    <Link
                      key={event.id}
                      href={`/eventos/${event.id}`}
                      className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            event.status === 'PUBLISHED' ? 'bg-blue-500' : 'bg-gray-400'
                          }`}
                        />
                        <span className="font-medium text-sm">{event.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{event.time}</p>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
