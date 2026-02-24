"use client"

import { useMemo, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Church, Users, Loader2, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { useState } from "react"

export default function EntrarIgrejaPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [inviteCode, setInviteCode] = useState("")
  const [hasAutoJoined, setHasAutoJoined] = useState(false)

  // Código da URL
  const codigoFromUrl = useMemo(() => searchParams.get("codigo"), [searchParams])

  // Buscar igrejas
  const { data: churchesData, isLoading } = useQuery({
    queryKey: ["churches"],
    queryFn: async () => {
      const res = await fetch("/api/church/join")
      return res.json()
    },
  })

  // Entrar na igreja
  const joinMutation = useMutation({
    mutationFn: async (data: { churchId?: string; inviteCode?: string }) => {
      const res = await fetch("/api/church/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      return res.json()
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Você entrou na ${data.church.name}!`)
        router.push("/")
        router.refresh()
      } else {
        toast.error(data.error || "Erro ao entrar na igreja")
      }
    },
    onError: () => {
      toast.error("Erro ao entrar na igreja")
    },
  })

  // Auto-join se tem código na URL e usuário está autenticado
  const tryAutoJoin = useCallback(() => {
    if (codigoFromUrl && status === "authenticated" && !hasAutoJoined && session?.user && !session.user.churchId) {
      setHasAutoJoined(true)
      joinMutation.mutate({ inviteCode: codigoFromUrl })
    }
  }, [codigoFromUrl, status, hasAutoJoined, session, joinMutation])

  // Tentar auto-join quando o componente montar
  useMemo(() => {
    if (codigoFromUrl && status === "authenticated" && !hasAutoJoined && session?.user && !session.user.churchId) {
      tryAutoJoin()
    }
  }, [codigoFromUrl, status, session, hasAutoJoined, tryAutoJoin])

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteCode.trim()) {
      toast.error("Digite o código de convite")
      return
    }
    joinMutation.mutate({ inviteCode })
  }

  const handleSelectChurch = (churchId: string) => {
    joinMutation.mutate({ churchId })
  }

  const handleAcceptInvite = () => {
    if (codigoFromUrl) {
      joinMutation.mutate({ inviteCode: codigoFromUrl })
    }
  }

  const churches = churchesData?.churches || []

  // Loading state
  if (status === "loading" || joinMutation.isPending) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-muted-foreground">
            {joinMutation.isPending ? "Entrando na igreja..." : "Carregando..."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-emerald-600 flex items-center justify-center mx-auto mb-4">
            <Church className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Entrar em uma Igreja</h1>
          <p className="text-muted-foreground mt-2">
            Olá, {session?.user?.name}! Para participar das escalas, você precisa entrar em uma igreja.
          </p>
        </div>

        {/* Se veio com código de convite */}
        {codigoFromUrl && (
          <Card className="mb-6 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950">
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
                <h3 className="font-medium text-lg mb-2">Convite Recebido!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Você foi convidado para participar de uma igreja.
                </p>
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700 w-full"
                  onClick={handleAcceptInvite}
                  disabled={joinMutation.isPending}
                >
                  {joinMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Entrando...</>
                  ) : (
                    "Aceitar Convite"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Código de Convite</CardTitle>
            <CardDescription>
              Se você recebeu um código de convite do diretor, digite aqui
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinByCode} className="flex gap-2">
              <Input
                placeholder="Ex: iasd-central-abc123"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
              />
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={joinMutation.isPending}>
                {joinMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-50 dark:bg-slate-900 px-2 text-muted-foreground">
              ou selecione uma igreja
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : churches.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Church className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma igreja cadastrada ainda</p>
              <p className="text-sm">Peça para o diretor criar a igreja e enviar o código</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {churches.map((church: any) => (
              <Card
                key={church.id}
                className="cursor-pointer hover:border-emerald-500 transition-colors"
                onClick={() => handleSelectChurch(church.id)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Church className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium">{church.name}</p>
                      {church.city && (
                        <p className="text-sm text-muted-foreground">
                          {church.city}{church.state && `, ${church.state}`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">{church._count?.members || 0}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
