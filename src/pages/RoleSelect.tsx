import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Music, Crown, Loader2, Church } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function RoleSelect() {
  const { user, refreshRoles, refreshProfile } = useAuth();
  const [step, setStep] = useState<"role" | "church">("role");
  const [selectedRole, setSelectedRole] = useState<"director" | "musician" | null>(null);
  const [churchName, setChurchName] = useState("");
  const [churchCode, setChurchCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleRoleSelect = (role: "director" | "musician") => {
    setSelectedRole(role);
    setStep("church");
  };

  const handleDirectorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !churchName.trim()) return;
    setLoading(true);

    // Create church
    const { data: church, error: churchErr } = await supabase
      .from("churches")
      .insert({ name: churchName.trim() })
      .select()
      .single();

    if (churchErr || !church) {
      toast({ title: "Erro ao criar igreja", description: churchErr?.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Update profile with church
    await supabase.from("profiles").update({ church_id: church.id }).eq("user_id", user.id);

    // Create role (director auto-approved)
    const { error: roleErr } = await supabase
      .from("user_roles")
      .insert({ user_id: user.id, church_id: church.id, role: "director" as any, status: "approved" as any });

    if (roleErr) {
      toast({ title: "Erro ao criar perfil", description: roleErr.message, variant: "destructive" });
    } else {
      await refreshRoles();
      await refreshProfile();
      toast({ title: "Igreja criada!", description: "Você é o diretor desta igreja." });
      navigate("/");
    }
    setLoading(false);
  };

  const handleMusicianSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !churchCode.trim()) return;
    setLoading(true);

    // Try to find church by ID or name
    const { data: church } = await supabase
      .from("churches")
      .select("id")
      .or(`id.eq.${churchCode.trim()},name.ilike.%${churchCode.trim()}%`)
      .single();

    if (!church) {
      toast({ title: "Igreja não encontrada", description: "Verifique o código ou nome.", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Update profile
    await supabase.from("profiles").update({ church_id: church.id }).eq("user_id", user.id);

    // Create role (pending approval)
    const { error: roleErr } = await supabase
      .from("user_roles")
      .insert({ user_id: user.id, church_id: church.id, role: "musician" as any, status: "pending" as any });

    if (roleErr) {
      toast({ title: "Erro", description: roleErr.message, variant: "destructive" });
    } else {
      await refreshRoles();
      await refreshProfile();
      toast({ title: "Solicitação enviada!", description: "Aguarde a aprovação do diretor." });
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-primary">
      <div className="w-full max-w-lg animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading font-bold text-white">Escolha seu Perfil</h1>
          <p className="text-white/80 mt-2">Como você vai usar o app?</p>
        </div>

        {step === "role" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="cursor-pointer hover:scale-105 transition-transform border-2 hover:border-primary" onClick={() => handleRoleSelect("director")}>
              <CardContent className="flex flex-col items-center justify-center py-10 gap-4">
                <div className="w-20 h-20 rounded-full gradient-warm flex items-center justify-center">
                  <Crown className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-xl">Diretor</CardTitle>
                <CardDescription className="text-center">Crie e gerencie o ministério de louvor da sua igreja</CardDescription>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:scale-105 transition-transform border-2 hover:border-secondary" onClick={() => handleRoleSelect("musician")}>
              <CardContent className="flex flex-col items-center justify-center py-10 gap-4">
                <div className="w-20 h-20 rounded-full gradient-cool flex items-center justify-center">
                  <Music className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-xl">Músico</CardTitle>
                <CardDescription className="text-center">Participe do ministério de louvor da sua igreja</CardDescription>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "church" && selectedRole === "director" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Church className="w-5 h-5" /> Criar sua Igreja</CardTitle>
              <CardDescription>Cadastre o nome da sua igreja para começar</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDirectorSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome da Igreja</Label>
                  <Input value={churchName} onChange={e => setChurchName(e.target.value)} placeholder="Ex: Igreja Comunidade Viva" required />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep("role")}>Voltar</Button>
                  <Button type="submit" className="flex-1 gradient-primary text-white" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Igreja"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "church" && selectedRole === "musician" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Music className="w-5 h-5" /> Entrar numa Igreja</CardTitle>
              <CardDescription>Digite o nome da igreja que deseja participar</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleMusicianSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome da Igreja</Label>
                  <Input value={churchCode} onChange={e => setChurchCode(e.target.value)} placeholder="Nome da igreja" required />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep("role")}>Voltar</Button>
                  <Button type="submit" className="flex-1 gradient-cool text-white" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Solicitar Entrada"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
