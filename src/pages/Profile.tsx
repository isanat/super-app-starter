import { useAuth } from "@/lib/auth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [bio, setBio] = useState("");
  const [instruments, setInstruments] = useState<string[]>([]);
  const [newInstrument, setNewInstrument] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setPhone(profile.phone || "");
      setWhatsapp(profile.whatsapp || "");
      setCity(profile.city || "");
      setState(profile.state || "");
      setBio(profile.bio || "");
      setInstruments(profile.instruments || []);
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ name, phone, whatsapp, city, state, bio, instruments } as any)
      .eq("user_id", user.id);
    setLoading(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      await refreshProfile();
      toast({ title: "Perfil atualizado!" });
    }
  };

  const addInstrument = () => {
    if (newInstrument.trim() && !instruments.includes(newInstrument.trim())) {
      setInstruments([...instruments, newInstrument.trim()]);
      setNewInstrument("");
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-3xl font-heading font-bold mb-6">
        <span className="text-gradient">Meu Perfil</span>
      </h1>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-white text-2xl font-bold">
              {name?.[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <CardTitle>{name || "Seu Nome"}</CardTitle>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="(11) 99999-9999" />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Sua cidade" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Estado (UF)</Label>
              <Input value={state} onChange={e => setState(e.target.value.toUpperCase())} placeholder="SP" maxLength={2} />
            </div>
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Fale um pouco sobre você..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Instrumentos</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {instruments.map(inst => (
                  <Badge key={inst} variant="secondary" className="gap-1 px-3 py-1">
                    {inst}
                    <button type="button" onClick={() => setInstruments(instruments.filter(i => i !== inst))}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={newInstrument} onChange={e => setNewInstrument(e.target.value)} placeholder="Adicionar instrumento"
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addInstrument(); } }} />
                <Button type="button" variant="outline" size="icon" onClick={addInstrument}><Plus className="w-4 h-4" /></Button>
              </div>
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
