import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface UserRole {
  role: "director" | "musician";
  church_id: string;
  status: "pending" | "approved" | "rejected";
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: UserRole[];
  activeRole: UserRole | null;
  profile: any;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [profile, setProfile] = useState<any>(null);

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role, church_id, status")
      .eq("user_id", userId);
    setRoles((data as UserRole[]) || []);
  };

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    setProfile(data);
  };

  const refreshRoles = async () => {
    if (user) await fetchRoles(user.id);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
        await fetchRoles(session.user.id);
      } else {
        setProfile(null);
        setRoles([]);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRoles([]);
    setProfile(null);
  };

  const activeRole = roles.find(r => r.status === "approved") || roles[0] || null;

  return (
    <AuthContext.Provider value={{ user, session, loading, roles, activeRole, profile, signOut, refreshRoles, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
