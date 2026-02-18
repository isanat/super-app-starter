import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Music, Bell, Clock, CheckCircle2, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function StatCard({ icon: Icon, label, value, gradient }: { icon: any; label: string; value: string | number; gradient: string }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center gap-4 p-6">
          <div className={`w-14 h-14 rounded-xl ${gradient} flex items-center justify-center shrink-0`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">{label}</p>
            <p className="text-2xl font-heading font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user, activeRole, profile } = useAuth();
  const isDirector = activeRole?.role === "director";
  const [stats, setStats] = useState({ events: 0, musicians: 0, pending: 0, notifications: 0 });
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!activeRole?.church_id) return;
    const fetchStats = async () => {
      const churchId = activeRole.church_id;
      const [eventsRes, musiciansRes, pendingRes, notifsRes, upcomingRes] = await Promise.all([
        supabase.from("events").select("id", { count: "exact", head: true }).eq("church_id", churchId),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("church_id", churchId).eq("status", "approved" as any),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("church_id", churchId).eq("status", "pending" as any),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user!.id).eq("read", false),
        supabase.from("events").select("*").eq("church_id", churchId).gte("event_date", new Date().toISOString().split("T")[0]).order("event_date").limit(5),
      ]);
      setStats({
        events: eventsRes.count || 0,
        musicians: musiciansRes.count || 0,
        pending: pendingRes.count || 0,
        notifications: notifsRes.count || 0,
      });
      setUpcomingEvents(upcomingRes.data || []);
    };
    fetchStats();
  }, [activeRole, user]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-heading font-bold">
          Olá, <span className="text-gradient">{profile?.name || "Usuário"}</span> 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          {isDirector ? "Gerencie seu ministério de louvor" : "Veja sua agenda e eventos"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Calendar} label="Eventos" value={stats.events} gradient="gradient-primary" />
        <StatCard icon={Users} label="Músicos" value={stats.musicians} gradient="gradient-cool" />
        {isDirector && <StatCard icon={Clock} label="Pendentes" value={stats.pending} gradient="gradient-warm" />}
        <StatCard icon={Bell} label="Notificações" value={stats.notifications} gradient="bg-info" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Próximos Eventos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingEvents.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum evento próximo</p>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map(event => (
                <div key={event.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center text-white font-bold text-sm">
                    {new Date(event.event_date).getDate()}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{event.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(event.event_date).toLocaleDateString("pt-BR")}
                      {event.start_time && ` • ${event.start_time.slice(0, 5)}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
