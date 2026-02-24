'use client'

import * as React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Search, Users, Music, CheckCircle, XCircle, Clock, Mail, Phone,
  Grid, List
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { AppLayout } from '@/components/layout/app-layout'

const mockMusicians = [
  {
    id: '1',
    name: 'Maria Santos',
    email: 'maria@igreja.com',
    phone: '(11) 99999-1111',
    instruments: ['violao', 'piano'],
    vocals: ['soprano'],
    yearsExperience: 8,
    totalEvents: 45,
    isAvailable: true,
    lastEvent: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: '2',
    name: 'Pedro Lima',
    email: 'pedro@igreja.com',
    phone: '(11) 99999-2222',
    instruments: ['baixo', 'guitarra'],
    vocals: [],
    yearsExperience: 5,
    totalEvents: 32,
    isAvailable: true,
    lastEvent: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: '3',
    name: 'Ana Costa',
    email: 'ana@igreja.com',
    phone: '(11) 99999-3333',
    instruments: [],
    vocals: ['contralto'],
    yearsExperience: 3,
    totalEvents: 18,
    isAvailable: false,
    lastEvent: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
  },
  {
    id: '4',
    name: 'Lucas Ferreira',
    email: 'lucas@igreja.com',
    phone: '(11) 99999-4444',
    instruments: ['bateria'],
    vocals: [],
    yearsExperience: 6,
    totalEvents: 38,
    isAvailable: true,
    lastEvent: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: '5',
    name: 'Julia Almeida',
    email: 'julia@igreja.com',
    phone: '(11) 99999-5555',
    instruments: ['violino', 'flauta'],
    vocals: ['soprano'],
    yearsExperience: 10,
    totalEvents: 52,
    isAvailable: true,
    lastEvent: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: '6',
    name: 'Carlos Eduardo',
    email: 'carlos@igreja.com',
    phone: '(11) 99999-6666',
    instruments: ['guitarra', 'violao'],
    vocals: ['tenor'],
    yearsExperience: 12,
    totalEvents: 67,
    isAvailable: true,
    lastEvent: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: '7',
    name: 'Fernanda Reis',
    email: 'fernanda@igreja.com',
    phone: '(11) 99999-7777',
    instruments: [],
    vocals: ['soprano'],
    yearsExperience: 4,
    totalEvents: 22,
    isAvailable: true,
    lastEvent: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  },
  {
    id: '8',
    name: 'Ricardo Souza',
    email: 'ricardo@igreja.com',
    phone: '(11) 99999-8888',
    instruments: ['saxofone'],
    vocals: [],
    yearsExperience: 7,
    totalEvents: 29,
    isAvailable: false,
    lastEvent: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
  },
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

  const filteredMusicians = mockMusicians.filter((musician) => {
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
      if (instrumentFilter === 'voz') {
        if (musician.vocals.length === 0) return false
      } else {
        if (!musician.instruments.includes(instrumentFilter)) return false
      }
    }
    if (availabilityFilter !== 'all') {
      const isAvailable = availabilityFilter === 'available'
      if (musician.isAvailable !== isAvailable) return false
    }
    return true
  })

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Músicos</h1>
            <p className="text-muted-foreground">
              {mockMusicians.length} músicos cadastrados na sua igreja.
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
            {filteredMusicians.map((musician) => (
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
                          {musician.isAvailable ? (
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
                    {musician.instruments.map((inst) => (
                      <Badge key={inst} variant="secondary" className="text-xs">
                        {instrumentLabels[inst]}
                      </Badge>
                    ))}
                    {musician.vocals.map((vocal) => (
                      <Badge key={vocal} variant="outline" className="text-xs">
                        {vocalLabels[vocal]}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Music className="h-4 w-4" />
                    <span>{musician.totalEvents} eventos</span>
                    <span>•</span>
                    <span>{musician.yearsExperience} anos</span>
                  </div>

                  {isDirector && (
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Mail className="h-3 w-3 mr-1" />
                        Email
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Phone className="h-3 w-3 mr-1" />
                        Ligar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredMusicians.map((musician) => (
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
                          {musician.isAvailable ? (
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
                          {musician.instruments.map((inst) => (
                            <Badge key={inst} variant="secondary" className="text-xs">
                              {instrumentLabels[inst]}
                            </Badge>
                          ))}
                          {musician.vocals.map((vocal) => (
                            <Badge key={vocal} variant="outline" className="text-xs">
                              {vocalLabels[vocal]}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="hidden sm:flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{musician.yearsExperience} anos</span>
                      </div>
                      <div className="hidden sm:flex items-center gap-1">
                        <Music className="h-4 w-4" />
                        <span>{musician.totalEvents} eventos</span>
                      </div>
                      {isDirector && (
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Phone className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
