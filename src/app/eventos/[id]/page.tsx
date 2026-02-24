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
  XCircle, AlertCircle, Send, Edit, Trash2, Loader2, Bell
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuthStore } from '@/store/auth'
import { AppLayout } from '@/components/layout/app-layout'

// Mock event data
const mockEvent = {
  id: '1',
  title: 'Escola Sabatina',
  type: 'SABBATH_SCHOOL',
  date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
  time: '09:00',
  endTime: '10:15',
  location: 'Templo Principal',
  description: 'Programação da Escola Sabatina com louvor especial.',
  notes: 'Chegar 30 minutos antes para ensaio.',
  status: 'PUBLISHED',
  createdBy: {
    id: '1',
    name: 'João Silva',
  },
}

const mockInvitations = [
  { id: '1', userId: '2', name: 'Maria Santos', instrument: 'Violão', role: 'INSTRUMENTALIST', status: 'CONFIRMED', avatar: null },
  { id: '2', userId: '3', name: 'Pedro Lima', instrument: 'Baixo', role: 'INSTRUMENTALIST', status: 'CONFIRMED', avatar: null },
  { id: '3', userId: '4', name: 'Ana Costa', instrument: 'Voz (Soprano)', role: 'SINGER', status: 'PENDING', avatar: null },
  { id: '4', userId: '5', name: 'Lucas Ferreira', instrument: 'Bateria', role: 'INSTRUMENTALIST', status: 'CONFIRMED', avatar: null },
  { id: '5', userId: '6', name: 'Julia Almeida', instrument: 'Violino', role: 'INSTRUMENTALIST', status: 'DECLINED', avatar: null },
  { id: '6', userId: '7', name: 'Carlos Eduardo', instrument: 'Guitarra', role: 'INSTRUMENTALIST', status: 'PENDING', avatar: null },
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
  const isDirector = user?.role === 'DIRECTOR' || user?.role === 'ADMIN'
  
  const [isResponding, setIsResponding] = React.useState(false)
  const [cancelReason, setCancelReason] = React.useState('')
  const [showCancelDialog, setShowCancelDialog] = React.useState(false)

  // Check if current user is invited
  const userInvitation = mockInvitations.find((inv) => inv.userId === user?.id)

  const confirmed = mockInvitations.filter((i) => i.status === 'CONFIRMED').length
  const pending = mockInvitations.filter((i) => i.status === 'PENDING').length
  const declined = mockInvitations.filter((i) => i.status === 'DECLINED').length
  const total = mockInvitations.length

  const handleConfirm = async () => {
    setIsResponding(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsResponding(false)
  }

  const handleDecline = async () => {
    setIsResponding(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsResponding(false)
    setShowCancelDialog(false)
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
                <h1 className="text-2xl font-bold tracking-tight">{mockEvent.title}</h1>
                <Badge className={eventTypeLabels[mockEvent.type] ? 'bg-emerald-100 text-emerald-800' : ''}>
                  {eventTypeLabels[mockEvent.type]}
                </Badge>
                <Badge className={statusColors[mockEvent.status]}>
                  {statusLabels[mockEvent.status]}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">
                Criado por {mockEvent.createdBy.name}
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
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
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
                        {format(mockEvent.date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
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
                        {mockEvent.time} - {mockEvent.endTime}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Local</p>
                      <p className="font-medium">{mockEvent.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Music className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Músicos</p>
                      <p className="font-medium">{confirmed}/{total} confirmados</p>
                    </div>
                  </div>
                </div>

                {mockEvent.description && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Descrição</p>
                      <p>{mockEvent.description}</p>
                    </div>
                  </>
                )}

                {mockEvent.notes && (
                  <>
                    <Separator className="my-4" />
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm font-medium text-amber-800 mb-1">Observações</p>
                      <p className="text-sm text-amber-700">{mockEvent.notes}</p>
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
                  {isDirector && (
                    <Button variant="outline" size="sm">
                      <Send className="mr-2 h-4 w-4" />
                      Reenviar Convites
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Confirmações</span>
                    <span className="text-muted-foreground">{confirmed}/{total}</span>
                  </div>
                  <div className="h-3 rounded-full bg-gray-200 overflow-hidden flex">
                    <div
                      className="bg-emerald-500"
                      style={{ width: `${(confirmed / total) * 100}%` }}
                    />
                    <div
                      className="bg-red-400"
                      style={{ width: `${(declined / total) * 100}%` }}
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

                <Tabs defaultValue="all">
                  <TabsList>
                    <TabsTrigger value="all">Todos ({total})</TabsTrigger>
                    <TabsTrigger value="confirmed">Confirmados ({confirmed})</TabsTrigger>
                    <TabsTrigger value="pending">Pendentes ({pending})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="mt-4">
                    <div className="space-y-3">
                      {mockInvitations.map((invitation) => (
                        <div
                          key={invitation.id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {invitation.name.split(' ').map((n) => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{invitation.name}</p>
                              <p className="text-xs text-muted-foreground">{invitation.instrument}</p>
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
                      {mockInvitations
                        .filter((i) => i.status === 'CONFIRMED')
                        .map((invitation) => (
                          <div
                            key={invitation.id}
                            className="flex items-center justify-between p-3 rounded-lg border"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>
                                  {invitation.name.split(' ').map((n) => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{invitation.name}</p>
                                <p className="text-xs text-muted-foreground">{invitation.instrument}</p>
                              </div>
                            </div>
                            <Badge className="bg-emerald-100 text-emerald-800">Confirmado</Badge>
                          </div>
                        ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="pending" className="mt-4">
                    <div className="space-y-3">
                      {mockInvitations
                        .filter((i) => i.status === 'PENDING')
                        .map((invitation) => (
                          <div
                            key={invitation.id}
                            className="flex items-center justify-between p-3 rounded-lg border"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>
                                  {invitation.name.split(' ').map((n) => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{invitation.name}</p>
                                <p className="text-xs text-muted-foreground">{invitation.instrument}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isDirector && (
                                <>
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-emerald-600">
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive">
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              <Badge className="bg-amber-100 text-amber-800">Pendente</Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  </TabsContent>
                </Tabs>
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
                    Você foi convidado como {userInvitation.instrument}
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
                        disabled={isResponding}
                      >
                        {isResponding ? (
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
                            <Button variant="destructive" onClick={handleDecline}>
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
                  <span className="font-medium">{Math.round((confirmed / total) * 100)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Aguardando resposta</span>
                  <span className="font-medium text-amber-600">{pending}</span>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            {isDirector && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Notificações
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Lembrete
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Bell className="mr-2 h-4 w-4" />
                    Notificar Pendentes
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
