import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Agenda() {
  const { user, activeRole } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeRole?.church_id) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("church_id", activeRole.church_id)
        .gte("event_date", new Date().toISOString().split("T")[0])
        .order("event_date");
      setEvents(data || []);
      setLoading(false);
    };
    fetch();
  }, [activeRole]);

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-heading font-bold mb-6">
        <span className="text-gradient">Agenda</span>
      </h1>

      {loading ? (
        <p className="text-muted-foreground text-center py-12">Carregando...</p>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum evento agendado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.map(event => (
            <Card key={event.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="flex items-start gap-4 p-6">
                <div className="w-16 h-16 rounded-xl gradient-primary flex flex-col items-center justify-center text-white shrink-0">
                  <span className="text-2xl font-bold">{new Date(event.event_date).getDate()}</span>
                  <span className="text-[10px] uppercase">{new Date(event.event_date).toLocaleDateString("pt-BR", { month: "short" })}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-bold text-lg">{event.title}</h3>
                  {event.description && <p className="text-sm text-muted-foreground mt-1">{event.description}</p>}
                  <div className="flex flex-wrap gap-3 mt-3">
                    {event.start_time && (
                      <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />{event.start_time.slice(0, 5)}</Badge>
                    )}
                    {event.location && (
                      <Badge variant="secondary" className="gap-1"><MapPin className="w-3 h-3" />{event.location}</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
