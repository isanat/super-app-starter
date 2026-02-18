import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Plus, Trash2, Edit, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Events() {
  const { user, activeRole } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", event_date: "", start_time: "", end_time: "", location: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchEvents = async () => {
    if (!activeRole?.church_id) return;
    const { data } = await supabase.from("events").select("*").eq("church_id", activeRole.church_id).order("event_date", { ascending: false });
    setEvents(data || []);
  };

  useEffect(() => { fetchEvents(); }, [activeRole]);

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

  const handleEdit = (event: any) => {
    setForm({ title: event.title, description: event.description || "", event_date: event.event_date, start_time: event.start_time || "", end_time: event.end_time || "", location: event.location || "" });
    setEditId(event.id);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("events").delete().eq("id", id);
    toast({ title: "Evento removido" });
    fetchEvents();
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

      {events.length === 0 ? (
        <Card><CardContent className="text-center py-12"><Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">Nenhum evento criado</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {events.map(event => (
            <Card key={event.id} className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl gradient-primary flex flex-col items-center justify-center text-white shrink-0">
                    <span className="text-xl font-bold">{new Date(event.event_date).getDate()}</span>
                    <span className="text-[9px] uppercase">{new Date(event.event_date).toLocaleDateString("pt-BR", { month: "short" })}</span>
                  </div>
                  <div>
                    <p className="font-semibold">{event.title}</p>
                    <p className="text-sm text-muted-foreground">{event.start_time?.slice(0, 5)} {event.location && `• ${event.location}`}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(event)}><Edit className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(event.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
