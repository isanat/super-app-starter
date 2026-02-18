import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Search } from "lucide-react";

export default function Musicians() {
  const { activeRole } = useAuth();
  const [musicians, setMusicians] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!activeRole?.church_id) return;
    const fetch = async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("church_id", activeRole.church_id)
        .eq("status", "approved" as any);
      if (roles && roles.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("*")
          .in("user_id", roles.map(r => r.user_id));
        setMusicians(profiles || []);
      }
    };
    fetch();
  }, [activeRole]);

  const filtered = musicians.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.instruments?.some((i: string) => i.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-heading font-bold mb-6"><span className="text-gradient">Músicos</span></h1>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-10" placeholder="Buscar por nome ou instrumento..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="text-center py-12"><Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">Nenhum músico encontrado</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(m => (
            <Card key={m.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-white text-lg font-bold">
                    {m.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{m.name}</p>
                    <p className="text-sm text-muted-foreground">{m.email}</p>
                  </div>
                </div>
                {m.instruments?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {m.instruments.map((inst: string) => (
                      <Badge key={inst} variant="secondary" className="text-xs">{inst}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
