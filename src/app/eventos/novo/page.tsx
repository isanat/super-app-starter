'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { 
  CalendarIcon, Clock, Users, Music, Wand2, ArrowLeft, Save, Loader2,
  CheckCircle, AlertCircle, Church
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuthStore } from '@/store/auth'
import { AppLayout } from '@/components/layout/app-layout'
import { toast } from 'sonner'

const eventTypes = [
  { value: 'SABBATH_SCHOOL', label: 'Escola Sabatina' },
  { value: 'DIVINE_SERVICE', label: 'Culto Divino' },
  { value: 'SABBATH_AFTERNOON', label: 'Sábado à Tarde' },
  { value: 'WEDNESDAY_SERVICE', label: 'Culto de Quarta' },
  { value: 'REHEARSAL', label: 'Ensaio' },
  { value: 'SPECIAL_EVENT', label: 'Evento Especial' },
  { value: 'OTHER', label: 'Outro' },
]

const instrumentLabels: Record<string, string> = {
  violao: 'Violão',
  guitarra: 'Guitarra',
  baixo: 'Baixo',
  piano: 'Piano/Teclado',
  bateria: 'Bateria',
  saxofone: 'Saxofone',
  violino: 'Violino',
  flauta: 'Flauta',
  voz: 'Voz',
}

interface Musician {
  id: string
  name: string
  instruments: string[]
  avatar: string | null
  available: boolean
}

