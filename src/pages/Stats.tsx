import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, Calendar, Music } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["hsl(262,83%,58%)", "hsl(330,85%,60%)", "hsl(174,72%,46%)", "hsl(38,92%,50%)", "hsl(199,89%,48%)"];

export default function Stats() {
  const { activeRole } = useAuth();
  const [eventsByMonth, setEventsByMonth] = useState<any[]>([]);
  const [instrumentData, setInstrumentData] = useState<any[]>([]);
  const [totalMusicians, setTotalMusicians] = useState(0);
  const [totalEvents, setTotalEvents] = useState(0);

  useEffect(() => {
    if (!activeRole?.church_id) return;
    const fetch = async () => {
      const churchId = activeRole.church_id;

      // Events by month
      const { data: events } = await supabase.from("events").select("event_date").eq("church_id", churchId);
      const months: Record<string, number> = {};
      events?.forEach(e => {
        const m = new Date(e.event_date).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
        months[m] = (months[m] || 0) + 1;
      });
      setEventsByMonth(Object.entries(months).map(([name, total]) => ({ name, total })));
      setTotalEvents(events?.length || 0);

      // Musicians & instruments
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("church_id", churchId).eq("status", "approved" as any);
      setTotalMusicians(roles?.length || 0);
      if (roles && roles.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("instruments").in("user_id", roles.map(r => r.user_id));
        const instCount: Record<string, number> = {};
        profiles?.forEach(p => p.instruments?.forEach((i: string) => { instCount[i] = (instCount[i] || 0) + 1; }));
        setInstrumentData(Object.entries(instCount).map(([name, value]) => ({ name, value })));
      }
    };
    fetch();
  }, [activeRole]);

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-heading font-bold mb-6"><span className="text-gradient">Estatísticas</span></h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card><CardContent className="flex items-center gap-4 p-6"><div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center"><Calendar className="w-6 h-6 text-white" /></div><div><p className="text-sm text-muted-foreground">Total Eventos</p><p className="text-2xl font-bold">{totalEvents}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-6"><div className="w-12 h-12 rounded-xl gradient-cool flex items-center justify-center"><Users className="w-6 h-6 text-white" /></div><div><p className="text-sm text-muted-foreground">Total Membros</p><p className="text-2xl font-bold">{totalMusicians}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-6"><div className="w-12 h-12 rounded-xl gradient-warm flex items-center justify-center"><Music className="w-6 h-6 text-white" /></div><div><p className="text-sm text-muted-foreground">Instrumentos</p><p className="text-2xl font-bold">{instrumentData.length}</p></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" />Eventos por Mês</CardTitle></CardHeader>
          <CardContent>
            {eventsByMonth.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={eventsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(262,83%,58%)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Music className="w-5 h-5 text-secondary" />Instrumentos</CardTitle></CardHeader>
          <CardContent>
            {instrumentData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={instrumentData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label>
                    {instrumentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
