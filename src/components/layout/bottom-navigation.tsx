"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  Home,
  Calendar,
  Users,
  User,
  Bell,
  Music,
  Plus,
} from "lucide-react"

const mobileNavigation = [
  { name: "Início", href: "/", icon: Home },
  { name: "Eventos", href: "/eventos", icon: Calendar },
  { name: "Grupos", href: "/grupos", icon: Users },
  { name: "Novo", href: "/eventos/novo", icon: Plus, isSpecial: true, directorOnly: true },
  { name: "Perfil", href: "/perfil", icon: User },
]

export function BottomNavigation() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [notifications, setNotifications] = React.useState(0)

  // Buscar notificações não lidas
  React.useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/notifications?unreadOnly=true")
        .then(res => res.json())
        .then(data => setNotifications(data.unreadCount || 0))
        .catch(() => {})
    }
  }, [session?.user?.id])

  const isDirector = session?.user?.role === "DIRECTOR" || session?.user?.role === "ADMIN"

  // Filtrar navigation baseado no role
  const visibleNavigation = mobileNavigation.filter(item => {
    if (item.directorOnly && !isDirector) return false
    return true
  })

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      {/* Safe area for iOS */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 safe-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {visibleNavigation.map((item) => {
            const isActive = pathname === item.href
            const isSpecial = item.isSpecial

            if (isSpecial) {
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex flex-col items-center justify-center -mt-6"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 active:scale-95 transition-transform">
                    <item.icon className="h-7 w-7" />
                  </div>
                  <span className="text-[10px] mt-1 text-muted-foreground font-medium">
                    {item.name}
                  </span>
                </Link>
              )
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-3 min-w-[60px] touch-target transition-colors",
                  isActive 
                    ? "text-emerald-600" 
                    : "text-muted-foreground active:text-emerald-600"
                )}
              >
                <div className="relative">
                  <item.icon className={cn(
                    "h-6 w-6 transition-transform active:scale-90",
                    isActive && "scale-110"
                  )} />
                  {item.href === "/" && notifications > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -right-2 -top-2 h-4 w-4 rounded-full p-0 text-[10px] flex items-center justify-center"
                    >
                      {notifications}
                    </Badge>
                  )}
                </div>
                <span className={cn(
                  "text-[10px] mt-1 font-medium",
                  isActive && "text-emerald-600"
                )}>
                  {item.name}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
