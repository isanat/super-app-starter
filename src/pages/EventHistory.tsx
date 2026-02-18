import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { History, Calendar } from "lucide-react";

export default function EventHistory() {
  const { activeRole } = useAuth();
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!activeRole?.church_id) return;
    supabase
      .from("events")
      .select("*")
      .eq("church_id", activeRole.church_id)
      .lt("event_date", new Date().toISOString().split("T")[0])
      .order("event_date", { ascending: false })
      .limit(50)
      .then(({ data }) => setEvents(data || []));
  }, [activeRole]);

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-heading font-bold mb-6">
        <span className="text-gradient">Histórico de Eventos</span>
      </h1>
      {events.length === 0 ? (
        <Card><CardContent className="text-center py-12"><History className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">Nenhum evento passado</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {events.map(event => (
            <Card key={event.id} className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="w-12 h-12 rounded-lg bg-muted flex flex-col items-center justify-center shrink-0">
                  <span className="text-lg font-bold">{new Date(event.event_date).getDate()}</span>
                  <span className="text-[9px] text-muted-foreground uppercase">{new Date(event.event_date).toLocaleDateString("pt-BR", { month: "short" })}</span>
                </div>
                <div>
                  <p className="font-semibold">{event.title}</p>
                  <p className="text-sm text-muted-foreground">{new Date(event.event_date).toLocaleDateString("pt-BR")}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
