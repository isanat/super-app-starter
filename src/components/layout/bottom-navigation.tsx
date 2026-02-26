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
  Plus,
} from "lucide-react"

const mobileNavigation = [
  { name: "Início", href: "/", icon: Home },
  { name: "Eventos", href: "/eventos", icon: Calendar },
  { name: "Novo", href: "/eventos/novo", icon: Plus, isSpecial: true, directorOnly: true },
  { name: "Grupos", href: "/grupos", icon: Users },
  { name: "Perfil", href: "/perfil", icon: User },
]

export function BottomNavigation() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const isDirector = session?.user?.role === "DIRECTOR" || session?.user?.role === "ADMIN"

  // Filter navigation based on role
  const visibleNavigation = mobileNavigation.filter(item => {
    if (item.directorOnly && !isDirector) return false
    return true
  })

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      {/* Safe area for iOS */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 safe-bottom">
        <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-1">
          {visibleNavigation.map((item) => {
            const isActive = pathname === item.href
            const isSpecial = item.isSpecial

            if (isSpecial) {
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex flex-col items-center justify-center -mt-5"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg active:scale-95 transition-transform">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="text-[9px] mt-0.5 text-slate-500 font-medium">
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
                  "flex flex-col items-center justify-center py-1.5 px-3 min-w-[48px] transition-colors",
                  isActive 
                    ? "text-emerald-600 dark:text-emerald-400" 
                    : "text-slate-400 dark:text-slate-500"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 transition-transform",
                  isActive && "scale-110"
                )} />
                <span className={cn(
                  "text-[9px] mt-0.5 font-medium",
                  isActive && "text-emerald-600 dark:text-emerald-400"
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
