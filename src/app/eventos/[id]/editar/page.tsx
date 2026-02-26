'use client'

import * as React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  CalendarIcon, Users, Music, ArrowLeft, Save, Loader2, Trash2,
  CheckCircle, XCircle, Clock, AlertTriangle, CalendarClock, X
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AppLayout } from '@/components/layout/app-layout'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const eventTypes = [
  { value: 'SABBATH_SCHOOL', label: 'Escola Sabatina' },
  { value: 'DIVINE_SERVICE', label: 'Culto Divino' },
  { value: 'SABBATH_AFTERNOON', label: 'Sábado à Tarde' },
  { value: 'WEDNESDAY_SERVICE', label: 'Culto de Quarta' },
  { value: 'REHEARSAL', label: 'Ensaio' },
  { value: 'SPECIAL_EVENT', label: 'Evento Especial' },
  { value: 'OTHER', label: 'Outro' },
]

export default function EditarEventoPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = params.id as string
  
  const [isLoading, setIsLoading] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [eventType, setEventType] = React.useState('')
  const [date, setDate] = React.useState<Date>()
  const [time, setTime] = React.useState('')
  const [endTime, setEndTime] = React.useState('')
  const [location, setLocation] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [notes, setNotes] = React.useState('')
  
  // Estados para reagendamento
  const [showRescheduleDialog, setShowRescheduleDialog] = React.useState(false)
  const [newDate, setNewDate] = React.useState('')
  const [newTime, setNewTime] = React.useState('')
  const [rescheduleReason, setRescheduleReason] = React.useState('')
  
  // Estados para cancelamento
  const [showCancelDialog, setShowCancelDialog] = React.useState(false)
  const [cancelReason, setCancelReason] = React.useState('')
  const [forgivePenalty, setForgivePenalty] = React.useState(true)

  // Buscar evento
  const { data: eventData, isLoading: isLoadingEvent } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}`)
      if (!res.ok) throw new Error('Erro ao carregar evento')
      return res.json()
    },
  })

  // Preencher formulário quando dados carregarem
  React.useEffect(() => {
    if (eventData?.event) {
      const event = eventData.event
      setTitle(event.title)
      setEventType(event.type)
      setDate(new Date(event.date))
      setTime(format(new Date(event.date), 'HH:mm'))
      if (event.endTime) {
        setEndTime(format(new Date(event.endTime), 'HH:mm'))
      }
      setLocation(event.location || '')
      setDescription(event.description || '')
      setNotes(event.notes || '')
      
      // Pré-preencher reagendamento com dados atuais
      setNewDate(format(new Date(event.date), 'yyyy-MM-dd'))
      setNewTime(format(new Date(event.date), 'HH:mm'))
    }
  }, [eventData])

  const invitations = eventData?.event?.invitations || []
  const confirmedCount = invitations.filter((i: any) => i.status === 'CONFIRMED').length
  const pendingCount = invitations.filter((i: any) => i.status === 'PENDING').length

  // Atualizar evento
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao atualizar evento')
      }
      return res.json()
    },
    onSuccess: (data) => {
      if (data.notificationsSent > 0) {
        toast.success(`Evento atualizado! ${data.notificationsSent} músicos notificados sobre as alterações.`)
      } else {
        toast.success('Evento atualizado com sucesso!')
      }
      router.push('/eventos')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar evento')
    },
  })

  // Reagendar evento
  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/events/${eventId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newDate: `${newDate}T${newTime}:00`,
          reason: rescheduleReason,
        }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao reagendar evento')
      }
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(data.message)
      setShowRescheduleDialog(false)
      router.push('/eventos')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao reagendar evento')
    },
  })

  // Cancelar evento
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const url = new URL(`/api/events/${eventId}`, window.location.origin)
      url.searchParams.set('reason', cancelReason)
      url.searchParams.set('forgivePenalty', forgivePenalty.toString())
      
      const res = await fetch(url.toString(), {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao cancelar evento')
      }
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`Evento cancelado. ${data.cancelledInvitations} músicos notificados.`)
      setShowCancelDialog(false)
      router.push('/eventos')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao cancelar evento')
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title || !eventType || !date || !time) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setIsLoading(true)

    try {
      const dateTime = new Date(date)
      const [hours, minutes] = time.split(':')
      dateTime.setHours(parseInt(hours), parseInt(minutes))

      const endDateTime = endTime ? new Date(date) : null
      if (endDateTime && endTime) {
        const [endHours, endMinutes] = endTime.split(':')
        endDateTime.setHours(parseInt(endHours), parseInt(endMinutes))
      }

      updateMutation.mutate({
        title,
        type: eventType,
        date: dateTime.toISOString(),
        endTime: endDateTime?.toISOString(),
        location,
        description,
        notes,
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingEvent) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Editar Evento</h1>
              <p className="text-muted-foreground">
                Atualize as informações do evento.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {/* Reagendar */}
            <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <CalendarClock className="h-4 w-4 mr-2" />
                  Reagendar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <CalendarClock className="h-5 w-5" />
                    Reagendar Evento
                  </DialogTitle>
                  <DialogDescription>
                    Informe a nova data e horário. Todos os músicos confirmados precisarão reconfirmar presença.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Nova Data</Label>
                      <Input
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Novo Horário</Label>
                      <Input
                        type="time"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Motivo do Reagendamento</Label>
                    <Textarea
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                      placeholder="Ex: Conflito de horário com outro evento..."
                      rows={2}
                    />
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div className="text-sm text-amber-800 dark:text-amber-200">
                        <p className="font-medium">Atenção:</p>
                        <p>{confirmedCount} músicos confirmados receberão notificação para reconfirmar presença na nova data.</p>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowRescheduleDialog(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={() => rescheduleMutation.mutate()}
                    disabled={!newDate || !newTime || rescheduleMutation.isPending}
                  >
                    {rescheduleMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CalendarClock className="h-4 w-4 mr-2" />
                    )}
                    Reagendar Evento
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Cancelar */}
            <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <X className="h-4 w-4 mr-2" />
                  Cancelar Evento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-destructive">
                    <Trash2 className="h-5 w-5" />
                    Cancelar Evento
                  </DialogTitle>
                  <DialogDescription>
                    O evento será marcado como cancelado e todos os músicos serão notificados.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Motivo do Cancelamento</Label>
                    <Textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Ex: O pregador não poderá comparecer..."
                      rows={2}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label className="text-base">Perdoar Penalizações?</Label>
                      <p className="text-sm text-muted-foreground">
                        Se marcado, os músicos não serão penalizados pelo cancelamento.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant={forgivePenalty ? "default" : "outline"}
                      size="sm"
                      onClick={() => setForgivePenalty(!forgivePenalty)}
                    >
                      {forgivePenalty ? "Sim" : "Não"}
                    </Button>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div className="text-sm text-red-800 dark:text-red-200">
                        <p className="font-medium">Esta ação não pode ser desfeita!</p>
                        <p>{invitations.length} convites serão cancelados e os músicos serão notificados.</p>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                    Voltar
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => cancelMutation.mutate()}
                    disabled={cancelMutation.isPending}
                  >
                    {cancelMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Cancelar Evento
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Event Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Detalhes do Evento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="type">Tipo de Evento</Label>
                      <Select value={eventType} onValueChange={setEventType}>
                        <SelectTrigger id="type">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {eventTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="title">Título</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ex: Escola Sabatina"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Data</Label>
                      <Input
                        type="date"
                        value={date ? format(date, 'yyyy-MM-dd') : ''}
                        onChange={(e) => setDate(new Date(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time">Início</Label>
                      <Input
                        id="time"
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endTime">Término</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Local</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Ex: Templo Principal"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Detalhes adicionais sobre o evento..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notas para os músicos..."
                      rows={2}
                    />
                  </div>
                  
                  {/* Aviso sobre notificações */}
                  {(date || time !== format(new Date(eventData?.event?.date || new Date()), 'HH:mm') || location !== (eventData?.event?.location || '')) && (
                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="text-sm text-blue-800 dark:text-blue-200">
                          <p className="font-medium">Notificação automática:</p>
                          <p>Se você alterar data, horário ou local, os {confirmedCount} músicos confirmados serão notificados automaticamente.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Invitations Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Status dos Convites
                  </CardTitle>
                  <CardDescription>
                    Veja quem confirmou presença
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {invitations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum convite enviado</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {invitations.map((inv: any) => (
                        <div
                          key={inv.id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                              <Music className="h-4 w-4" />
                            </div>
                            <span className="font-medium">{inv.user?.name}</span>
                          </div>
                          <Badge
                            className={
                              inv.status === 'CONFIRMED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : inv.status === 'DECLINED'
                                ? 'bg-red-100 text-red-800'
                                : inv.status === 'CANCELLED'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }
                          >
                            {inv.status === 'CONFIRMED' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {inv.status === 'DECLINED' && <XCircle className="h-3 w-3 mr-1" />}
                            {inv.status === 'PENDING' && '⏳'}
                            {inv.status === 'CONFIRMED' ? 'Confirmado' : 
                             inv.status === 'DECLINED' ? 'Recusado' : 
                             inv.status === 'CANCELLED' ? 'Cancelado' : 'Pendente'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resumo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Tipo</span>
                    <span className="text-sm font-medium">
                      {eventTypes.find((t) => t.value === eventType)?.label || '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Data</span>
                    <span className="text-sm font-medium">
                      {date ? format(date, 'dd/MM/yyyy') : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Horário</span>
                    <span className="text-sm font-medium">
                      {time || '-'} {endTime ? `- ${endTime}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Confirmados</span>
                    <span className="text-sm font-medium text-emerald-600">{confirmedCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pendentes</span>
                    <span className="text-sm font-medium text-yellow-600">{pendingCount}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Salvar Alterações
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => router.back()}
                  >
                    Cancelar
                  </Button>
                </CardContent>
              </Card>
              
              {/* Quick Actions Info */}
              <Card className="bg-slate-50 dark:bg-slate-900">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Ações Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-2">
                  <p><strong>Reagendar:</strong> Muda a data e solicita reconfirmação dos músicos.</p>
                  <p><strong>Cancelar:</strong> Cancela o evento e notifica todos os envolvidos.</p>
                  <p><strong>Editar:</strong> Altera detalhes. Músicos são notificados se data/hora/local mudarem.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
