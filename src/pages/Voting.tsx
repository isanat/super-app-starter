import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Vote, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Voting() {
  const { user, activeRole } = useAuth();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [votes, setVotes] = useState<any[]>([]);
  const [myVote, setMyVote] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!activeRole?.church_id) return;
    const fetch = async () => {
      // Get all approved members as candidates
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("church_id", activeRole.church_id).eq("status", "approved" as any);
      if (roles && roles.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, name, email").in("user_id", roles.map(r => r.user_id));
        setCandidates(profiles || []);
      }
      // Get votes
      const { data: allVotes } = await supabase.from("director_votes").select("*").eq("church_id", activeRole.church_id);
      setVotes(allVotes || []);
      const mine = allVotes?.find(v => v.voter_id === user?.id);
      setMyVote(mine?.candidate_id || null);
    };
    fetch();
  }, [activeRole, user]);

  const handleVote = async (candidateId: string) => {
    if (!user || !activeRole?.church_id) return;
    if (myVote) {
      await supabase.from("director_votes").update({ candidate_id: candidateId }).eq("voter_id", user.id).eq("church_id", activeRole.church_id);
    } else {
      await supabase.from("director_votes").insert({ church_id: activeRole.church_id, voter_id: user.id, candidate_id: candidateId });
    }
    setMyVote(candidateId);
    toast({ title: "Voto registrado!" });
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