export default function NovoEventoPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = React.useState(false)
  const [isGenerating, setIsGenerating] = React.useState(false)
  
  // Form state
  const [title, setTitle] = React.useState('')
  const [eventType, setEventType] = React.useState('')
  const [date, setDate] = React.useState<Date>()
  const [time, setTime] = React.useState('')
  const [endTime, setEndTime] = React.useState('')
  const [location, setLocation] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [sendInvites, setSendInvites] = React.useState(true)
  const [selectedMusicians, setSelectedMusicians] = React.useState<string[]>([])
  const [musicians, setMusicians] = React.useState<Musician[]>([])

  // Buscar dados da igreja
  const { data: churchData } = useQuery({
    queryKey: ['church'],
    queryFn: async () => {
      const res = await fetch('/api/church')
      if (!res.ok) throw new Error('Erro ao carregar igreja')
      return res.json()
    },
  })

  // Buscar músicos da igreja
  const { data: musiciansData, isLoading: isLoadingMusicians } = useQuery({
    queryKey: ['musicians'],
    queryFn: async () => {
      const res = await fetch('/api/users?role=MUSICIAN')
      if (!res.ok) throw new Error('Erro ao carregar músicos')
      return res.json()
    },
  })

  // Preencher local automaticamente com a igreja do diretor
  React.useEffect(() => {
    if (churchData?.church?.name && !location) {
      setLocation(churchData.church.name)
    }
  }, [churchData?.church?.name])

  // Atualizar lista de músicos quando dados carregarem
  React.useEffect(() => {
    if (musiciansData?.users) {
      const formattedMusicians = musiciansData.users.map((u: any) => ({
        id: u.id,
        name: u.name,
        instruments: u.musicianProfile?.instruments || [],
        avatar: u.avatar,
        available: !u.isBlocked,
      }))
      setMusicians(formattedMusicians)
    }
  }, [musiciansData])

  // Auto-fill based on event type
  React.useEffect(() => {
    if (eventType) {
      const type = eventTypes.find((t) => t.value === eventType)
      if (type) {
        setTitle(type.label)
      }
      // Set default times based on event type
      switch (eventType) {
        case 'SABBATH_SCHOOL':
          setTime('09:00')
          setEndTime('10:15')
          break
        case 'DIVINE_SERVICE':
          setTime('10:30')
          setEndTime('12:00')
          break
        case 'SABBATH_AFTERNOON':
          setTime('16:00')
          setEndTime('17:30')
          break
        case 'WEDNESDAY_SERVICE':
          setTime('19:30')
          setEndTime('21:00')
          break
        default:
          setTime('')
          setEndTime('')
      }
    }
  }, [eventType])

  // Gerar escala automática via API
  const handleGenerateScale = async () => {
    if (!date || !time || !eventType) {
      toast.error('Preencha data, horário e tipo de evento primeiro')
      return
    }

    setIsGenerating(true)
    try {
      const dateTime = new Date(date)
      const [hours, minutes] = time.split(':')
      dateTime.setHours(parseInt(hours), parseInt(minutes))

      const res = await fetch(`/api/events/suggest-musicians?dateTime=${dateTime.toISOString()}&eventType=${eventType}`)
      const data = await res.json()

      if (data.suggestions) {
        setSelectedMusicians(data.suggestions.map((s: any) => s.userId))
        toast.success(`${data.suggestions.length} músicos sugeridos!`)
      }
    } catch (error) {
      console.error('Erro ao gerar escala:', error)
      toast.error('Erro ao gerar escala automática')
    } finally {
      setIsGenerating(false)
    }
  }

  // Salvar evento via API
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title || !eventType || !date || !time) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setIsLoading(true)

    try {
      // Combinar data e hora
      const dateTime = new Date(date)
      const [hours, minutes] = time.split(':')
      dateTime.setHours(parseInt(hours), parseInt(minutes))

      const endDateTime = endTime ? new Date(date) : null
      if (endDateTime && endTime) {
        const [endHours, endMinutes] = endTime.split(':')
        endDateTime.setHours(parseInt(endHours), parseInt(endMinutes))
      }

      // Criar evento
      const eventRes = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          type: eventType,
          date: dateTime.toISOString(),
          endDate: endDateTime?.toISOString(),
          location,
          description,
          notes,
        }),
      })

      if (!eventRes.ok) {
        const error = await eventRes.json()
        throw new Error(error.error || 'Erro ao criar evento')
      }

      const eventData = await eventRes.json()
      const eventId = eventData.event.id

      // Enviar convites se houver músicos selecionados
      if (selectedMusicians.length > 0 && sendInvites) {
        const invitations = selectedMusicians.map(userId => ({
          userId,
          role: 'MUSICIAN',
        }))

        const inviteRes = await fetch(`/api/events/${eventId}/invitations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invitations }),
        })

        if (!inviteRes.ok) {
          console.error('Erro ao enviar convites')
        }
      }

      toast.success('Evento criado com sucesso!')
      router.push('/eventos')
    } catch (error: any) {
      console.error('Erro ao criar evento:', error)
      toast.error(error.message || 'Erro ao criar evento')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Novo Evento</h1>
            <p className="text-muted-foreground">
              Crie um novo evento e monte a escala de músicos.
            </p>
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
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "d 'de' MMMM", { locale: ptBR }) : 'Selecionar'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
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
                    <Label className="flex items-center gap-2">
                      <Church className="h-4 w-4" />
                      Local (Sua Igreja)
                    </Label>
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                      <Church className="h-5 w-5 text-emerald-600" />
                      <div>
                        <p className="font-medium text-emerald-700 dark:text-emerald-300">
                          {location || churchData?.church?.name || "Carregando..."}
                        </p>
                        {churchData?.church?.city && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">
                            {churchData.church.city}, {churchData.church.state}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Os eventos são criados automaticamente para sua igreja
                    </p>
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
                </CardContent>
              </Card>

              {/* Musicians Selection */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Escala de Músicos
                      </CardTitle>
                      <CardDescription>
                        Selecione os músicos para este evento
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGenerateScale}
                      disabled={isGenerating || !date || !time}
                    >
                      {isGenerating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Wand2 className="mr-2 h-4 w-4" />
                      )}
                      Gerar Escala Automática
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingMusicians ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : musicians.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Music className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum músico cadastrado</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {musicians.map((musician) => (
                        <div
                          key={musician.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                            selectedMusicians.includes(musician.id)
                              ? 'border-primary bg-primary/5'
                              : 'hover:bg-accent'
                          } ${!musician.available ? 'opacity-50' : ''}`}
                          onClick={() => {
                            if (!musician.available) return
                            if (selectedMusicians.includes(musician.id)) {
                              setSelectedMusicians(
                                selectedMusicians.filter((id) => id !== musician.id)
                              )
                            } else {
                              setSelectedMusicians([...selectedMusicians, musician.id])
                            }
                          }}
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={musician.avatar || undefined} />
                            <AvatarFallback>
                              {musician.name.split(' ').map((n) => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">{musician.name}</p>
                              {!musician.available && (
                                <Badge variant="secondary" className="text-xs">
                                  Bloqueado
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-1 mt-1">
                              {musician.instruments?.slice(0, 2).map((inst: string) => (
                                <Badge key={inst} variant="outline" className="text-xs">
                                  {instrumentLabels[inst] || inst}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Checkbox
                            checked={selectedMusicians.includes(musician.id)}
                            disabled={!musician.available}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    {selectedMusicians.length} músicos selecionados
                  </div>
                </CardFooter>
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
                    <span className="text-sm text-muted-foreground">Músicos</span>
                    <span className="text-sm font-medium">{selectedMusicians.length}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Options */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Opções</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="invites">Enviar convites</Label>
                      <p className="text-xs text-muted-foreground">
                        Enviar notificação aos músicos selecionados
                      </p>
                    </div>
                    <Switch
                      id="invites"
                      checked={sendInvites}
                      onCheckedChange={setSendInvites}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Salvar Evento
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
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
