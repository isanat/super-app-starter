'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Search, Users, Music, CheckCircle, XCircle, Mail, Phone,
  Grid, List, Loader2
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { AppLayout } from '@/components/layout/app-layout'

interface MusicianProfile {
  instruments: string | null
  vocals: string | null
  totalEvents: number
}

interface Musician {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  penaltyPoints: number
  isBlocked: boolean
  weeklyAvailability: string | null
  profile: MusicianProfile | null
}

const instrumentLabels: Record<string, string> = {
  violao: 'Violão',
  guitarra: 'Guitarra',
  baixo: 'Baixo',
  piano: 'Piano/Teclado',
  bateria: 'Bateria',
  saxofone: 'Saxofone',
  violino: 'Violino',
  flauta: 'Flauta',
}

const vocalLabels: Record<string, string> = {
  soprano: 'Soprano',
  contralto: 'Contralto',
  tenor: 'Tenor',
  baritono: 'Barítono',
  baixo: 'Baixo',
}

export default function MusicosPage() {
  const { user } = useAuthStore()
  const isDirector = user?.role === 'DIRECTOR' || user?.role === 'ADMIN'
  const [searchQuery, setSearchQuery] = React.useState('')
  const [instrumentFilter, setInstrumentFilter] = React.useState('all')
  const [availabilityFilter, setAvailabilityFilter] = React.useState('all')
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid')

  // Buscar músicos da API
  const { data: musiciansData, isLoading, error } = useQuery({
    queryKey: ['musicians'],
    queryFn: async () => {
      const res = await fetch('/api/users?role=MUSICIAN')
      if (!res.ok) throw new Error('Erro ao carregar músicos')
      return res.json()
    },
  })

  const musicians: Musician[] = musiciansData?.users || []

  // Parse instruments and vocals from JSON strings
  const getInstruments = (musician: Musician): string[] => {
    if (!musician.profile?.instruments) return []
    try {
      return JSON.parse(musician.profile.instruments)
    } catch {
      return []
    }
  }

  const getVocals = (musician: Musician): string[] => {
    if (!musician.profile?.vocals) return []
    try {
      return JSON.parse(musician.profile.vocals)
    } catch {
      return []
    }
  }

  const getTotalEvents = (musician: Musician): number => {
    return musician.profile?.totalEvents || 0
  }

  const isAvailable = (musician: Musician): boolean => {
    return !musician.isBlocked
  }

  const filteredMusicians = musicians.filter((musician) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (
        !musician.name.toLowerCase().includes(query) &&
        !musician.email.toLowerCase().includes(query)
      ) {
        return false
      }
    }
    if (instrumentFilter !== 'all') {
      const instruments = getInstruments(musician)
      const vocals = getVocals(musician)
      if (instrumentFilter === 'voz') {
        if (vocals.length === 0) return false
      } else {
        if (!instruments.includes(instrumentFilter)) return false
      }
    }
    if (availabilityFilter !== 'all') {
      const available = availabilityFilter === 'available'
      if (isAvailable(musician) !== available) return false
    }
    return true
  })

  // Loading state
  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-muted-foreground">Carregando músicos...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Error state
  if (error) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <XCircle className="h-8 w-8 text-red-500" />
            <p className="text-muted-foreground">Erro ao carregar músicos</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Tentar novamente
            </Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Músicos</h1>
            <p className="text-muted-foreground">
              {musicians.length} músicos cadastrados na sua igreja.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar músicos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[200px]"
              />
            </div>
            <Select value={instrumentFilter} onValueChange={setInstrumentFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Instrumento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="violao">Violão</SelectItem>
                <SelectItem value="guitarra">Guitarra</SelectItem>
                <SelectItem value="baixo">Baixo</SelectItem>
                <SelectItem value="piano">Piano</SelectItem>
                <SelectItem value="bateria">Bateria</SelectItem>
                <SelectItem value="saxofone">Saxofone</SelectItem>
                <SelectItem value="violino">Violino</SelectItem>
                <SelectItem value="voz">Voz</SelectItem>
              </SelectContent>
            </Select>
            <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Disponibilidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="available">Disponível</SelectItem>
                <SelectItem value="unavailable">Indisponível</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Musicians List */}
        {filteredMusicians.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">Nenhum músico encontrado</p>
              <p className="text-muted-foreground">
                Tente ajustar os filtros de busca.
              </p>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredMusicians.map((musician) => {
              const instruments = getInstruments(musician)
              const vocals = getVocals(musician)
              const totalEvents = getTotalEvents(musician)
              const available = isAvailable(musician)

              return (
                <Card key={musician.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback>
                            {musician.name.split(' ').map((n) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base">{musician.name}</CardTitle>
                          <div className="flex items-center gap-1 mt-1">
                            {available ? (
                              <span className="flex items-center gap-1 text-xs text-emerald-600">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                Disponível
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-red-600">
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                Indisponível
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1">
                      {instruments.map((inst) => (
                        <Badge key={inst} variant="secondary" className="text-xs">
                          {instrumentLabels[inst] || inst}
                        </Badge>
                      ))}
                      {vocals.map((vocal) => (
                        <Badge key={vocal} variant="outline" className="text-xs">
                          {vocalLabels[vocal] || vocal}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Music className="h-4 w-4" />
                      <span>{totalEvents} eventos</span>
                    </div>

                    {isDirector && (
                      <div className="flex gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          asChild
                        >
                          <a href={`mailto:${musician.email}`}>
                            <Mail className="h-3 w-3 mr-1" />
                            Email
                          </a>
                        </Button>
                        {musician.phone && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            asChild
                          >
                            <a href={`tel:${musician.phone}`}>
                              <Phone className="h-3 w-3 mr-1" />
                              Ligar
                            </a>
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredMusicians.map((musician) => {
                  const instruments = getInstruments(musician)
                  const vocals = getVocals(musician)
                  const totalEvents = getTotalEvents(musician)
                  const available = isAvailable(musician)

                  return (
                    <div
                      key={musician.id}
                      className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {musician.name.split(' ').map((n) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{musician.name}</p>
                            {available ? (
                              <span className="flex items-center gap-1 text-xs text-emerald-600">
                                <CheckCircle className="h-3 w-3" />
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-red-600">
                                <XCircle className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {instruments.map((inst) => (
                              <Badge key={inst} variant="secondary" className="text-xs">
                                {instrumentLabels[inst] || inst}
                              </Badge>
                            ))}
                            {vocals.map((vocal) => (
                              <Badge key={vocal} variant="outline" className="text-xs">
                                {vocalLabels[vocal] || vocal}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <div className="hidden sm:flex items-center gap-1">
                          <Music className="h-4 w-4" />
                          <span>{totalEvents} eventos</span>
                        </div>
                        {isDirector && (
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              asChild
                            >
                              <a href={`mailto:${musician.email}`}>
                                <Mail className="h-4 w-4" />
                              </a>
                            </Button>
                            {musician.phone && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                asChild
                              >
                                <a href={`tel:${musician.phone}`}>
                                  <Phone className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
