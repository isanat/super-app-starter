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
  Settings,
  Menu,
  Bell,
  LogOut,
  Music,
  Church,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Eventos", href: "/eventos", icon: Calendar },
  { name: "Músicos", href: "/musicos", icon: Users },
  { name: "Perfil", href: "/perfil", icon: User },
  { name: "Configurações", href: "/configuracoes", icon: Settings },
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  const user = session.user
  const isDirector = user.role === "DIRECTOR" || user.role === "ADMIN"

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r bg-card lg:block">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 border-b px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Music className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-lg leading-tight">Louvor</span>
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
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Church Info */}
          {user.church?.name && (
            <div className="border-t p-4">
              <div className="flex items-center gap-3 rounded-lg bg-accent/50 px-3 py-2">
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
              <div className="flex items-center gap-3 rounded-lg bg-destructive/10 px-3 py-2">
                <div className="flex flex-col">
                  <span className="text-xs text-destructive">Pontos de penalização</span>
                  <span className="text-sm font-medium text-destructive">{user.penaltyPoints}/10</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-card px-4 lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Abrir menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex h-full flex-col">
              {/* Logo */}
              <div className="flex h-16 items-center gap-2 border-b px-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Music className="h-6 w-6" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-lg leading-tight">Louvor</span>
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
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>

              {/* Church Info */}
              {user.church?.name && (
                <div className="border-t p-4">
                  <div className="flex items-center gap-3 rounded-lg bg-accent/50 px-3 py-2">
                    <Church className="h-5 w-5 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Igreja</span>
                      <span className="text-sm font-medium">{user.church.name}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex flex-1 items-center gap-2">
          <Music className="h-6 w-6 text-primary" />
          <span className="font-semibold">Louvor Conectado</span>
        </div>

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
      </div>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Desktop Header */}
        <header className="sticky top-0 z-30 hidden h-16 items-center justify-between border-b bg-card px-6 lg:flex">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">
              {navigation.find((n) => n.href === pathname)?.name || "Dashboard"}
            </h1>
          </div>

          <div className="flex items-center gap-4">
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
                    <AvatarFallback>
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
                  <Link href="/configuracoes">
                    <Settings className="mr-2 h-4 w-4" />
                    Configurações
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
