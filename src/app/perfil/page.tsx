'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { 
  User, Mail, Phone, Camera, Save, Loader2, Music, Calendar, 
  CheckCircle, XCircle, Clock
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { AppLayout } from '@/components/layout/app-layout'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const instruments = [
  { id: 'violao', label: 'Violão' },
  { id: 'guitarra', label: 'Guitarra' },
  { id: 'baixo', label: 'Baixo' },
  { id: 'piano', label: 'Piano/Teclado' },
  { id: 'bateria', label: 'Bateria' },
  { id: 'saxofone', label: 'Saxofone' },
  { id: 'violino', label: 'Violino' },
  { id: 'flauta', label: 'Flauta' },
]

const vocalParts = [
  { id: 'soprano', label: 'Soprano' },
  { id: 'contralto', label: 'Contralto' },
  { id: 'tenor', label: 'Tenor' },
  { id: 'baritono', label: 'Barítono' },
  { id: 'baixo', label: 'Baixo' },
]

const weekDays = [
  { id: 'domingo', label: 'Domingo', short: 'Dom' },
  { id: 'segunda', label: 'Segunda', short: 'Seg' },
  { id: 'terca', label: 'Terça', short: 'Ter' },
  { id: 'quarta', label: 'Quarta', short: 'Qua' },
  { id: 'quinta', label: 'Quinta', short: 'Qui' },
  { id: 'sexta', label: 'Sexta', short: 'Sex' },
  { id: 'sabado', label: 'Sábado', short: 'Sáb' },
]

const timeSlots = [
  { id: 'manha', label: 'Manhã' },
  { id: 'tarde', label: 'Tarde' },
  { id: 'noite', label: 'Noite' },
]

// Mock participation history
const participationHistory = [
  { id: '1', event: 'Escola Sabatina', date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), status: 'CONFIRMED', instrument: 'Violão' },
  { id: '2', event: 'Culto Divino', date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), status: 'CONFIRMED', instrument: 'Guitarra' },
  { id: '3', event: 'Culto de Quarta', date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), status: 'CONFIRMED', instrument: 'Violão' },
  { id: '4', event: 'Escola Sabatina', date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), status: 'CANCELLED', instrument: 'Piano' },
  { id: '5', event: 'Ensaio Geral', date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), status: 'CONFIRMED', instrument: 'Violão' },
]

