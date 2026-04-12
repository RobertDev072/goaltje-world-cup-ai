import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, ArrowLeft, Check, AlertCircle, Loader2 } from "lucide-react";
import goaltjeLogo from "@/assets/goaltje-logo.png";

type ResetStatus = "loading" | "ready" | "submitting" | "success" | "expired";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<ResetStatus>("loading");
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setStatus("ready");
        }
      }
    );

    // Check if we already have a recovery session from URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("access_token")) {
      // Supabase will fire PASSWORD_RECOVERY event shortly
      setTimeout(() => {
        setStatus((prev) => (prev === "loading" ? "expired" : prev));
      }, 5000);
    } else {
      setStatus("expired");
    }

    return () => subscription.unsubscribe();
  }, []);

  const passwordsMatch = password === confirmPassword;
  const passwordValid = password.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordValid) {
      toast({ title: "Wachtwoord te kort", description: "Minimaal 8 tekens.", variant: "destructive" });
      return;
    }
    if (!passwordsMatch) {
      toast({ title: "Wachtwoorden komen niet overeen", variant: "destructive" });
      return;
    }

    setStatus("submitting");
    const { error } = await updatePassword(password);
    if (error) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
      setStatus("ready");
    } else {
      setStatus("success");
      setTimeout(() => navigate("/login"), 3000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[hsl(var(--goaltje-navy))] via-[hsl(var(--goaltje-darkblue))] to-[hsl(var(--primary))]">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link to="/">
            <img src={goaltjeLogo} alt="Goaltje" className="w-20 h-20 mx-auto" />
          </Link>
          <h1 className="font-display font-bold text-xl text-white mt-3">Nieuw wachtwoord</h1>
        </div>

        <Card className="border-0 shadow-xl">
          <CardContent className="pt-6">
            {status === "loading" && (
              <div className="text-center py-8 space-y-3">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">Sessie verifiëren...</p>
              </div>
            )}

            {status === "expired" && (
              <div className="text-center py-8 space-y-4">
                <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
                <div>
                  <p className="text-sm font-medium">Deze reset-link is verlopen</p>
                  <p className="text-xs text-muted-foreground mt-1">Vraag een nieuwe link aan.</p>
                </div>
                <Button asChild variant="default" className="w-full gradient-primary text-primary-foreground">
                  <Link to="/login">Terug naar inloggen</Link>
                </Button>
              </div>
            )}

            {status === "success" && (
              <div className="text-center py-8 space-y-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Check className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Wachtwoord gewijzigd!</p>
                  <p className="text-xs text-muted-foreground mt-1">Je wordt doorgestuurd naar login...</p>
                </div>
              </div>
            )}

            {(status === "ready" || status === "submitting") && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nieuw wachtwoord</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimaal 8 tekens"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 text-base pr-12"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full ${
                          password.length >= i * 3 ? (password.length >= 12 ? "bg-emerald-500" : password.length >= 8 ? "bg-primary" : "bg-amber-500") : "bg-muted"
                        }`} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm">Bevestig wachtwoord</Label>
                  <Input
                    id="confirm"
                    type={showPassword ? "text" : "password"}
                    placeholder="Herhaal wachtwoord"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-12 text-base"
                  />
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="text-xs text-destructive">Wachtwoorden komen niet overeen</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 gradient-primary text-primary-foreground font-semibold"
                  disabled={status === "submitting" || !passwordValid || !passwordsMatch}
                >
                  {status === "submitting" ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Opslaan...
                    </span>
                  ) : "Wachtwoord opslaan"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Link to="/login" className="block text-center text-sm text-white/70 hover:text-white/90 transition-colors">
          <ArrowLeft className="inline h-4 w-4 mr-1" /> Terug naar inloggen
        </Link>
      </div>
    </div>
  );
}
