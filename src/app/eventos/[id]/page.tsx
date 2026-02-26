'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { 
  ArrowLeft, CalendarIcon, Clock, MapPin, Users, Music, CheckCircle, 
  XCircle, AlertCircle, Send, Edit, Trash2, Loader2, Bell, Church
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuthStore } from '@/store/auth'
import { AppLayout } from '@/components/layout/app-layout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

const eventTypeLabels: Record<string, string> = {
  SABBATH_SCHOOL: 'Escola Sabatina',
  DIVINE_SERVICE: 'Culto Divino',
  SABBATH_AFTERNOON: 'Sábado à Tarde',
  WEDNESDAY_SERVICE: 'Culto de Quarta',
  SPECIAL_EVENT: 'Evento Especial',
  REHEARSAL: 'Ensaio',
  OTHER: 'Outro',
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

const invitationStatusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-emerald-100 text-emerald-800',
  DECLINED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
}

const invitationStatusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  DECLINED: 'Recusado',
  CANCELLED: 'Cancelado',
}

export default function EventoDetalhesPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const isDirector = user?.role === 'DIRECTOR' || user?.role === 'ADMIN'
  
  const [showCancelDialog, setShowCancelDialog] = React.useState(false)
  const [cancelReason, setCancelReason] = React.useState('')

  // Buscar evento da API
  const { data: eventData, isLoading, error } = useQuery({
    queryKey: ['event', params.id],
    queryFn: async () => {
      const res = await fetch(`/api/events/${params.id}`)
      if (!res.ok) throw new Error('Evento não encontrado')
      return res.json()
    },
  })

  const event = eventData?.event

  // Buscar convites do evento
  const { data: invitationsData } = useQuery({
    queryKey: ['invitations', params.id],
    queryFn: async () => {
      const res = await fetch(`/api/events/${params.id}/invitations`)
      if (!res.ok) return { invitations: [] }
      return res.json()
    },
    enabled: !!params.id,
  })

  const invitations = invitationsData?.invitations || []

  // Check if current user is invited
  const userInvitation = invitations.find((inv: any) => inv.userId === user?.id)

  const confirmed = invitations.filter((i: any) => i.status === 'CONFIRMED').length
  const pending = invitations.filter((i: any) => i.status === 'PENDING').length
  const declined = invitations.filter((i: any) => i.status === 'DECLINED').length
  const total = invitations.length

  // Mutation para responder convite
  const respondMutation = useMutation({
    mutationFn: async (data: { status: string; cancelReason?: string }) => {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'respond',
          invitationId: userInvitation?.id,
          status: data.status,
          cancelReason: data.cancelReason,
        }),
      })
      if (!res.ok) throw new Error('Erro ao responder')
      return res.json()
    },
    onSuccess: () => {
      toast({ title: 'Resposta enviada!', description: 'Sua resposta foi registrada.' })
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
      setShowCancelDialog(false)
      setCancelReason('')
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível enviar sua resposta.', variant: 'destructive' })
    },
  })

  const handleConfirm = () => {
    respondMutation.mutate({ status: 'CONFIRMED' })
  }

  const handleDecline = () => {
    respondMutation.mutate({ status: 'DECLINED', cancelReason })
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    )
  }

  if (error || !event) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Evento não encontrado</h2>
          <p className="text-muted-foreground mb-4">O evento que você está procurando não existe ou foi removido.</p>
          <Button onClick={() => router.push('/eventos')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Eventos
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">{event.title}</h1>
                <Badge className={eventTypeLabels[event.type] ? 'bg-emerald-100 text-emerald-800' : ''}>
                  {eventTypeLabels[event.type]}
                </Badge>
                <Badge className={statusColors[event.status]}>
                  {statusLabels[event.status]}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">
                Criado por {event.createdBy?.name || 'Desconhecido'}
              </p>
            </div>
          </div>

          {isDirector && (
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href={`/eventos/${params.id}/editar`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Link>
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Informações do Evento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <CalendarIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Data</p>
                      <p className="font-medium">
                        {format(new Date(event.date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Horário</p>
                      <p className="font-medium">
                        {format(new Date(event.date), 'HH:mm')}
                        {event.endTime && ` - ${format(new Date(event.endTime), 'HH:mm')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Local</p>
                      <p className="font-medium">{event.location || event.church?.name || 'A definir'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Church className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Igreja</p>
                      <p className="font-medium">{event.church?.name || 'Não definida'}</p>
                    </div>
                  </div>
                </div>

                {event.description && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Descrição</p>
                      <p>{event.description}</p>
                    </div>
                  </>
                )}

                {event.notes && (
                  <>
                    <Separator className="my-4" />
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm font-medium text-amber-800 mb-1">Observações</p>
                      <p className="text-sm text-amber-700">{event.notes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Scale */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Escala
                    </CardTitle>
                    <CardDescription>Músicos convocados para este evento</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Confirmações</span>
                    <span className="text-muted-foreground">{confirmed}/{total || 1}</span>
                  </div>
                  <div className="h-3 rounded-full bg-gray-200 overflow-hidden flex">
                    <div
                      className="bg-emerald-500"
                      style={{ width: `${total > 0 ? (confirmed / total) * 100 : 0}%` }}
                    />
                    <div
                      className="bg-red-400"
                      style={{ width: `${total > 0 ? (declined / total) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex gap-4 mt-2 text-xs">
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      {confirmed} Confirmados
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      {pending} Pendentes
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      {declined} Recusados
                    </span>
                  </div>
                </div>

                {invitations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum músico convocado ainda</p>
                  </div>
                ) : (
                  <Tabs defaultValue="all">
                    <TabsList>
                      <TabsTrigger value="all">Todos ({total})</TabsTrigger>
                      <TabsTrigger value="confirmed">Confirmados ({confirmed})</TabsTrigger>
                      <TabsTrigger value="pending">Pendentes ({pending})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="mt-4">
                      <div className="space-y-3">
                        {invitations.map((invitation: any) => (
                          <div
                            key={invitation.id}
                            className="flex items-center justify-between p-3 rounded-lg border"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={invitation.user?.avatar} />
                                <AvatarFallback>
                                  {invitation.user?.name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{invitation.user?.name || 'Músico'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {invitation.instrument || invitation.vocalPart || invitation.role}
                                </p>
                              </div>
                            </div>
                            <Badge className={invitationStatusColors[invitation.status]}>
                              {invitationStatusLabels[invitation.status]}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="confirmed" className="mt-4">
                      <div className="space-y-3">
                        {invitations
                          .filter((i: any) => i.status === 'CONFIRMED')
                          .map((invitation: any) => (
                            <div
                              key={invitation.id}
                              className="flex items-center justify-between p-3 rounded-lg border"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarFallback>
                                    {invitation.user?.name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">{invitation.user?.name || 'Músico'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {invitation.instrument || invitation.vocalPart || invitation.role}
                                  </p>
                                </div>
                              </div>
                              <Badge className="bg-emerald-100 text-emerald-800">Confirmado</Badge>
                            </div>
                          ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="pending" className="mt-4">
                      <div className="space-y-3">
                        {invitations
                          .filter((i: any) => i.status === 'PENDING')
                          .map((invitation: any) => (
                            <div
                              key={invitation.id}
                              className="flex items-center justify-between p-3 rounded-lg border"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarFallback>
                                    {invitation.user?.name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">{invitation.user?.name || 'Músico'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {invitation.instrument || invitation.vocalPart || invitation.role}
                                  </p>
                                </div>
                              </div>
                              <Badge className="bg-amber-100 text-amber-800">Pendente</Badge>
                            </div>
                          ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* User Actions (for musicians) */}
            {!isDirector && userInvitation && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sua Participação</CardTitle>
                  <CardDescription>
                    Você foi convidado como {userInvitation.instrument || userInvitation.vocalPart || userInvitation.role}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Badge className={invitationStatusColors[userInvitation.status]}>
                    {invitationStatusLabels[userInvitation.status]}
                  </Badge>

                  {userInvitation.status === 'PENDING' && (
                    <div className="flex flex-col gap-2">
                      <Button 
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                        onClick={handleConfirm}
                        disabled={respondMutation.isPending}
                      >
                        {respondMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="mr-2 h-4 w-4" />
                        )}
                        Confirmar Presença
                      </Button>
                      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="w-full text-destructive">
                            <XCircle className="mr-2 h-4 w-4" />
                            Recusar Convite
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Recusar Convite</DialogTitle>
                            <DialogDescription>
                              Por favor, informe o motivo da sua recusa (opcional).
                            </DialogDescription>
                          </DialogHeader>
                          <Textarea
                            placeholder="Ex: Tenho outro compromisso..."
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                          />
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                              Cancelar
                            </Button>
                            <Button 
                              variant="destructive" 
                              onClick={handleDecline}
                              disabled={respondMutation.isPending}
                            >
                              {respondMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Recusar
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}

                  {userInvitation.status === 'CONFIRMED' && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <p className="text-sm text-emerald-800">
                        ✓ Você confirmou presença para este evento!
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Estatísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total de músicos</span>
                  <span className="font-medium">{total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Taxa de confirmação</span>
                  <span className="font-medium">{total > 0 ? Math.round((confirmed / total) * 100) : 0}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Aguardando resposta</span>
                  <span className="font-medium text-amber-600">{pending}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
