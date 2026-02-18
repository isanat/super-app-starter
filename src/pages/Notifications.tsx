import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Notifications() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<any[]>([]);

  const fetchNotifs = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifs(data || []);
  };

  useEffect(() => { fetchNotifs(); }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    fetchNotifs();
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    fetchNotifs();
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-heading font-bold"><span className="text-gradient">Notificações</span></h1>
        <Button variant="outline" size="sm" onClick={markAllRead} className="gap-2"><CheckCheck className="w-4 h-4" />Marcar tudo</Button>
      </div>

      {notifs.length === 0 ? (
        <Card><CardContent className="text-center py-12"><Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">Nenhuma notificação</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {notifs.map(n => (
            <Card key={n.id} className={cn("cursor-pointer transition-all hover:shadow-md", !n.read && "border-l-4 border-l-primary bg-primary/5")} onClick={() => !n.read && markRead(n.id)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{n.title}</p>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(n.created_at).toLocaleDateString("pt-BR")}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
