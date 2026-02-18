import { useAuth } from "@/lib/auth";
import { Navigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import ApproveMusicians from "./ApproveMusicians";

export default function ApprovePage() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  return <AppLayout><ApproveMusicians /></AppLayout>;
}
