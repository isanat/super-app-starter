import { useAuth } from "@/lib/auth";
import { Navigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import Musicians from "./Musicians";

export default function MusiciansPage() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  return <AppLayout><Musicians /></AppLayout>;
}
