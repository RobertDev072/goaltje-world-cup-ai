import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { AppSplashLoader } from "@/components/AppSplashLoader";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <AppSplashLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
