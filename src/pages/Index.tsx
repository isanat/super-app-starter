import { useAuth } from "@/lib/auth";
import { Navigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import Dashboard from "./Dashboard";
import { Loader2 } from "lucide-react";

export default function Index() {
  const { user, loading, roles, activeRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-primary">
        <Loader2 className="w-12 h-12 animate-spin text-white" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (roles.length === 0) return <Navigate to="/role-select" replace />;

  return (
    <AppLayout>
      <Dashboard />
    </AppLayout>
  );
}
