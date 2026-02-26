"use client"

import { useRouter } from "next/navigation"
import { 
  Home, Calendar, Users, Bell, User, 
  Music, MoreHorizontal
} from "lucide-react"
import { useSession } from "next-auth/react"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface QuickAction {
  id: string
  label: string
  icon: React.ReactNode
  onClick: () => void
  variant?: "default" | "primary" | "inactive"
  badge?: number
  inactive?: boolean
}

interface QuickActionsFooterProps {
  actions?: QuickAction[]
  userType?: "director" | "musician"
  onNewEvent?: () => void
  onInvite?: () => void
  pendingCount?: number
  notificationCount?: number
}

export function QuickActionsFooter({
  userType = "musician",
  onNewEvent,
  onInvite,
  pendingCount = 0,
  notificationCount = 0,
}: QuickActionsFooterProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState("home")

  const directorActions = [
    { id: "home", label: "Início", icon: <Home className="h-5 w-5" />, onClick: () => router.push("/") },
    { id: "events", label: "Eventos", icon: <Calendar className="h-5 w-5" />, onClick: () => router.push("/eventos") },
    { id: "add", label: "Novo", icon: <Music className="h-5 w-5" />, onClick: () => router.push("/eventos/novo"), variant: "primary" as const },
    { id: "musicians", label: "Músicos", icon: <Users className="h-5 w-5" />, onClick: () => router.push("/musicos") },
    { id: "profile", label: "Perfil", icon: <User className="h-5 w-5" />, onClick: () => router.push("/perfil") },
  ]

  const musicianActions = [
    { id: "home", label: "Início", icon: <Home className="h-5 w-5" />, onClick: () => router.push("/") },
    { id: "events", label: "Eventos", icon: <Calendar className="h-5 w-5" />, onClick: () => router.push("/eventos"), badge: pendingCount },
    { id: "notifications", label: "Avisos", icon: <Bell className="h-5 w-5" />, onClick: () => router.push("/notificacoes"), badge: notificationCount },
    { id: "more", label: "Mais", icon: <MoreHorizontal className="h-5 w-5" />, onClick: () => {}, variant: "inactive" as const, inactive: true },
    { id: "profile", label: "Perfil", icon: <User className="h-5 w-5" />, onClick: () => router.push("/perfil") },
  ]

  const actions = userType === "director" ? directorActions : musicianActions

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-700 safe-bottom">
      {/* Quick Actions Bar */}
      <div className="max-w-lg mx-auto px-2 py-2">
        <div className="flex items-center justify-around">
          {actions.map((action) => {
            const isPrimary = action.variant === "primary"
            const isInactive = action.variant === "inactive"
            const isActive = activeTab === action.id
            
            return (
              <button
                key={action.id}
                onClick={() => {
                  if (isInactive) return
                  setActiveTab(action.id)
                  action.onClick()
                }}
                disabled={isInactive}
                className={cn(
                  "relative flex flex-col items-center justify-center min-w-[60px] py-2 px-3 rounded-xl transition-all duration-200",
                  isInactive && "opacity-40 cursor-not-allowed",
                  isPrimary 
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 -mt-6 rounded-2xl min-w-[72px] py-3 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-105 active:scale-95" 
                    : isActive 
                      ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50" 
                      : "text-slate-500 dark:text-slate-400 hover:text-emerald-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                {isPrimary ? (
                  <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                    {action.icon}
                  </div>
                ) : (
                  <div className="relative">
                    {action.icon}
                    {action.badge && action.badge > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                        {action.badge > 9 ? "9+" : action.badge}
                      </span>
                    )}
                  </div>
                )}
                <span className={cn(
                  "text-xs font-medium mt-1",
                  isPrimary ? "text-white" : ""
                )}>
                  {action.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </footer>
  )
}

// Floating Action Button for quick actions
export function FloatingActionButton({
  onClick,
  icon = <Music className="h-6 w-6" />,
  label = "Adicionar",
  className,
}: {
  onClick: () => void
  icon?: React.ReactNode
  label?: string
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed right-4 bottom-24 z-40 flex items-center gap-2 px-4 py-3 rounded-full",
        "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white",
        "shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40",
        "hover:scale-105 active:scale-95 transition-all duration-200",
        "animate-in slide-in-from-right-5 fade-in duration-300",
        className
      )}
    >
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </button>
  )
}

// Quick Action Card for dashboard
export function QuickActionCard({
  title,
  description,
  icon,
  onClick,
  variant = "default",
  badge,
}: {
  title: string
  description: string
  icon: React.ReactNode
  onClick: () => void
  variant?: "default" | "success" | "warning" | "danger"
  badge?: number
}) {
  const variants = {
    default: "from-slate-500 to-slate-600",
    success: "from-emerald-500 to-emerald-600",
    warning: "from-orange-500 to-orange-600",
    danger: "from-red-500 to-red-600",
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-100 dark:border-slate-700 active:scale-[0.98]"
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "h-12 w-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform duration-300",
          variants[variant]
        )}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 dark:text-white truncate">{title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{description}</p>
        </div>
        {badge !== undefined && badge > 0 && (
          <span className="h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center animate-pulse">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}
