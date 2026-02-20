import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Vote, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Voting() {
  const { user, activeRole } = useAuth();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [votes, setVotes] = useState<any[]>([]);
  const [myVote, setMyVote] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchVotingData = async () => {
    if (!activeRole?.church_id) return;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("church_id", activeRole.church_id)
      .eq("status", "approved" as any);

    if (roles && roles.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles_public" as any)
        .select("user_id, name")
        .in("user_id", roles.map(r => r.user_id));
      setCandidates(profiles || []);
    } else {
      setCandidates([]);
    }

    const { data: allVotes } = await supabase
      .from("director_votes")
      .select("*")
      .eq("church_id", activeRole.church_id);
    setVotes(allVotes || []);
    const mine = allVotes?.find(v => v.voter_id === user?.id);
    setMyVote(mine?.candidate_id || null);
  };

  useEffect(() => {
    fetchVotingData();
  }, [activeRole, user]);

  const handleVote = async (candidateId: string) => {
    if (!user || !activeRole?.church_id) return;
    const { error: voteError } = await supabase
      .from("director_votes")
      .upsert(
        { church_id: activeRole.church_id, voter_id: user.id, candidate_id: candidateId },
        { onConflict: "church_id,voter_id" }
      );

    if (voteError) {
      toast({ title: "Erro ao registrar voto", description: voteError.message, variant: "destructive" });
      return;
    }

    const { data: candidateVotes } = await supabase
      .from("director_votes")
      .select("id")
      .eq("church_id", activeRole.church_id)
      .eq("candidate_id", candidateId);

    const totalVotes = candidateVotes?.length ?? 0;

    if (totalVotes >= 3) {
      const { error: demoteError } = await supabase
        .from("user_roles")
        .update({ role: "musician" as const })
        .eq("church_id", activeRole.church_id)
        .eq("role", "director");

      if (demoteError) {
        toast({ title: "Erro ao atualizar liderança", description: demoteError.message, variant: "destructive" });
        return;
      }

      const { error: promoteError } = await supabase
        .from("user_roles")
        .update({ role: "director" as const })
        .eq("user_id", candidateId)
        .eq("church_id", activeRole.church_id);

      if (promoteError) {
        toast({ title: "Erro ao eleger diretor", description: promoteError.message, variant: "destructive" });
        return;
      }

      toast({ title: "Novo diretor eleito!", description: "Limite de 3 votos atingido." });
    } else {
      toast({ title: "Voto registrado!" });
    }

    setMyVote(candidateId);
    await fetchVotingData();
  };

  const voteCount = (candidateId: string) => votes.filter(v => v.candidate_id === candidateId).length;

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <h1 className="text-3xl font-heading font-bold mb-6"><span className="text-gradient">Votação de Diretor</span></h1>

      {candidates.length === 0 ? (
        <Card><CardContent className="text-center py-12"><Vote className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">Nenhum candidato disponível</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {candidates.map(c => (
            <Card key={c.user_id} className={myVote === c.user_id ? "border-2 border-primary shadow-lg" : ""}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white font-bold">
                    {c.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-sm text-muted-foreground">{voteCount(c.user_id)} voto(s)</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={myVote === c.user_id ? "default" : "outline"}
                  className={myVote === c.user_id ? "gradient-primary text-white" : ""}
                  onClick={() => handleVote(c.user_id)}
                >
                  {myVote === c.user_id ? <><CheckCircle2 className="w-4 h-4" /> Votado</> : "Votar"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
