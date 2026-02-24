'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
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
  CheckCircle, AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuthStore } from '@/store/auth'
import { AppLayout } from '@/components/layout/app-layout'

const eventTypes = [
  { value: 'SABBATH_SCHOOL', label: 'Escola Sabatina' },
  { value: 'DIVINE_SERVICE', label: 'Culto Divino' },
  { value: 'SABBATH_AFTERNOON', label: 'Sábado à Tarde' },
  { value: 'WEDNESDAY_SERVICE', label: 'Culto de Quarta' },
  { value: 'REHEARSAL', label: 'Ensaio' },
  { value: 'SPECIAL_EVENT', label: 'Evento Especial' },
  { value: 'OTHER', label: 'Outro' },
]

const mockMusicians = [
  { id: '1', name: 'Maria Santos', instruments: ['violao', 'piano'], avatar: null, available: true },
  { id: '2', name: 'Pedro Lima', instruments: ['baixo', 'guitarra'], avatar: null, available: true },
  { id: '3', name: 'Ana Costa', instruments: ['voz'], avatar: null, available: false },
  { id: '4', name: 'Lucas Ferreira', instruments: ['bateria'], avatar: null, available: true },
  { id: '5', name: 'Julia Almeida', instruments: ['violino', 'flauta'], avatar: null, available: true },
  { id: '6', name: 'Carlos Eduardo', instruments: ['guitarra', 'violao'], avatar: null, available: true },
  { id: '7', name: 'Fernanda Reis', instruments: ['voz'], avatar: null, available: true },
  { id: '8', name: 'Ricardo Souza', instruments: ['saxofone'], avatar: null, available: false },
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

  const handleGenerateScale = async () => {
    setIsGenerating(true)
    // Simulate AI generation
    await new Promise((resolve) => setTimeout(resolve, 2000))
    
    // Select random available musicians
    const availableMusicians = mockMusicians.filter((m) => m.available)
    const randomSelection = availableMusicians
      .sort(() => Math.random() - 0.5)
      .slice(0, 5)
      .map((m) => m.id)
    
    setSelectedMusicians(randomSelection)
    setIsGenerating(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Redirect to events list
    router.push('/eventos')
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
                      disabled={isGenerating}
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
                  <div className="grid gap-3 sm:grid-cols-2">
                    {mockMusicians.map((musician) => (
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
                          <AvatarFallback>
                            {musician.name.split(' ').map((n) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{musician.name}</p>
                            {!musician.available && (
                              <Badge variant="secondary" className="text-xs">
                                Indisponível
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-1 mt-1">
                            {musician.instruments.slice(0, 2).map((inst) => (
                              <Badge key={inst} variant="outline" className="text-xs">
                                {instrumentLabels[inst]}
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
