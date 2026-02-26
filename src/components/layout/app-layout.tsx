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
  BarChart3,
  Target,
} from "lucide-react"
import { BottomNavigation } from "./bottom-navigation"
import { ThemeToggle } from "@/components/theme-toggle"

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Eventos", href: "/eventos", icon: Calendar },
  { name: "Grupos", href: "/grupos", icon: Users },
  { name: "Músicos", href: "/musicos", icon: Users, directorOnly: true },
  { name: "Compromissos", href: "/compromissos", icon: Target },
  { name: "Relatórios", href: "/relatorios", icon: BarChart3, directorOnly: true },
  { name: "Perfil", href: "/perfil", icon: User },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()
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

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push("/login")
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
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
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r bg-white dark:bg-slate-800 lg:block">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 border-b px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg">
              <Music className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-tight">Louvor</span>
              <span className="text-xs text-muted-foreground leading-tight">Conectado</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-emerald-600 text-white shadow-md"
                      : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
            
            {isDirector && (
              <Link
                href="/eventos/novo"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800 mt-4"
              >
                <Plus className="h-5 w-5" />
                Novo Evento
              </Link>
            )}
          </nav>

          {/* Church Info */}
          {user.church?.name && (
            <div className="border-t p-4">
              <div className="flex items-center gap-3 rounded-lg bg-slate-100 dark:bg-slate-700 px-3 py-2">
                <Church className="h-5 w-5 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Igreja</span>
                  <span className="text-sm font-medium">{user.church.name}</span>
                </div>
              </div>
            </div>
          )}

          {/* Penalty Warning */}
          {user.penaltyPoints > 0 && (
            <div className="border-t p-4">
              <div className="flex items-center gap-3 rounded-lg bg-red-50 dark:bg-red-950 px-3 py-2">
                <div className="flex flex-col">
                  <span className="text-xs text-red-600 dark:text-red-400">Pontos de penalização</span>
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">{user.penaltyPoints}/9</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-white dark:bg-slate-800 px-4 lg:hidden shadow-sm">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Abrir menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex h-full flex-col">
              {/* Logo */}
              <div className="flex h-16 items-center gap-2 border-b px-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg">
                  <Music className="h-6 w-6" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-lg leading-tight">Louvor</span>
                  <span className="text-xs text-muted-foreground leading-tight">Conectado</span>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 space-y-1 p-4">
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-emerald-600 text-white"
                          : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  )
                })}
                
                {isDirector && (
                  <Link
                    href="/eventos/novo"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300"
                  >
                    <Plus className="h-5 w-5" />
                    Novo Evento
                  </Link>
                )}
              </nav>

              {/* Church Info */}
              {user.church?.name && (
                <div className="border-t p-4">
                  <div className="flex items-center gap-3 rounded-lg bg-slate-100 dark:bg-slate-700 px-3 py-2">
                    <Church className="h-5 w-5 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Igreja</span>
                      <span className="text-sm font-medium">{user.church.name}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Logout */}
              <div className="border-t p-4">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Sair
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex flex-1 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Music className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sm">Louvor Conectado</span>
        </div>

        <ThemeToggle />

        <Button variant="ghost" size="icon" className="relative h-10 w-10">
          <Bell className="h-5 w-5" />
          {notifications > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {notifications}
            </Badge>
          )}
        </Button>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Desktop Header */}
        <header className="sticky top-0 z-30 hidden h-16 items-center justify-between border-b bg-white dark:bg-slate-800 px-6 lg:flex">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">
              {navigation.find((n) => n.href === pathname)?.name || "Dashboard"}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {notifications > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                >
                  {notifications}
                </Badge>
              )}
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar || undefined} alt={user.name || ""} />
                    <AvatarFallback className="bg-emerald-600 text-white">
                      {user.name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    <Badge variant="secondary" className="w-fit mt-2">
                      {user.role === "DIRECTOR" ? "Diretor" : 
                       user.role === "ADMIN" ? "Admin" : 
                       user.role === "SINGER" ? "Cantor" :
                       user.role === "INSTRUMENTALIST" ? "Instrumentalista" : "Músico"}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/perfil">
                    <User className="mr-2 h-4 w-4" />
                    Meu Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/compromissos">
                    <Target className="mr-2 h-4 w-4" />
                    Meus Compromissos
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6 pb-mobile">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNavigation />
    </div>
  )
}
