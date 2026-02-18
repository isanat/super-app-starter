import { useAuth } from "@/lib/auth";
import { Navigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import Notifications from "./Notifications";

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  return <AppLayout><Notifications /></AppLayout>;
}
