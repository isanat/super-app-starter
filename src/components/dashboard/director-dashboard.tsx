"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  Calendar, Users, Music, CheckCircle, Clock, Plus, Send, 
  Sparkles, Church, Settings, LogOut, ChevronRight,
  User, Copy, Share2, Check, Link2
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"
import { signOut } from "next-auth/react"

const EVENT_TYPES = [
  { id: "SABBATH_SCHOOL", name: "Escola Sabatina", icon: "📚" },
  { id: "DIVINE_SERVICE", name: "Culto Divino", icon: "⛪" },
  { id: "SABBATH_AFTERNOON", name: "Sábado à Tarde", icon: "🌅" },
  { id: "WEDNESDAY_SERVICE", name: "Culto de Quarta", icon: "🕯️" },
  { id: "SPECIAL_EVENT", name: "Evento Especial", icon: "🎵" },
  { id: "REHEARSAL", name: "Ensaio", icon: "🎼" },
]

export function DirectorDashboard() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [showNewEvent, setShowNewEvent] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [copied, setCopied] = useState(false)
  const [step, setStep] = useState(1)

  const [eventForm, setEventForm] = useState({
    title: "",
    type: "SABBATH_SCHOOL",
    date: "",
    time: "09:00",
    location: "",
    notes: "",
  })

  const [suggestedMusicians, setSuggestedMusicians] = useState<any[]>([])
  const [selectedMusicians, setSelectedMusicians] = useState<any[]>([])

  // Buscar dados da igreja
  const { data: churchData } = useQuery({
    queryKey: ["church"],
    queryFn: async () => {
      const res = await fetch("/api/church")
      return res.json()
    },
  })

  // Buscar eventos
  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const res = await fetch("/api/events")
      return res.json()
    },
  })

  // Buscar músicos da igreja
  const { data: musiciansData } = useQuery({
    queryKey: ["musicians"],
    queryFn: async () => {
      const res = await fetch("/api/users?role=MUSICIAN")
      return res.json()
    },
  })

  // Sugestão de músicos
  const suggestMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, autoSuggest: true }),
      })
      return res.json()
    },
    onSuccess: (data) => {
      setSuggestedMusicians(data.suggestedMusicians || [])
      setStep(2)
    },
  })

  // Criar evento
  const createEventMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      return res.json()
    },
  })

  // Enviar convites
  const sendInvitesMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      return res.json()
    },
    onSuccess: () => {
      toast.success("Convites enviados com sucesso!")
      setShowNewEvent(false)
      setStep(1)
      queryClient.invalidateQueries({ queryKey: ["events"] })
    },
  })

  const handleSuggestMusicians = () => {
    if (!eventForm.title || !eventForm.date) {
      toast.error("Preencha título e data do evento")
      return
    }

    const dateTime = new Date(`${eventForm.date}T${eventForm.time}`)
    suggestMutation.mutate({
      title: eventForm.title,
      type: eventForm.type,
      date: dateTime.toISOString(),
    })
  }

  const handleSelectMusician = (musician: any) => {
    if (selectedMusicians.find(m => m.id === musician.id)) {
      setSelectedMusicians(prev => prev.filter(m => m.id !== musician.id))
    } else {
      setSelectedMusicians(prev => [...prev, musician])
    }
  }

  const handleConfirmEvent = async () => {
    const dateTime = new Date(`${eventForm.date}T${eventForm.time}`)
    const event = await createEventMutation.mutateAsync({
      title: eventForm.title,
      type: eventForm.type,
      date: dateTime.toISOString(),
      location: eventForm.location,
      notes: eventForm.notes,
    })

    if (event.event?.id && selectedMusicians.length > 0) {
      await sendInvitesMutation.mutateAsync({
        action: "sendInvites",
        eventId: event.event.id,
        invitations: selectedMusicians.map(m => ({
          userId: m.id,
          role: m.vocals?.length > 0 ? "SINGER" : "INSTRUMENTALIST",
          instrument: m.instruments?.[0],
          vocalPart: m.vocals?.[0],
        })),
      })
    }
  }

  const handleCopyInviteLink = () => {
    const inviteCode = churchData?.church?.slug
    if (inviteCode) {
      const inviteLink = `${window.location.origin}/entrar-igreja?codigo=${inviteCode}`
      navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      toast.success("Link copiado!")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleShareWhatsApp = () => {
    const inviteCode = churchData?.church?.slug
    if (inviteCode) {
      const inviteLink = `${window.location.origin}/entrar-igreja?codigo=${inviteCode}`
      const message = encodeURIComponent(`🎵 *Louvor Conectado*\n\nVocê foi convidado para fazer parte do ministério de louvor!\n\nClique no link para entrar:\n${inviteLink}`)
      window.open(`https://wa.me/?text=${message}`, "_blank")
    }
  }

  const events = eventsData?.events || []
  const upcomingEvents = events.filter((e: any) => 
    new Date(e.date) >= new Date() && e.status !== "CANCELLED"
  )
  const pendingInvites = events.flatMap((e: any) => 
    e.invitations?.filter((i: any) => i.status === "PENDING") || []
  )

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Music className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Louvor Conectado</h1>
              <p className="text-xs text-muted-foreground">
                {churchData?.church?.name || session?.user?.name} • Diretor
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowInviteDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Convidar
            </Button>
            <Button variant="ghost" size="icon" onClick={() => signOut()}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Próximos Eventos</p>
                  <p className="text-2xl font-bold">{upcomingEvents.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Convites Pendentes</p>
                  <p className="text-2xl font-bold">{pendingInvites.length}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Músicos Ativos</p>
                  <p className="text-2xl font-bold">{musiciansData?.users?.length || 0}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-emerald-500" onClick={() => setShowInviteDialog(true)}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Código de Convite</p>
                  <p className="text-lg font-bold truncate">{churchData?.church?.slug?.slice(0, 15)}...</p>
                </div>
                <Link2 className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Events list */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Eventos</CardTitle>
                  <CardDescription>Próximos eventos e escalas</CardDescription>
                </div>
                <Dialog open={showNewEvent} onOpenChange={setShowNewEvent}>
                  <DialogTrigger asChild>
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Evento
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {step === 1 && "Criar Evento"}
                        {step === 2 && "Selecionar Músicos"}
                        {step === 3 && "Confirmar Escala"}
                      </DialogTitle>
                      <DialogDescription>
                        {step === 1 && "Preencha os dados do evento"}
                        {step === 2 && `${suggestedMusicians.length} músicos disponíveis sugeridos`}
                        {step === 3 && "Revise e confirme a escala"}
                      </DialogDescription>
                    </DialogHeader>

                    {step === 1 && (
                      <div className="space-y-4 mt-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Título do Evento</Label>
                            <Input
                              placeholder="Ex: Escola Sabatina"
                              value={eventForm.title}
                              onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select
                              value={eventForm.type}
                              onValueChange={(v) => setEventForm({ ...eventForm, type: v })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {EVENT_TYPES.map((t) => (
                                  <SelectItem key={t.id} value={t.id}>
                                    {t.icon} {t.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Data</Label>
                            <Input
                              type="date"
                              value={eventForm.date}
                              onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Horário</Label>
                            <Input
                              type="time"
                              value={eventForm.time}
                              onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Local</Label>
                          <Input
                            placeholder="Ex: Templo Central"
                            value={eventForm.location}
                            onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Observações</Label>
                          <Textarea
                            placeholder="Observações sobre o evento..."
                            value={eventForm.notes}
                            onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                          <Button variant="outline" onClick={() => setShowNewEvent(false)}>
                            Cancelar
                          </Button>
                          <Button 
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={handleSuggestMusicians}
                            disabled={suggestMutation.isPending}
                          >
                            {suggestMutation.isPending ? (
                              <><Sparkles className="h-4 w-4 mr-2 animate-spin" /> Buscando...</>
                            ) : (
                              <><Sparkles className="h-4 w-4 mr-2" /> Sugerir Músicos</>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {step === 2 && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-sm text-muted-foreground">
                            Clique nos músicos para selecioná-los
                          </p>
                          <Badge variant="secondary">
                            {selectedMusicians.length} selecionados
                          </Badge>
                        </div>

                        {suggestedMusicians.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>Nenhum músico disponível</p>
                            <p className="text-sm">Convide músicos para sua igreja primeiro</p>
                          </div>
                        ) : (
                          <div className="grid gap-2 max-h-80 overflow-y-auto">
                            {suggestedMusicians.map((musician) => {
                              const isSelected = selectedMusicians.find(m => m.id === musician.id)
                              return (
                                <div
                                  key={musician.id}
                                  onClick={() => handleSelectMusician(musician)}
                                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                    isSelected 
                                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950" 
                                      : "hover:bg-slate-50 dark:hover:bg-slate-800"
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                        <User className="h-5 w-5" />
                                      </div>
                                      <div>
                                        <p className="font-medium">{musician.name}</p>
                                        <div className="flex gap-1 flex-wrap">
                                          {musician.instruments?.map((inst: string) => (
                                            <Badge key={inst} variant="outline" className="text-xs">
                                              {inst}
                                            </Badge>
                                          ))}
                                          {musician.vocals?.map((vocal: string) => (
                                            <Badge key={vocal} variant="secondary" className="text-xs">
                                              {vocal}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        <div className="flex justify-between pt-4">
                          <Button variant="outline" onClick={() => setStep(1)}>
                            Voltar
                          </Button>
                          <Button 
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => setStep(3)}
                            disabled={selectedMusicians.length === 0}
                          >
                            Continuar
                            <ChevronRight className="h-4 w-4 ml-2" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {step === 3 && (
                      <div className="mt-4 space-y-4">
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                          <h4 className="font-medium mb-2">{eventForm.title}</h4>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>📅 {eventForm.date && format(new Date(eventForm.date), "EEEE, dd 'de' MMMM", { locale: ptBR })} às {eventForm.time}</p>
                            <p>📍 {eventForm.location || "Local a definir"}</p>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">Escala ({selectedMusicians.length} músicos)</h4>
                          <div className="space-y-2">
                            {selectedMusicians.map((m) => (
                              <div key={m.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded">
                                <span>{m.name}</span>
                                <div className="flex gap-1">
                                  {m.instruments?.map((inst: string) => (
                                    <Badge key={inst} variant="outline" className="text-xs">{inst}</Badge>
                                  ))}
                                  {m.vocals?.map((vocal: string) => (
                                    <Badge key={vocal} variant="secondary" className="text-xs">{vocal}</Badge>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-emerald-50 dark:bg-emerald-950 rounded-lg p-4">
                          <p className="text-sm text-emerald-700 dark:text-emerald-300">
                            📱 Ao confirmar, convites serão enviados automaticamente para os músicos selecionados.
                          </p>
                        </div>

                        <div className="flex justify-between pt-4">
                          <Button variant="outline" onClick={() => setStep(2)}>
                            Voltar
                          </Button>
                          <Button 
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={handleConfirmEvent}
                            disabled={createEventMutation.isPending || sendInvitesMutation.isPending}
                          >
                            {createEventMutation.isPending || sendInvitesMutation.isPending ? (
                              <><Sparkles className="h-4 w-4 mr-2 animate-spin" /> Processando...</>
                            ) : (
                              <><Send className="h-4 w-4 mr-2" /> Confirmar e Enviar Convites</>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : upcomingEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum evento agendado</p>
                    <p className="text-sm">Clique em "Novo Evento" para começar</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingEvents.slice(0, 5).map((event: any) => (
                      <div
                        key={event.id}
                        className="p-4 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">
                                {EVENT_TYPES.find(t => t.id === event.type)?.icon || "📅"}
                              </span>
                              <h4 className="font-medium">{event.title}</h4>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {format(new Date(event.date), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant={
                              event.status === "PUBLISHED" ? "default" :
                              event.status === "DRAFT" ? "secondary" : "outline"
                            }>
                              {event.status === "DRAFT" ? "Rascunho" : 
                               event.status === "PUBLISHED" ? "Publicado" : event.status}
                            </Badge>
                            <div className="flex items-center gap-1 mt-2">
                              <Users className="h-3 w-3" />
                              <span className="text-xs">
                                {event.invitations?.filter((i: any) => i.status === "CONFIRMED").length || 0}/{event.invitations?.length || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {event.invitations?.length > 0 && (
                          <div className="flex gap-1 mt-3 flex-wrap">
                            {event.invitations.slice(0, 6).map((inv: any) => (
                              <Badge
                                key={inv.id}
                                variant={inv.status === "CONFIRMED" ? "default" : inv.status === "PENDING" ? "secondary" : "outline"}
                                className="text-xs"
                              >
                                {inv.user?.name?.split(" ")[0]}
                                {inv.status === "CONFIRMED" && " ✓"}
                              </Badge>
                            ))}
                            {event.invitations.length > 6 && (
                              <Badge variant="outline" className="text-xs">
                                +{event.invitations.length - 6}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Invite Card */}
            <Card className="border-emerald-200 dark:border-emerald-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-emerald-600" />
                  Convidar Músicos
                </CardTitle>
                <CardDescription>
                  Compartilhe o link para novos músicos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Código de Convite:</p>
                  <p className="font-mono text-sm font-medium truncate">
                    {churchData?.church?.slug || "Carregando..."}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={handleCopyInviteLink}
                  >
                    {copied ? (
                      <><Check className="h-4 w-4 mr-2" /> Copiado!</>
                    ) : (
                      <><Copy className="h-4 w-4 mr-2" /> Copiar Link</>
                    )}
                  </Button>
                </div>
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={handleShareWhatsApp}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Compartilhar no WhatsApp
                </Button>
              </CardContent>
            </Card>

            {/* Pending confirmations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Aguardando Confirmação
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingInvites.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhum convite pendente
                  </p>
                ) : (
                  <div className="space-y-2">
                    {pendingInvites.slice(0, 5).map((inv: any) => (
                      <div key={inv.id} className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800">
                        <div>
                          <p className="text-sm font-medium">{inv.user?.name}</p>
                          <p className="text-xs text-muted-foreground">{inv.event?.title}</p>
                        </div>
                        <Badge variant="secondary">Pendente</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Músicos</DialogTitle>
            <DialogDescription>
              Compartilhe o link abaixo para que músicos possam entrar na sua igreja
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Link de Convite:</p>
              <p className="font-mono text-sm break-all bg-white dark:bg-slate-700 p-2 rounded border">
                {typeof window !== 'undefined' ? `${window.location.origin}/entrar-igreja?codigo=${churchData?.church?.slug}` : 'Carregando...'}
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleCopyInviteLink}
              >
                {copied ? (
                  <><Check className="h-4 w-4 mr-2" /> Copiado!</>
                ) : (
                  <><Copy className="h-4 w-4 mr-2" /> Copiar</>
                )}
              </Button>
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleShareWhatsApp}
              >
                <Share2 className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                💡 O músico precisará criar uma conta e depois usar este código para entrar na igreja.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// UserPlus icon component
function UserPlus({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" x2="19" y1="8" y2="14" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </svg>
  )
}
