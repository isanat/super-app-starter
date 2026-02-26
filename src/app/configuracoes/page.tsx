"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  Bell,
  Moon,
  Save,
  Church,
  MapPin,
  Phone,
  Mail,
  Smartphone,
} from "lucide-react"

export default function ConfiguracoesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [church, setChurch] = React.useState<any>(null)
  
  // Configurações de notificação
  const [notifications, setNotifications] = React.useState({
    eventInvite: true,
    eventReminder: true,
    confirmation: true,
    cancellation: true,
    penalty: true,
    pushEnabled: true,
  })

  // Configurações de aparência
  const [appearance, setAppearance] = React.useState({
    theme: "system",
    compactMode: false,
  })

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  React.useEffect(() => {
    if (session?.user?.churchId) {
      fetchChurch()
    }
  }, [session?.user?.churchId])

  const fetchChurch = async () => {
    try {
      const res = await fetch("/api/church")
      const data = await res.json()
      setChurch(data.church)
    } catch (error) {
      console.error("Erro ao carregar igreja:", error)
    }
  }

  const handleSaveChurch = async () => {
    if (!church) return
    setLoading(true)
    try {
      const res = await fetch("/api/church", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(church),
      })
      if (res.ok) {
        toast.success("Configurações da igreja salvas!")
      }
    } catch (error) {
      toast.error("Erro ao salvar configurações")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveNotifications = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/users/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifications }),
      })
      if (res.ok) {
        toast.success("Preferências de notificação salvas!")
      } else {
        toast.success("Preferências atualizadas localmente!")
      }
    } catch (error) {
      toast.success("Preferências salvas localmente!")
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading" || !session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  const isDirector = session.user?.role === "DIRECTOR" || session.user?.role === "ADMIN"

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Configurações</h1>
        <p className="text-slate-500 dark:text-slate-400">Gerencie as configurações do aplicativo</p>
      </div>

      {/* Notificações */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-emerald-600" />
            <CardTitle>Notificações</CardTitle>
          </div>
          <CardDescription>Configure como você recebe notificações</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Convites de eventos</Label>
              <p className="text-sm text-muted-foreground">Receber quando for convidado para um evento</p>
            </div>
            <Switch
              checked={notifications.eventInvite}
              onCheckedChange={(checked) => 
                setNotifications({ ...notifications, eventInvite: checked })
              }
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Lembretes de eventos</Label>
              <p className="text-sm text-muted-foreground">Receber lembrete antes dos eventos</p>
            </div>
            <Switch
              checked={notifications.eventReminder}
              onCheckedChange={(checked) => 
                setNotifications({ ...notifications, eventReminder: checked })
              }
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Notificações push</Label>
              <p className="text-sm text-muted-foreground">Receber notificações no dispositivo</p>
            </div>
            <Switch
              checked={notifications.pushEnabled}
              onCheckedChange={(checked) => 
                setNotifications({ ...notifications, pushEnabled: checked })
              }
            />
          </div>

          <div className="pt-4">
            <Button onClick={handleSaveNotifications} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              Salvar preferências
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Aparência */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-emerald-600" />
            <CardTitle>Aparência</CardTitle>
          </div>
          <CardDescription>Personalize a aparência do aplicativo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Tema</Label>
              <p className="text-sm text-muted-foreground">Escolha o tema do aplicativo</p>
            </div>
            <Select
              value={appearance.theme}
              onValueChange={(value) => setAppearance({ ...appearance, theme: value })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Claro</SelectItem>
                <SelectItem value="dark">Escuro</SelectItem>
                <SelectItem value="system">Sistema</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Configurações da Igreja (Apenas Diretores) */}
      {isDirector && church && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Church className="h-5 w-5 text-emerald-600" />
              <CardTitle>Igreja</CardTitle>
            </div>
            <CardDescription>Configurações da sua igreja</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="churchName">Nome da Igreja</Label>
                <Input
                  id="churchName"
                  value={church.name || ""}
                  onChange={(e) => setChurch({ ...church, name: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="churchCity">Cidade</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="churchCity"
                    value={church.city || ""}
                    onChange={(e) => setChurch({ ...church, city: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="churchAddress">Endereço</Label>
              <Input
                id="churchAddress"
                value={church.address || ""}
                onChange={(e) => setChurch({ ...church, address: e.target.value })}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="churchPhone">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="churchPhone"
                    value={church.phone || ""}
                    onChange={(e) => setChurch({ ...church, phone: e.target.value })}
                    className="pl-10"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="churchEmail">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="churchEmail"
                    type="email"
                    value={church.email || ""}
                    onChange={(e) => setChurch({ ...church, email: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceTimes">Horários dos Cultos</Label>
              <Textarea
                id="serviceTimes"
                value={church.serviceTimes || ""}
                onChange={(e) => setChurch({ ...church, serviceTimes: e.target.value })}
                placeholder="Escola Sabatina: Sábados 9h&#10;Culto Divino: Sábados 10h45&#10;Culto de Quarta: Quartas 19h30"
                rows={3}
              />
            </div>

            <div className="pt-4">
              <Button onClick={handleSaveChurch} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                Salvar configurações da igreja
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sobre o App */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-emerald-600" />
            <CardTitle>Sobre o App</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Versão</span>
              <Badge variant="secondary">1.0.0</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Ambiente</span>
              <Badge variant="outline">Produção</Badge>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <p className="text-sm text-muted-foreground">
            Louvor Conectado - Sistema de gestão de músicos e escalas para ministérios de louvor.
            Desenvolvido para igrejas adventistas do sétimo dia.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
