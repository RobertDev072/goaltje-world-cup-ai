import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { AppSplashLoader } from "@/components/AppSplashLoader";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const [banned, setBanned] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setBanned(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("profiles")
      .select("is_banned")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setBanned(!!data?.is_banned);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  if (loading) {
    return <AppSplashLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (banned === true) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-destructive/10 mx-auto flex items-center justify-center">
              <Ban className="h-6 w-6 text-destructive" />
            </div>
            <h1 className="text-lg font-display font-semibold">Account geblokkeerd</h1>
            <p className="text-sm text-muted-foreground">
              Je account is door een beheerder geblokkeerd. Neem contact op
              als je denkt dat dit een vergissing is.
            </p>
            <Button variant="outline" onClick={() => signOut()}>Uitloggen</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