export default function PerfilPage() {
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = React.useState(false)
  const [name, setName] = React.useState(user?.name || '')
  const [email, setEmail] = React.useState(user?.email || '')
  const [phone, setPhone] = React.useState(user?.phone || '')
  const [bio, setBio] = React.useState('')
  const [selectedInstruments, setSelectedInstruments] = React.useState<string[]>(user?.instruments || [])
  const [selectedVocals, setSelectedVocals] = React.useState<string[]>(user?.vocals || [])
  const [availability, setAvailability] = React.useState<Record<string, Record<string, boolean>>>({})

  const handleSave = async () => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsLoading(false)
  }

  const toggleAvailability = (day: string, time: string) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [time]: !prev[day]?.[time],
      },
    }))
  }

  const stats = {
    totalEvents: participationHistory.length,
    confirmed: participationHistory.filter((p) => p.status === 'CONFIRMED').length,
    cancelled: participationHistory.filter((p) => p.status === 'CANCELLED').length,
    attendanceRate: Math.round(
      (participationHistory.filter((p) => p.status === 'CONFIRMED').length /
        participationHistory.length) *
        100
    ),
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meu Perfil</h1>
          <p className="text-muted-foreground">
            Gerencie suas informações e disponibilidade.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="info">
              <TabsList>
                <TabsTrigger value="info">Informações</TabsTrigger>
                <TabsTrigger value="availability">Disponibilidade</TabsTrigger>
                <TabsTrigger value="history">Histórico</TabsTrigger>
              </TabsList>

              {/* Info Tab */}
              <TabsContent value="info" className="space-y-6 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Dados Pessoais
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Avatar */}
                    <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback className="text-lg">
                          {user?.name?.split(' ').map((n) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Button variant="outline" size="sm">
                          <Camera className="mr-2 h-4 w-4" />
                          Alterar foto
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">
                          JPG, PNG ou GIF. Máx 2MB.
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome completo</Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">E-mail</Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone / WhatsApp</Label>
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(11) 99999-9999"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Sobre mim</Label>
                      <Textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Conte um pouco sobre você..."
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Music className="h-5 w-5" />
                      Habilidades Musicais
                    </CardTitle>
                    <CardDescription>
                      Selecione os instrumentos que você toca e sua voz.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <Label>Instrumentos</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {instruments.map((instrument) => (
                          <div
                            key={instrument.id}
                            className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedInstruments.includes(instrument.id)
                                ? 'border-primary bg-primary/5'
                                : 'hover:bg-accent'
                            }`}
                            onClick={() => {
                              if (selectedInstruments.includes(instrument.id)) {
                                setSelectedInstruments(
                                  selectedInstruments.filter((i) => i !== instrument.id)
                                )
                              } else {
                                setSelectedInstruments([...selectedInstruments, instrument.id])
                              }
                            }}
                          >
                            <Checkbox
                              checked={selectedInstruments.includes(instrument.id)}
                            />
                            <Label className="cursor-pointer text-sm">{instrument.label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>Voz</Label>
                      <div className="flex flex-wrap gap-2">
                        {vocalParts.map((part) => (
                          <div
                            key={part.id}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                              selectedVocals.includes(part.id)
                                ? 'border-primary bg-primary/5'
                                : 'hover:bg-accent'
                            }`}
                            onClick={() => {
                              if (selectedVocals.includes(part.id)) {
                                setSelectedVocals(
                                  selectedVocals.filter((v) => v !== part.id)
                                )
                              } else {
                                setSelectedVocals([...selectedVocals, part.id])
                              }
                            }}
                          >
                            <Checkbox checked={selectedVocals.includes(part.id)} />
                            <Label className="cursor-pointer text-sm">{part.label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Availability Tab */}
              <TabsContent value="availability" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Disponibilidade Semanal
                    </CardTitle>
                    <CardDescription>
                      Marque os horários em que você geralmente está disponível.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr>
                            <th className="text-left p-2"></th>
                            {timeSlots.map((slot) => (
                              <th key={slot.id} className="text-center p-2 text-sm font-medium">
                                {slot.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {weekDays.map((day) => (
                            <tr key={day.id}>
                              <td className="p-2 font-medium text-sm">{day.short}</td>
                              {timeSlots.map((slot) => (
                                <td key={slot.id} className="p-2 text-center">
                                  <button
                                    onClick={() => toggleAvailability(day.id, slot.id)}
                                    className={`w-10 h-10 rounded-lg border-2 transition-colors ${
                                      availability[day.id]?.[slot.id]
                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                  >
                                    {availability[day.id]?.[slot.id] && (
                                      <CheckCircle className="h-5 w-5 mx-auto" />
                                    )}
                                  </button>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-sm text-muted-foreground mt-4">
                      Clique nas células para marcar sua disponibilidade.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Histórico de Participação
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {participationHistory.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                item.status === 'CONFIRMED' ? 'bg-emerald-500' : 'bg-red-500'
                              }`}
                            />
                            <div>
                              <p className="font-medium text-sm">{item.event}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(item.date, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{item.instrument}</Badge>
                            <Badge
                              className={
                                item.status === 'CONFIRMED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }
                            >
                              {item.status === 'CONFIRMED' ? 'Participou' : 'Cancelou'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Estatísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total de eventos</span>
                  <span className="font-bold text-lg">{stats.totalEvents}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Participações</span>
                  <span className="font-medium text-emerald-600">{stats.confirmed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Cancelamentos</span>
                  <span className="font-medium text-red-600">{stats.cancelled}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Taxa de presença</span>
                  <span className="font-bold text-lg text-emerald-600">{stats.attendanceRate}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Role Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Função</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge
                  className={
                    user?.role === 'DIRECTOR'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                  }
                >
                  {user?.role === 'DIRECTOR'
                    ? 'Diretor de Música'
                    : user?.role === 'SINGER'
                    ? 'Cantor'
                    : user?.role === 'INSTRUMENTALIST'
                    ? 'Instrumentalista'
                    : 'Músico'}
                </Badge>
                <p className="text-sm text-muted-foreground mt-3">
                  {user?.churchName && `Membro da ${user.churchName}`}
                </p>
              </CardContent>
            </Card>

            {/* Save Button */}
            <Card>
              <CardContent className="pt-6">
                <Button className="w-full" onClick={handleSave} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Salvar Alterações
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
