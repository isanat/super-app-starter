import { useAuth } from "@/lib/auth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Church as ChurchIcon, Save, Loader2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Church() {
  const { activeRole } = useAuth();
  const [church, setChurch] = useState<any>(null);
  const [form, setForm] = useState({ name: "", address: "", city: "", state: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!activeRole?.church_id) return;
    supabase.from("churches").select("*").eq("id", activeRole.church_id).single().then(({ data }) => {
      if (data) { setChurch(data); setForm({ name: data.name || "", address: data.address || "", city: data.city || "", state: data.state || "", phone: data.phone || "" }); }
    });
  }, [activeRole]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!church) return;
    setLoading(true);
    await supabase.from("churches").update(form).eq("id", church.id);
    setLoading(false);
    toast({ title: "Igreja atualizada!" });
  };

  const copyId = () => {
    if (church) { navigator.clipboard.writeText(church.name); toast({ title: "Nome copiado!" }); }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-3xl font-heading font-bold mb-6"><span className="text-gradient">Minha Igreja</span></h1>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl gradient-warm flex items-center justify-center"><ChurchIcon className="w-7 h-7 text-white" /></div>
            <div>
              <CardTitle>{church?.name || "Carregando..."}</CardTitle>
              <button onClick={copyId} className="text-xs text-muted-foreground flex items-center gap-1 hover:text-primary mt-1">
                <Copy className="w-3 h-3" /> Copiar nome (para músicos entrarem)
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Endereço</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
              <div className="space-y-2"><Label>Cidade</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Estado</Label><Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} /></div>
              <div className="space-y-2"><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <Button type="submit" className="gradient-primary text-white" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Salvar</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
