import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCheck, UserX, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ApproveMusicians() {
  const { activeRole } = useAuth();
  const [pending, setPending] = useState<any[]>([]);
  const { toast } = useToast();

  const fetchPending = async () => {
    if (!activeRole?.church_id) return;
    const { data } = await supabase
      .from("user_roles")
      .select("id, user_id, created_at, status")
      .eq("church_id", activeRole.church_id)
      .eq("role", "musician" as any)
      .eq("status", "pending" as any);

    if (data && data.length > 0) {
      const userIds = data.map(d => d.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, email, instruments")
        .in("user_id", userIds);
      const merged = data.map(d => ({ ...d, profile: profiles?.find(p => p.user_id === d.user_id) }));
      setPending(merged);
    } else {
      setPending([]);
    }
  };

  useEffect(() => { fetchPending(); }, [activeRole]);

  const handleAction = async (roleId: string, status: "approved" | "rejected") => {
    await supabase.from("user_roles").update({ status: status as any }).eq("id", roleId);
    toast({ title: status === "approved" ? "Músico aprovado!" : "Solicitação rejeitada" });
    fetchPending();
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <h1 className="text-3xl font-heading font-bold mb-6"><span className="text-gradient">Aprovar Músicos</span></h1>

      {pending.length === 0 ? (
        <Card><CardContent className="text-center py-12"><Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">Nenhuma solicitação pendente</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {pending.map(p => (
            <Card key={p.id}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-cool flex items-center justify-center text-white font-bold">
                    {p.profile?.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="font-semibold">{p.profile?.name || "Sem nome"}</p>
                    <p className="text-sm text-muted-foreground">{p.profile?.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="gradient-cool text-white gap-1" onClick={() => handleAction(p.id, "approved")}>
                    <UserCheck className="w-4 h-4" /> Aprovar
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive gap-1" onClick={() => handleAction(p.id, "rejected")}>
                    <UserX className="w-4 h-4" /> Rejeitar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
