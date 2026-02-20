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
  const [cityFilter, setCityFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");

  useEffect(() => {
    if (!activeRole?.church_id) return;
    const fetch = async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("church_id", activeRole.church_id)
        .eq("status", "approved");
      if (roles && roles.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, user_id, church_id, name, bio, photo_url, instruments, city, state, whatsapp")
          .in("user_id", roles.map(r => r.user_id));
        setMusicians(profiles || []);
      }
    };
    fetch();
  }, [activeRole]);

  const filtered = musicians.filter(m => {
    const q = search.toLowerCase();
    const matchesSearch =
      m.name?.toLowerCase().includes(q) ||
      m.instruments?.some((i: string) => i.toLowerCase().includes(q));
    const matchesCity = cityFilter === "" || m.city?.toLowerCase().includes(cityFilter.toLowerCase());
    const matchesState = stateFilter === "" || m.state?.toLowerCase() === stateFilter.toLowerCase();
    return matchesSearch && matchesCity && matchesState;
  });

  const openWhatsApp = (phone: string, name: string) => {
    const url = `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${name}, tudo bem?`)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-heading font-bold mb-6"><span className="text-gradient">Músicos</span></h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="relative md:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Buscar por nome ou instrumento..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Input placeholder="Filtrar por cidade" value={cityFilter} onChange={e => setCityFilter(e.target.value)} />
        <Input placeholder="Filtrar por estado (UF)" value={stateFilter} onChange={e => setStateFilter(e.target.value)} maxLength={2} />
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
                    <p className="text-sm text-muted-foreground">{m.instruments?.join(", ") || "Sem instrumento"}</p>
                  </div>
                </div>
                {(m.city || m.state) && (
                  <p className="text-xs text-muted-foreground mb-2">{[m.city, m.state].filter(Boolean).join(" - ")}</p>
                )}
                {m.instruments?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {m.instruments.map((inst: string) => (
                      <Badge key={inst} variant="secondary" className="text-xs">{inst}</Badge>
                    ))}
                  </div>
                )}
                {m.whatsapp && (
                  <button className="text-xs text-primary hover:underline" onClick={() => openWhatsApp(m.whatsapp, m.name)}>
                    Falar no WhatsApp
                  </button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
