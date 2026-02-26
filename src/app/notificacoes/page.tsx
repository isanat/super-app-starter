"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Bell, ChevronLeft, Check, Trash2, Calendar, AlertCircle, 
  CheckCircle, XCircle, Info, Loader2, BellOff
} from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

const notificationIcons: Record<string, React.ReactNode> = {
  EVENT_INVITE: <Calendar className="h-4 w-4 text-blue-500" />,
  EVENT_REMINDER: <Bell className="h-4 w-4 text-amber-500" />,
  CONFIRMATION: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  CANCELLATION: <XCircle className="h-4 w-4 text-red-500" />,
  PENALTY: <AlertCircle className="h-4 w-4 text-orange-500" />,
  SCALE_PUBLISHED: <Calendar className="h-4 w-4 text-purple-500" />,
  SYSTEM: <Info className="h-4 w-4 text-slate-500" />,
  GUEST_INVITE: <Calendar className="h-4 w-4 text-indigo-500" />,
  POSITION_FILLED: <CheckCircle className="h-4 w-4 text-teal-500" />,
  GROUP_INVITE: <Calendar className="h-4 w-4 text-pink-500" />,
  GROUP_EVENT_INVITE: <Calendar className="h-4 w-4 text-cyan-500" />,
}

const notificationLabels: Record<string, string> = {
  EVENT_INVITE: "Convite para evento",
  EVENT_REMINDER: "Lembrete",
  CONFIRMATION: "Confirmação",
  CANCELLATION: "Cancelamento",
  PENALTY: "Ponto de atenção",
  SCALE_PUBLISHED: "Escala publicada",
  SYSTEM: "Sistema",
  GUEST_INVITE: "Convite como convidado",
  POSITION_FILLED: "Posição preenchida",
  GROUP_INVITE: "Convite para grupo",
  GROUP_EVENT_INVITE: "Convite do grupo",
}

export default function NotificacoesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()

  // Fetch notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications")
      if (!res.ok) throw new Error("Erro ao carregar notificações")
      return res.json()
    },
  })

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
      })
      if (!res.ok) throw new Error("Erro ao marcar como lida")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
      })
      if (!res.ok) throw new Error("Erro ao marcar todas como lidas")
      return res.json()
    },
    onSuccess: () => {
      toast.success("Todas notificações marcadas como lidas")
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  const notifications = notificationsData?.notifications || []
  const unreadCount = notifications.filter((n: any) => !n.isRead).length

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button onClick={() => router.push("/")} className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div>
                <h1 className="font-semibold text-sm">Notificações</h1>
                {unreadCount > 0 && (
                  <p className="text-[11px] text-slate-500">{unreadCount} não lidas</p>
                )}
              </div>
            </div>
            
            {unreadCount > 0 && (
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 text-xs text-emerald-600"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                <Check className="h-3 w-3 mr-1" />
                Marcar todas como lidas
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="px-4 py-4">
        {notifications.length === 0 ? (
          <div className="text-center py-16">
            <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <BellOff className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Nenhuma notificação</p>
            <p className="text-xs text-slate-400 mt-1">Você está em dia!</p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="space-y-2">
              {notifications.map((notification: any) => (
                <Card 
                  key={notification.id}
                  className={cn(
                    "border transition-all cursor-pointer hover:shadow-sm",
                    notification.isRead 
                      ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" 
                      : "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30"
                  )}
                  onClick={() => {
                    if (!notification.isRead) {
                      markAsReadMutation.mutate(notification.id)
                    }
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center",
                        notification.isRead 
                          ? "bg-slate-100 dark:bg-slate-700" 
                          : "bg-white dark:bg-slate-800"
                      )}>
                        {notificationIcons[notification.type] || <Bell className="h-4 w-4 text-slate-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{notification.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notification.message}</p>
                          </div>
                          {!notification.isRead && (
                            <div className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0 mt-2" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                            {notificationLabels[notification.type] || "Notificação"}
                          </Badge>
                          <span className="text-[10px] text-slate-400">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </main>
    </div>
  )
}
