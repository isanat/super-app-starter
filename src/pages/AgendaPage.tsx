import { useAuth } from "@/lib/auth";
import { Navigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import Agenda from "./Agenda";

export default function AgendaPage() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  return <AppLayout><Agenda /></AppLayout>;
}
