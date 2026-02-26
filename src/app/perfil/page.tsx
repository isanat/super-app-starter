'use client'

import * as React from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
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
  CheckCircle, XCircle, Clock, Church, Users, Settings, Edit,
  MapPin, Mail as MailIcon, Phone as PhoneIcon, Share2, Copy,
  TrendingUp, CalendarDays
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { AppLayout } from '@/components/layout/app-layout'
import { GamificationCard } from '@/components/gamification/gamification-card'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

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

const availabilitySlots = [
  { id: 'sabado_manha', label: 'Sábado Manhã', description: 'Escola Sabatina / Culto Divino' },
  { id: 'sabado_tarde', label: 'Sábado Tarde', description: 'Sábado à Tarde' },
  { id: 'sabado_noite', label: 'Sábado Noite', description: 'Desprograma / Culto Jovem' },
  { id: 'quarta_tarde', label: 'Quarta Tarde', description: 'Culto de Quarta (tarde)' },
  { id: 'quarta_noite', label: 'Quarta Noite', description: 'Culto de Quarta (noite)' },
  { id: 'outros', label: 'Outros', description: 'Ensaio, eventos especiais, etc.' },
]

export default function PerfilPage() {
  const { user } = useAuthStore()
  const isDirector = user?.role === 'DIRECTOR'
  
  const [isLoading, setIsLoading] = React.useState(false)
  const [name, setName] = React.useState(user?.name || '')
  const [phone, setPhone] = React.useState(user?.phone || '')
  const [bio, setBio] = React.useState('')
  const [selectedInstruments, setSelectedInstruments] = React.useState<string[]>([])
  const [selectedVocals, setSelectedVocals] = React.useState<string[]>([])
  const [availability, setAvailability] = React.useState<Record<string, boolean>>({})
  const [copied, setCopied] = React.useState(false)

  // Buscar dados do perfil
  const { data: profileData, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await fetch('/api/users/me')
      if (!res.ok) throw new Error('Erro ao carregar perfil')
      return res.json()
    },
  })

  // Buscar dados da igreja
  const { data: churchData } = useQuery({
    queryKey: ['church'],
    queryFn: async () => {
      const res = await fetch('/api/church')
      if (!res.ok) throw new Error('Erro ao carregar igreja')
      return res.json()
    },
  })

  // Buscar disponibilidade (apenas para músicos)
  const { data: availabilityData, isLoading: isLoadingAvailability } = useQuery({
    queryKey: ['availability'],
    queryFn: async () => {
      const res = await fetch('/api/users/availability')
      if (!res.ok) throw new Error('Erro ao carregar disponibilidade')
      return res.json()
    },
    enabled: !isDirector,
  })

  // Buscar histórico
  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['history'],
    queryFn: async () => {
      const res = await fetch('/api/invitations?history=true')
      if (!res.ok) throw new Error('Erro ao carregar histórico')
      return res.json()
    },
    enabled: !isDirector,
  })

  // Buscar estatísticas para diretor
  const { data: statsData } = useQuery({
    queryKey: ['director-stats'],
    queryFn: async () => {
      const [eventsRes, musiciansRes] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/users?role=MUSICIAN'),
      ])
      const events = eventsRes.ok ? await eventsRes.json() : { events: [] }
      const musicians = musiciansRes.ok ? await musiciansRes.json() : { users: [] }
      return { events: events.events || [], musicians: musicians.users || [] }
    },
    enabled: isDirector,
  })

  // Atualizar estado quando dados carregarem
  React.useEffect(() => {
    if (profileData?.user) {
      setName(profileData.user.name || '')
      setPhone(profileData.user.phone || '')
      if (profileData.user.musicianProfile) {
        setSelectedInstruments(profileData.user.musicianProfile.instruments || [])
        setSelectedVocals(profileData.user.musicianProfile.vocals || [])
      }
    }
  }, [profileData])

  React.useEffect(() => {
    if (availabilityData?.availability) {
      setAvailability(availabilityData.availability)
    }
  }, [availabilityData])

  const toggleAvailability = (slotId: string) => {
    setAvailability((prev) => ({
      ...prev,
      [slotId]: !prev[slotId],
    }))
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      if (!isDirector) {
        // Salvar disponibilidade (apenas músicos)
        const availabilityRes = await fetch('/api/users/availability', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ availability }),
        })

        if (!availabilityRes.ok) {
          throw new Error('Erro ao salvar disponibilidade')
        }
      }

      // Salvar perfil
      const profileRes = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          instruments: selectedInstruments,
          vocals: selectedVocals,
        }),
      })

      if (!profileRes.ok) {
        throw new Error('Erro ao salvar perfil')
      }

      toast.success('Perfil atualizado com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Erro ao salvar alterações')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyInviteLink = () => {
    const inviteCode = churchData?.church?.slug
    if (inviteCode) {
      const inviteLink = `${window.location.origin}/entrar-igreja?codigo=${inviteCode}`
      navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      toast.success('Link copiado!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const participationHistory = historyData?.invitations || []
  
  const musicianStats = {
    totalEvents: participationHistory.length,
    confirmed: participationHistory.filter((p: any) => p.status === 'CONFIRMED').length,
    cancelled: participationHistory.filter((p: any) => p.status === 'CANCELLED').length,
    attendanceRate: participationHistory.length > 0 
      ? Math.round((participationHistory.filter((p: any) => p.status === 'CONFIRMED').length / participationHistory.length) * 100)
      : 0,
  }

  const directorStats = {
    totalEvents: statsData?.events?.length || 0,
    thisMonth: statsData?.events?.filter((e: any) => {
      const eventDate = new Date(e.date)
      const now = new Date()
      return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear()
    }).length || 0,
    totalMusicians: statsData?.musicians?.length || 0,
    activeMusicians: statsData?.musicians?.filter((m: any) => m.isActive).length || 0,
  }

  if (isLoadingProfile) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    )
  }

  // ========== PERFIL DO DIRETOR ==========
  if (isDirector) {
    return (
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Perfil do Diretor</h1>
            <p className="text-muted-foreground">
              Gerencie suas informações pessoais e da igreja.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Dados Pessoais */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Dados Pessoais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={user?.avatar} />
                      <AvatarFallback className="text-lg bg-purple-100 text-purple-700">
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
                        value={user?.email || ''}
                        disabled
                        className="bg-muted"
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
                </CardContent>
              </Card>

              {/* Informações da Igreja */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Church className="h-5 w-5" />
                    Igreja que você gerencia
                  </CardTitle>
                  <CardDescription>
                    Você foi designado como diretor de música desta igreja.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4 p-4 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                    <div className="h-12 w-12 rounded-xl bg-emerald-600 flex items-center justify-center">
                      <Church className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-emerald-800 dark:text-emerald-200">
                        {churchData?.church?.name || 'Carregando...'}
                      </h3>
                      {churchData?.church?.city && (
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 mt-1">
                          <MapPin className="h-4 w-4" />
                          <span>{churchData.church.city}, {churchData.church.state}</span>
                        </div>
                      )}
                      {churchData?.church?.email && (
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 mt-1">
                          <MailIcon className="h-4 w-4" />
                          <span className="text-sm">{churchData.church.email}</span>
                        </div>
                      )}
                    </div>
                    <Badge className="bg-purple-100 text-purple-800">
                      Diretor
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    ℹ️ Se precisar alterar a igreja, entre em contato com o suporte.
                  </p>
                </CardContent>
              </Card>

              {/* Convidar Músicos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Convidar Músicos
                  </CardTitle>
                  <CardDescription>
                    Compartilhe o link para que músicos possam entrar na sua igreja.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Input
                      value={churchData?.church?.slug ? `${window.location.origin}/entrar-igreja?codigo=${churchData.church.slug}` : 'Carregando...'}
                      readOnly
                      className="bg-muted"
                    />
                    <Button onClick={handleCopyInviteLink} variant="outline">
                      {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => {
                    const inviteCode = churchData?.church?.slug
                    if (inviteCode) {
                      const inviteLink = `${window.location.origin}/entrar-igreja?codigo=${inviteCode}`
                      const message = encodeURIComponent(`🎵 *Louvor Conectado*\n\nVocê foi convidado para fazer parte do ministério de louvor!\n\nClique no link para entrar:\n${inviteLink}`)
                      window.open(`https://wa.me/?text=${message}`, "_blank")
                    }
                  }}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Compartilhar via WhatsApp
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Estatísticas da Igreja */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Estatísticas da Igreja</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-600" />
                      <span className="text-sm text-purple-700 dark:text-purple-300">Músicos ativos</span>
                    </div>
                    <span className="font-bold text-purple-800 dark:text-purple-200">{directorStats.activeMusicians}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm text-emerald-700 dark:text-emerald-300">Eventos este mês</span>
                    </div>
                    <span className="font-bold text-emerald-800 dark:text-emerald-200">{directorStats.thisMonth}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Music className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-blue-700 dark:text-blue-300">Total de eventos</span>
                    </div>
                    <span className="font-bold text-blue-800 dark:text-blue-200">{directorStats.totalEvents}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Função */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Função</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className="bg-purple-100 text-purple-800 text-sm">
                    🎼 Diretor de Música
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">
                    Você pode criar eventos, escalar músicos e gerenciar o ministério de louvor.
                  </p>
                </CardContent>
              </Card>

              {/* Salvar */}
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

  // ========== PERFIL DO MÚSICO ==========
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
                    <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback className="text-lg bg-emerald-100 text-emerald-700">
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
                          value={user?.email || ''}
                          disabled
                          className="bg-muted"
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

                    {/* Igreja do músico */}
                    <Separator />
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Church className="h-4 w-4" />
                        Sua Igreja
                      </Label>
                      <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                        <Church className="h-5 w-5 text-emerald-600" />
                        <div>
                          <p className="font-medium text-emerald-700 dark:text-emerald-300">
                            {churchData?.church?.name || 'Não definida'}
                          </p>
                          {churchData?.church?.city && (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400">
                              {churchData.church.city}, {churchData.church.state}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ℹ️ Para alterar sua igreja, entre em contato com o diretor de música.
                      </p>
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
                      Marque os horários em que você geralmente está disponível para participar.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingAvailability ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {availabilitySlots.map((slot) => (
                          <div
                            key={slot.id}
                            className={`flex items-center justify-between p-4 rounded-lg border transition-colors cursor-pointer ${
                              availability[slot.id]
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950'
                                : 'hover:bg-accent'
                            }`}
                            onClick={() => toggleAvailability(slot.id)}
                          >
                            <div>
                              <p className="font-medium">{slot.label}</p>
                              <p className="text-sm text-muted-foreground">{slot.description}</p>
                            </div>
                            <Switch
                              checked={availability[slot.id] || false}
                              onCheckedChange={() => toggleAvailability(slot.id)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground mt-4">
                      💡 A disponibilidade é usada para sugerir músicos automaticamente ao criar eventos.
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
                    {isLoadingHistory ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : participationHistory.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Nenhum evento no histórico</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {participationHistory.map((item: any) => (
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
                                <p className="font-medium text-sm">{item.event?.title || 'Evento'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.event?.date ? format(new Date(item.event.date), "d 'de' MMMM 'de' yyyy", { locale: ptBR }) : '-'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                className={
                                  item.status === 'CONFIRMED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : item.status === 'CANCELLED'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }
                              >
                                {item.status === 'CONFIRMED' ? 'Participou' : item.status === 'CANCELLED' ? 'Cancelou' : 'Pendente'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Gamificação */}
            <GamificationCard />
            
            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Estatísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total de eventos</span>
                  <span className="font-bold text-lg">{musicianStats.totalEvents}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Participações</span>
                  <span className="font-medium text-emerald-600">{musicianStats.confirmed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Cancelamentos</span>
                  <span className="font-medium text-red-600">{musicianStats.cancelled}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Taxa de presença</span>
                  <span className="font-bold text-lg text-emerald-600">{musicianStats.attendanceRate}%</span>
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
                    user?.role === 'SINGER'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }
                >
                  {user?.role === 'SINGER'
                    ? '🎤 Cantor'
                    : user?.role === 'INSTRUMENTALIST'
                    ? '🎸 Instrumentalista'
                    : '🎵 Músico'}
                </Badge>
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
