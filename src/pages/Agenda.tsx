import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, CheckCircle2, XCircle, HelpCircle, Music2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EventEntry {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  musicianId: string; // event_musicians.id
  instrument: string | null;
  confirmed: boolean | null; // null = pending
}

export default function Agenda() {
  const { user, activeRole } = useAuth();
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEvents = async () => {
    if (!user || !activeRole?.church_id) return;
    // Get event_musicians rows for this user
    const { data: assignments } = await supabase
      .from("event_musicians")
      .select("id, event_id, instrument, confirmed")
      .eq("user_id", user.id);

    if (!assignments || assignments.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const eventIds = assignments.map(a => a.event_id);
    const { data: evts } = await supabase
      .from("events")
      .select("*")
      .in("id", eventIds)
      .gte("event_date", new Date().toISOString().split("T")[0])
      .order("event_date");

    const merged: EventEntry[] = (evts || []).map(ev => {
      const assignment = assignments.find(a => a.event_id === ev.id)!;
      return {
        ...ev,
        musicianId: assignment.id,
        instrument: assignment.instrument,
        confirmed: assignment.confirmed,
      };
    });

    setEvents(merged);
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, [user, activeRole]);

  const handleConfirm = async (musicianId: string, value: boolean) => {
    const { error } = await supabase
      .from("event_musicians")
      .update({ confirmed: value })
      .eq("id", musicianId);

    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: value ? "✅ Presença confirmada!" : "❌ Presença recusada" });
      fetchEvents();
    }
  };


  const handleCancelParticipation = async (eventId: string) => {
    if (!user) return;

    const confirmCancel = window.confirm("Tem certeza? Cancelamentos de última hora afetam sua reputação no app.");
    if (!confirmCancel) return;

    const { error: deleteError } = await supabase
      .from("event_musicians")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", user.id);

    if (deleteError) {
      toast({ title: "Erro ao cancelar", description: deleteError.message, variant: "destructive" });
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("cancellation_count")
      .eq("user_id", user.id)
      .single();

    const nextCount = (profileData?.cancellation_count || 0) + 1;

    await supabase
      .from("profiles")
      .update({ cancellation_count: nextCount })
      .eq("user_id", user.id);

    toast({ title: "Participação cancelada", description: "Sua pontuação de cancelamentos foi atualizada." });
    fetchEvents();
  };
  const getStatusBadge = (confirmed: boolean | null) => {
    if (confirmed === true)
      return <Badge className="gap-1 border" style={{background:"hsl(142 71% 95%)", color:"hsl(142 70% 30%)", borderColor:"hsl(142 71% 80%)"}}><CheckCircle2 className="w-3 h-3" />Confirmado</Badge>;
    if (confirmed === false)
      return <Badge className="gap-1 bg-destructive/10 text-destructive border-destructive/20"><XCircle className="w-3 h-3" />Recusado</Badge>;
    return <Badge variant="secondary" className="gap-1"><HelpCircle className="w-3 h-3" />Pendente</Badge>;
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-heading font-bold mb-6">
        <span className="text-gradient">Minha Agenda</span>
      </h1>

      {loading ? (
        <p className="text-muted-foreground text-center py-12">Carregando...</p>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">Você não está escalado para nenhum evento</p>
            <p className="text-sm text-muted-foreground mt-1">O diretor irá te escalar quando houver eventos</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.map(event => (
            <Card key={event.id} className={`hover:shadow-lg transition-all ${event.confirmed === true ? "border-[hsl(142,71%,80%)]" : event.confirmed === false ? "border-destructive/30" : ""}`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {/* Date box */}
                  <div className="w-16 h-16 rounded-xl gradient-primary flex flex-col items-center justify-center text-white shrink-0">
                    <span className="text-2xl font-bold leading-none">{new Date(event.event_date + "T12:00:00").getDate()}</span>
                    <span className="text-[10px] uppercase mt-0.5">{new Date(event.event_date + "T12:00:00").toLocaleDateString("pt-BR", { month: "short" })}</span>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h3 className="font-heading font-bold text-lg">{event.title}</h3>
                      {getStatusBadge(event.confirmed)}
                    </div>
                    {event.description && <p className="text-sm text-muted-foreground mt-1">{event.description}</p>}

                    <div className="flex flex-wrap gap-2 mt-2">
                      {event.start_time && (
                        <Badge variant="outline" className="gap-1 text-xs"><Clock className="w-3 h-3" />{event.start_time.slice(0, 5)}{event.end_time ? ` – ${event.end_time.slice(0, 5)}` : ""}</Badge>
                      )}
                      {event.location && (
                        <Badge variant="outline" className="gap-1 text-xs"><MapPin className="w-3 h-3" />{event.location}</Badge>
                      )}
                      {event.instrument && (
                        <Badge variant="outline" className="gap-1 text-xs"><Music2 className="w-3 h-3" />{event.instrument}</Badge>
                      )}
                    </div>

                    {/* Confirm / Decline buttons */}
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <Button
                        size="sm"
                        variant={event.confirmed === true ? "default" : "outline"}
                        className={event.confirmed === true ? "gap-1" : "gap-1 text-muted-foreground"}
                        onClick={() => handleConfirm(event.musicianId, true)}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {event.confirmed === true ? "Confirmado" : "Confirmar"}
                      </Button>
                      <Button
                        size="sm"
                        variant={event.confirmed === false ? "destructive" : "outline"}
                        className={event.confirmed === false ? "gap-1" : "gap-1 text-red-600 border-red-300 hover:bg-red-50"}
                        onClick={() => handleConfirm(event.musicianId, false)}
                      >
                        <XCircle className="w-4 h-4" />
                        {event.confirmed === false ? "Recusado" : "Recusar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-amber-700 border-amber-300 hover:bg-amber-50"
                        onClick={() => handleCancelParticipation(event.id)}
                      >
                        <AlertTriangle className="w-4 h-4" />
                        Cancelar participação
                      </Button>
                    </div>
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
