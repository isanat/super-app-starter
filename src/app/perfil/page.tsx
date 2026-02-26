"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  User, Mail, Phone, Camera, Save, Loader2, Music, Calendar, 
  CheckCircle, Church, MapPin, ChevronLeft, Clock, Trophy
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

const instruments = [
  { id: "violao", label: "Violão" },
  { id: "guitarra", label: "Guitarra" },
  { id: "baixo", label: "Baixo" },
  { id: "piano", label: "Piano/Teclado" },
  { id: "bateria", label: "Bateria" },
  { id: "saxofone", label: "Saxofone" },
  { id: "violino", label: "Violino" },
  { id: "flauta", label: "Flauta" },
]

const vocalParts = [
  { id: "soprano", label: "Soprano" },
  { id: "contralto", label: "Contralto" },
  { id: "tenor", label: "Tenor" },
  { id: "baritono", label: "Barítono" },
  { id: "baixo", label: "Baixo" },
]

export default function PerfilPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  
  const [name, setName] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [selectedInstruments, setSelectedInstruments] = React.useState<string[]>([])
  const [selectedVocals, setSelectedVocals] = React.useState<string[]>([])
  const [isSaving, setIsSaving] = React.useState(false)
  const [activeSection, setActiveSection] = React.useState<"info" | "skills" | "history">("info")
  
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = React.useState(false)

  // Fetch profile data
  const { data: profileData, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/users/me")
      if (!res.ok) throw new Error("Erro ao carregar perfil")
      return res.json()
    },
  })

  // Fetch church data
  const { data: churchData } = useQuery({
    queryKey: ["church"],
    queryFn: async () => {
      const res = await fetch("/api/church")
      if (!res.ok) throw new Error("Erro ao carregar igreja")
      return res.json()
    },
  })

  // Fetch history
  const { data: historyData } = useQuery({
    queryKey: ["history"],
    queryFn: async () => {
      const res = await fetch("/api/invitations?history=true")
      if (!res.ok) throw new Error("Erro ao carregar histórico")
      return res.json()
    },
  })

  // Update state when data loads
  React.useEffect(() => {
    if (profileData?.user) {
      setName(profileData.user.name || "")
      setPhone(profileData.user.phone || "")
      if (profileData.user.musicianProfile) {
        setSelectedInstruments(profileData.user.musicianProfile.instruments || [])
        setSelectedVocals(profileData.user.musicianProfile.vocals || [])
      }
    }
  }, [profileData])

  const participationHistory = historyData?.invitations || []
  
  const stats = {
    total: participationHistory.length,
    confirmed: participationHistory.filter((p: any) => p.status === "CONFIRMED").length,
    cancelled: participationHistory.filter((p: any) => p.status === "CANCELLED" || p.status === "DECLINED").length,
  }

  const isDirector = session?.user?.role === "DIRECTOR" || session?.user?.role === "ADMIN"

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          instruments: selectedInstruments,
          vocals: selectedVocals,
        }),
      })

      if (!res.ok) throw new Error("Erro ao salvar")

      toast.success("Perfil atualizado!")
      queryClient.invalidateQueries({ queryKey: ["profile"] })
    } catch (error) {
      toast.error("Erro ao salvar alterações")
    } finally {
      setIsSaving(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Formato inválido. Use JPG, PNG ou WebP.")
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 2MB.")
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", "avatar")

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      if (res.ok && data.url) {
        toast.success("Foto atualizada!")
        queryClient.invalidateQueries({ queryKey: ["profile"] })
      } else {
        throw new Error(data.error || "Erro no upload")
      }
    } catch (error) {
      toast.error("Erro ao enviar foto")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  if (status === "loading" || isLoadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button onClick={() => router.push("/")} className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h1 className="font-semibold text-sm">Meu Perfil</h1>
            </div>
            
            <Button size="sm" className="h-8 text-xs bg-emerald-500 hover:bg-emerald-600" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              <span className="ml-1">Salvar</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {/* Profile Header Card */}
        <Card className="border border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profileData?.user?.avatar || session?.user?.image || undefined} />
                  <AvatarFallback className="bg-emerald-500 text-white text-lg font-semibold">
                    {name?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg"
                >
                  {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                </button>
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-base">{name || "Seu nome"}</h2>
                <p className="text-xs text-slate-500">{session?.user?.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                    {isDirector ? "Diretor" : session?.user?.role === "SINGER" ? "Cantor" : "Instrumentalista"}
                  </Badge>
                  {(session?.user?.penaltyPoints || 0) > 0 && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-amber-600 border-amber-500">
                      {session?.user?.penaltyPoints}/9 pontos
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="flex gap-2">
          <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-1.5 text-emerald-500">
              <CheckCircle className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium">Participações</span>
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{stats.confirmed}</p>
          </div>
          <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-1.5 text-purple-500">
              <Trophy className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium">Pontos</span>
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{profileData?.user?.points || 0}</p>
          </div>
          <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium">Total</span>
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</p>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          {[
            { id: "info", label: "Informações" },
            { id: "skills", label: "Habilidades" },
            { id: "history", label: "Histórico" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={cn(
                "flex-1 px-2 py-2 rounded-md text-xs font-medium transition-all",
                activeSection === tab.id
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Sections */}
        {activeSection === "info" && (
          <div className="space-y-3">
            <Card className="border border-slate-200 dark:border-slate-700">
              <CardContent className="p-3 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome completo</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">E-mail</Label>
                  <Input
                    value={session?.user?.email || ""}
                    disabled
                    className="h-9 text-sm bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Telefone/WhatsApp</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="h-9 text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Church */}
            <Card className="border border-slate-200 dark:border-slate-700">
              <CardContent className="p-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                    <Church className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500">Igreja</p>
                    <p className="text-sm font-medium">{churchData?.church?.name || "Não definida"}</p>
                    {churchData?.church?.city && (
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {churchData.church.city}, {churchData.church.state}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === "skills" && (
          <div className="space-y-3">
            {/* Instruments */}
            <Card className="border border-slate-200 dark:border-slate-700">
              <CardContent className="p-3">
                <h3 className="text-xs font-semibold mb-3 flex items-center gap-1.5">
                  <Music className="h-3.5 w-3.5 text-emerald-500" />
                  Instrumentos
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {instruments.map((inst) => (
                    <div
                      key={inst.id}
                      onClick={() => {
                        if (selectedInstruments.includes(inst.id)) {
                          setSelectedInstruments(selectedInstruments.filter((i) => i !== inst.id))
                        } else {
                          setSelectedInstruments([...selectedInstruments, inst.id])
                        }
                      }}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors",
                        selectedInstruments.includes(inst.id)
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
                          : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                      )}
                    >
                      <Checkbox
                        checked={selectedInstruments.includes(inst.id)}
                        className="h-4 w-4"
                      />
                      <span className="text-xs">{inst.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Vocals */}
            <Card className="border border-slate-200 dark:border-slate-700">
              <CardContent className="p-3">
                <h3 className="text-xs font-semibold mb-3">Voz</h3>
                <div className="flex flex-wrap gap-2">
                  {vocalParts.map((part) => (
                    <div
                      key={part.id}
                      onClick={() => {
                        if (selectedVocals.includes(part.id)) {
                          setSelectedVocals(selectedVocals.filter((v) => v !== part.id))
                        } else {
                          setSelectedVocals([...selectedVocals, part.id])
                        }
                      }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors",
                        selectedVocals.includes(part.id)
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
                          : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                      )}
                    >
                      <Checkbox
                        checked={selectedVocals.includes(part.id)}
                        className="h-3 w-3"
                      />
                      <span className="text-xs">{part.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === "history" && (
          <Card className="border border-slate-200 dark:border-slate-700">
            <CardContent className="p-3">
              <h3 className="text-xs font-semibold mb-3 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                Participações Recentes
              </h3>
              <ScrollArea className="h-[300px]">
                {participationHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs text-slate-500">Nenhum evento no histórico</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {participationHistory.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800"
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-2 w-2 rounded-full",
                            item.status === "CONFIRMED" ? "bg-emerald-500" : "bg-red-500"
                          )} />
                          <div>
                            <p className="text-xs font-medium">{item.event?.title || "Evento"}</p>
                            <p className="text-[10px] text-slate-500">
                              {item.event?.date ? format(new Date(item.event.date), "dd/MM/yyyy") : "-"}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] h-5 px-1.5",
                            item.status === "CONFIRMED" ? "text-emerald-600 border-emerald-500" : "text-red-600 border-red-500"
                          )}
                        >
                          {item.status === "CONFIRMED" ? "Participou" : "Cancelou"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
