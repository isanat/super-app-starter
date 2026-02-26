"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  Home,
  Calendar,
  Users,
  User,
  Menu,
  Bell,
  LogOut,
  Music,
  Church,
  Plus,
  Settings,
  UserCircle,
} from "lucide-react"
import { BottomNavigation } from "./bottom-navigation"
import { ThemeToggle } from "@/components/theme-toggle"

// Simplified navigation - only for desktop sidebar
const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Eventos", href: "/eventos", icon: Calendar },
  { name: "Grupos", href: "/grupos", icon: Users },
  { name: "Músicos", href: "/musicos", icon: UserCircle, directorOnly: true },
  { name: "Configurações", href: "/configuracoes", icon: Settings, directorOnly: true },
  { name: "Meu Perfil", href: "/perfil", icon: User },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [notifications, setNotifications] = React.useState(0)

  // Fetch unread notifications
  React.useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/notifications?unreadOnly=true")
        .then(res => res.json())
        .then(data => setNotifications(data.unreadCount || 0))
        .catch(() => {})
    }
  }, [session?.user?.id])

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push("/login")
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-emerald-500 border-t-transparent"></div>
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  const user = session.user
  const isDirector = user.role === "DIRECTOR" || user.role === "ADMIN"

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-60 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 lg:block">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-14 items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 px-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white">
              <Music className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm">Louvor</span>
              <span className="text-[10px] text-slate-500 -mt-0.5">Conectado</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-0.5 p-2">
            {navigation.map((item) => {
              if (item.directorOnly && !isDirector) return null
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
            
            {isDirector && (
              <Link
                href="/eventos/novo"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 mt-2"
              >
                <Plus className="h-4 w-4" />
                Novo Evento
              </Link>
            )}
          </nav>

          {/* Church Info */}
          {user.church?.name && (
            <div className="border-t border-slate-200 dark:border-slate-800 p-3">
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2">
                <Church className="h-4 w-4 text-slate-400" />
                <span className="text-xs text-slate-600 dark:text-slate-300 truncate">{user.church.name}</span>
              </div>
            </div>
          )}

          {/* Points Warning */}
          {(user.penaltyPoints || 0) > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-800 p-3">
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 px-3 py-2">
                <span className="text-xs text-amber-700 dark:text-amber-300">
                  <span className="font-medium">{user.penaltyPoints}/9</span> pontos de atenção
                </span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Header - Only on some pages */}
      <div className="lg:hidden">
        {/* This is handled by individual dashboards now */}
      </div>

      {/* Main Content */}
      <div className="lg:pl-60">
        {/* Desktop Header */}
        <header className="sticky top-0 z-30 hidden h-14 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 lg:flex">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold">
              {navigation.find((n) => n.href === pathname)?.name || "Dashboard"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            <Button variant="ghost" size="icon" className="relative h-8 w-8">
              <Bell className="h-4 w-4" />
              {notifications > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -right-1 -top-1 h-4 w-4 rounded-full p-0 text-[9px] flex items-center justify-center"
                >
                  {notifications}
                </Badge>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar || undefined} alt={user.name || ""} />
                    <AvatarFallback className="bg-emerald-500 text-white text-xs">
                      {user.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-52" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/perfil" className="text-sm">
                    <User className="mr-2 h-3.5 w-3.5" />
                    Meu Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 text-sm">
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="lg:p-4">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNavigation />
    </div>
  )
}
