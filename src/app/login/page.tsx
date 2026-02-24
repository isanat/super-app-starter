"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Music, Eye, EyeOff, Loader2, Church, User, Mic, Guitar } from "lucide-react"
import { toast } from "sonner"

const INSTRUMENTS = [
  { id: "violao", name: "Violão" },
  { id: "guitarra", name: "Guitarra" },
  { id: "baixo", name: "Baixo" },
  { id: "bateria", name: "Bateria" },
  { id: "teclado", name: "Teclado/Piano" },
  { id: "violino", name: "Violino" },
  { id: "flauta", name: "Flauta" },
  { id: "saxofone", name: "Saxofone" },
]

const VOCALS = [
  { id: "soprano", name: "Soprano" },
  { id: "contralto", name: "Contralto" },
  { id: "tenor", name: "Tenor" },
  { id: "baritono", name: "Barítono" },
  { id: "baixo", name: "Baixo" },
]

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  })

  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    role: "MUSICIAN" as "DIRECTOR" | "MUSICIAN" | "SINGER" | "INSTRUMENTALIST",
    churchName: "",
    instruments: [] as string[],
    vocals: [] as string[],
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        email: loginData.email,
        password: loginData.password,
        redirect: true,
        callbackUrl: "/"
      })
    } catch (error) {
      toast.error("Erro ao fazer login")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (registerData.password !== registerData.confirmPassword) {
      toast.error("As senhas não coincidem")
      return
    }

    if (registerData.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres")
      return
    }

    if (registerData.role === "DIRECTOR" && !registerData.churchName) {
      toast.error("Informe o nome da igreja")
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Erro ao criar conta")
      }

      toast.success("Conta criada com sucesso! Faça login para continuar.")
      setLoginData({ ...loginData, email: registerData.email })
      
      setRegisterData({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        phone: "",
        role: "MUSICIAN",
        churchName: "",
        instruments: [],
        vocals: [],
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar conta")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleInstrument = (instrument: string) => {
    setRegisterData(prev => ({
      ...prev,
      instruments: prev.instruments.includes(instrument)
        ? prev.instruments.filter(i => i !== instrument)
        : [...prev.instruments, instrument]
    }))
  }

  const toggleVocal = (vocal: string) => {
    setRegisterData(prev => ({
      ...prev,
      vocals: prev.vocals.includes(vocal)
        ? prev.vocals.filter(v => v !== vocal)
        : [...prev.vocals, vocal]
    }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white mb-4">
            <Music className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold">Louvor Conectado</h1>
          <p className="text-muted-foreground mt-2 text-center">
            Sistema de Escala de Músicos para Igrejas
          </p>
        </div>

        <Card>
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="pb-0">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="register">Criar Conta</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="pt-6">
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginData.email}
                      onChange={(e) =>
                        setLoginData({ ...loginData, email: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={loginData.password}
                        onChange={(e) =>
                          setLoginData({ ...loginData, password: e.target.value })
                        }
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Entrar
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Nome completo</Label>
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="Seu nome"
                      value={registerData.name}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={registerData.email}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, email: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-phone">WhatsApp</Label>
                    <Input
                      id="register-phone"
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={registerData.phone}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, phone: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de conta</Label>
                    <Select
                      value={registerData.role}
                      onValueChange={(value: any) =>
                        setRegisterData({ ...registerData, role: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DIRECTOR">
                          <div className="flex items-center gap-2">
                            <Church className="h-4 w-4" />
                            Diretor de Música
                          </div>
                        </SelectItem>
                        <SelectItem value="SINGER">
                          <div className="flex items-center gap-2">
                            <Mic className="h-4 w-4" />
                            Cantor(a)
                          </div>
                        </SelectItem>
                        <SelectItem value="INSTRUMENTALIST">
                          <div className="flex items-center gap-2">
                            <Guitar className="h-4 w-4" />
                            Instrumentalista
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {registerData.role === "DIRECTOR" && (
                    <div className="space-y-2">
                      <Label htmlFor="register-church">Nome da Igreja</Label>
                      <Input
                        id="register-church"
                        type="text"
                        placeholder="Ex: Igreja Adventista Central"
                        value={registerData.churchName}
                        onChange={(e) =>
                          setRegisterData({ ...registerData, churchName: e.target.value })
                        }
                        required
                      />
                    </div>
                  )}

                  {registerData.role === "INSTRUMENTALIST" && (
                    <div className="space-y-2">
                      <Label>Instrumentos que toca</Label>
                      <div className="flex flex-wrap gap-2">
                        {INSTRUMENTS.map((inst) => (
                          <Button
                            key={inst.id}
                            type="button"
                            variant={registerData.instruments.includes(inst.id) ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleInstrument(inst.id)}
                            className={registerData.instruments.includes(inst.id) ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                          >
                            {inst.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {registerData.role === "SINGER" && (
                    <div className="space-y-2">
                      <Label>Tipo de voz</Label>
                      <div className="flex flex-wrap gap-2">
                        {VOCALS.map((vocal) => (
                          <Button
                            key={vocal.id}
                            type="button"
                            variant={registerData.vocals.includes(vocal.id) ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleVocal(vocal.id)}
                            className={registerData.vocals.includes(vocal.id) ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                          >
                            {vocal.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Senha</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={registerData.password}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, password: e.target.value })
                      }
                      required
                      minLength={6}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">Confirmar senha</Label>
                    <Input
                      id="register-confirm-password"
                      type="password"
                      placeholder="Confirme sua senha"
                      value={registerData.confirmPassword}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, confirmPassword: e.target.value })
                      }
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Criar Conta
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Desenvolvido para Igrejas Adventistas do Sétimo Dia
        </p>
      </div>
    </div>
  )
}
