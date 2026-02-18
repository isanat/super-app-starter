import { useAuth } from "@/lib/auth";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, User, Calendar, History, Users, UserCheck, Church,
  Vote, BarChart3, Bell, LogOut, Music, Menu, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

const musicianLinks = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/profile", icon: User, label: "Meu Perfil" },
  { to: "/agenda", icon: Calendar, label: "Agenda" },
  { to: "/history", icon: History, label: "Histórico" },
  { to: "/notifications", icon: Bell, label: "Notificações" },
];

const directorLinks = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/profile", icon: User, label: "Meu Perfil" },
  { to: "/approve", icon: UserCheck, label: "Aprovar Músicos" },
  { to: "/musicians", icon: Users, label: "Buscar Músicos" },
  { to: "/events", icon: Calendar, label: "Eventos" },
  { to: "/church", icon: Church, label: "Minha Igreja" },
  { to: "/voting", icon: Vote, label: "Votação" },
  { to: "/stats", icon: BarChart3, label: "Estatísticas" },
  { to: "/notifications", icon: Bell, label: "Notificações" },
];

export default function AppSidebar() {
  const { activeRole, signOut, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const isDirector = activeRole?.role === "director";
  const links = isDirector ? directorLinks : musicianLinks;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full gradient-warm flex items-center justify-center">
            <Music className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-sidebar-foreground text-lg">Louvor</h2>
            <span className="text-xs text-sidebar-foreground/60 capitalize">
              {isDirector ? "🎯 Diretor" : "🎵 Músico"}
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={() => setOpen(false)}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all",
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <link.icon className="w-5 h-5" />
            {link.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-4 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-accent-foreground text-sm font-bold">
            {profile?.name?.[0]?.toUpperCase() || "?"}
          </div>
          <span className="text-sm text-sidebar-foreground/80 truncate">{profile?.name || "Usuário"}</span>
        </div>
        <Button variant="ghost" onClick={signOut} className="w-full justify-start gap-3 text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10">
          <LogOut className="w-4 h-4" />
          Sair
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden w-10 h-10 rounded-lg gradient-primary text-white flex items-center justify-center shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 gradient-sidebar animate-slide-in">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-sidebar-foreground/60 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 gradient-sidebar">
        {sidebarContent}
      </aside>
    </>
  );
}
