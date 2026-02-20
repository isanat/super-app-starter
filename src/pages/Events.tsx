import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, Trash2, Edit, Loader2, ChevronDown, ChevronUp, Users, CheckCircle2, XCircle, HelpCircle, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Musician {
  user_id: string;
  name: string;
  instruments: string[] | null;
}

interface EventMusician {
  id: string;
  user_id: string;
  instrument: string | null;
  confirmed: boolean | null;
  name?: string;
}

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
}

const INSTRUMENTS = ["Violão", "Guitarra", "Baixo", "Bateria", "Teclado", "Piano", "Voz", "Violino", "Flauta", "Trompete", "Saxofone", "Percussão", "Outro"];

export default function Events() {
  const { user, activeRole } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", event_date: "", start_time: "", end_time: "", location: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [eventMusicians, setEventMusicians] = useState<Record<string, EventMusician[]>>({});
  const [churchMusicians, setChurchMusicians] = useState<Musician[]>([]);
  const [addMusicianDialog, setAddMusicianDialog] = useState<string | null>(null); // event id
  const [selectedMusician, setSelectedMusician] = useState("");
  const [selectedInstrument, setSelectedInstrument] = useState("");
  const { toast } = useToast();

  const fetchEvents = async () => {
    if (!activeRole?.church_id) return;
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("church_id", activeRole.church_id)
      .order("event_date", { ascending: false });
    setEvents(data || []);
  };

  const fetchChurchMusicians = async () => {
    if (!activeRole?.church_id) return;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("church_id", activeRole.church_id)
      .eq("status", "approved" as any);
    if (roles && roles.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles_public" as any)
        .select("user_id, name, instruments")
        .in("user_id", roles.map(r => r.user_id));
      setChurchMusicians((profiles as unknown as Musician[]) || []);
    }
  };

  const fetchEventMusicians = async (eventId: string) => {
    const { data: assignments } = await supabase
      .from("event_musicians")
      .select("id, user_id, instrument, confirmed")
      .eq("event_id", eventId);

    if (!assignments || assignments.length === 0) {
      setEventMusicians(prev => ({ ...prev, [eventId]: [] }));
      return;
    }

    const userIds = assignments.map(a => a.user_id);
    const { data: profiles } = await supabase
      .from("profiles_public" as any)
      .select("user_id, name")
      .in("user_id", userIds);

      const merged: EventMusician[] = assignments.map(a => ({
        ...a,
        name: (profiles as unknown as any[])?.find((p: any) => p.user_id === a.user_id)?.name || "Sem nome",
      }));

    setEventMusicians(prev => ({ ...prev, [eventId]: merged }));
  };

  useEffect(() => {
    fetchEvents();
    fetchChurchMusicians();
  }, [activeRole]);

  const toggleExpanded = (eventId: string) => {
    if (expandedEventId === eventId) {
      setExpandedEventId(null);
    } else {
      setExpandedEventId(eventId);
      if (!eventMusicians[eventId]) fetchEventMusicians(eventId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeRole?.church_id) return;
    setLoading(true);
    const payload = { ...form, church_id: activeRole.church_id, created_by: user.id };

    if (editId) {
      await supabase.from("events").update(payload).eq("id", editId);
      toast({ title: "Evento atualizado!" });
    } else {
      await supabase.from("events").insert(payload);
      toast({ title: "Evento criado!" });
    }
    setLoading(false);
    setOpen(false);
    setEditId(null);
    setForm({ title: "", description: "", event_date: "", start_time: "", end_time: "", location: "" });
    fetchEvents();
  };

  const handleEdit = (event: Event) => {
    setForm({ title: event.title, description: event.description || "", event_date: event.event_date, start_time: event.start_time || "", end_time: event.end_time || "", location: event.location || "" });
    setEditId(event.id);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("events").delete().eq("id", id);
    toast({ title: "Evento removido" });
    fetchEvents();
  };

  const handleAddMusician = async () => {
    if (!addMusicianDialog || !selectedMusician) return;
    const { error } = await supabase.from("event_musicians").insert({
      event_id: addMusicianDialog,
      user_id: selectedMusician,
      instrument: selectedInstrument || null,
      confirmed: null,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Músico adicionado!" });
      fetchEventMusicians(addMusicianDialog);
    }
    setAddMusicianDialog(null);
    setSelectedMusician("");
    setSelectedInstrument("");
  };

  const handleRemoveMusician = async (eventId: string, musicianRowId: string) => {
    await supabase.from("event_musicians").delete().eq("id", musicianRowId);
    fetchEventMusicians(eventId);
    toast({ title: "Músico removido da escala" });
  };

  const confirmationSummary = (eventId: string) => {
    const list = eventMusicians[eventId] || [];
    const confirmed = list.filter(m => m.confirmed === true).length;
    const declined = list.filter(m => m.confirmed === false).length;
    const pending = list.filter(m => m.confirmed === null).length;
    return { confirmed, declined, pending, total: list.length };
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-heading font-bold"><span className="text-gradient">Eventos</span></h1>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setEditId(null); setForm({ title: "", description: "", event_date: "", start_time: "", end_time: "", location: "" }); } }}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-white gap-2"><Plus className="w-4 h-4" /> Novo Evento</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Editar Evento" : "Novo Evento"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Título</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Data</Label><Input type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Local</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Início</Label><Input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></div>
                <div className="space-y-2"><Label>Fim</Label><Input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></div>
              </div>
              <Button type="submit" className="w-full gradient-primary text-white" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? "Salvar" : "Criar Evento"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Add Musician Dialog */}
      <Dialog open={!!addMusicianDialog} onOpenChange={v => { if (!v) { setAddMusicianDialog(null); setSelectedMusician(""); setSelectedInstrument(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Escalar Músico</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Músico</Label>
              <Select value={selectedMusician} onValueChange={setSelectedMusician}>
                <SelectTrigger><SelectValue placeholder="Selecione um músico" /></SelectTrigger>
                <SelectContent>
                  {churchMusicians
                    .filter(m => !eventMusicians[addMusicianDialog!]?.some(em => em.user_id === m.user_id))
                    .map(m => (
                      <SelectItem key={m.user_id} value={m.user_id}>{m.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Instrumento (opcional)</Label>
              <Select value={selectedInstrument} onValueChange={setSelectedInstrument}>
                <SelectTrigger><SelectValue placeholder="Selecione um instrumento" /></SelectTrigger>
                <SelectContent>
                  {INSTRUMENTS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full gradient-primary text-white" onClick={handleAddMusician} disabled={!selectedMusician}>
              Escalar Músico
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {events.length === 0 ? (
        <Card><CardContent className="text-center py-12"><Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">Nenhum evento criado</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {events.map(event => {
            const isExpanded = expandedEventId === event.id;
            const summary = confirmationSummary(event.id);

            return (
              <Card key={event.id} className="overflow-hidden hover:shadow-md transition-shadow">
                {/* Event row */}
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-14 h-14 rounded-xl gradient-primary flex flex-col items-center justify-center text-white shrink-0">
                      <span className="text-xl font-bold leading-none">{new Date(event.event_date + "T12:00:00").getDate()}</span>
                      <span className="text-[9px] uppercase mt-0.5">{new Date(event.event_date + "T12:00:00").toLocaleDateString("pt-BR", { month: "short" })}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{event.title}</p>
                      <p className="text-sm text-muted-foreground">{event.start_time?.slice(0, 5)}{event.location ? ` • ${event.location}` : ""}</p>
                      {isExpanded && summary.total > 0 && (
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs text-[hsl(142,70%,35%)] font-medium">✓ {summary.confirmed}</span>
                          <span className="text-xs text-destructive font-medium">✗ {summary.declined}</span>
                          <span className="text-xs text-muted-foreground">? {summary.pending}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="text-muted-foreground" onClick={() => toggleExpanded(event.id)}>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(event)}><Edit className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(event.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </CardContent>

                {/* Expanded: musician roster */}
                {isExpanded && (
                  <div className="border-t bg-muted/30 px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1"><Users className="w-4 h-4" /> Escala de músicos</p>
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setAddMusicianDialog(event.id)}>
                        <UserPlus className="w-3 h-3" /> Escalar
                      </Button>
                    </div>

                    {!eventMusicians[event.id] ? (
                      <p className="text-xs text-muted-foreground py-2">Carregando...</p>
                    ) : eventMusicians[event.id].length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2 text-center">Nenhum músico escalado ainda</p>
                    ) : (
                      eventMusicians[event.id].map(m => (
                        <div key={m.id} className="flex items-center justify-between gap-2 bg-background rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full gradient-cool flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {m.name?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{m.name}</p>
                              {m.instrument && <p className="text-xs text-muted-foreground">{m.instrument}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {m.confirmed === true && <Badge className="gap-1 text-xs border" style={{background: "hsl(142 71% 95%)", color: "hsl(142 70% 30%)", borderColor: "hsl(142 71% 80%)"}}><CheckCircle2 className="w-3 h-3" />Confirmou</Badge>}
                            {m.confirmed === false && <Badge className="gap-1 text-xs bg-destructive/10 text-destructive border-destructive/20"><XCircle className="w-3 h-3" />Recusou</Badge>}
                            {m.confirmed === null && <Badge variant="secondary" className="gap-1 text-xs"><HelpCircle className="w-3 h-3" />Pendente</Badge>}
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive shrink-0" onClick={() => handleRemoveMusician(event.id, m.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
