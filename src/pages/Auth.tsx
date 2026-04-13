import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import goaltjeLogo from "@/assets/goaltje-logo.png";
import { AppSplashLoader } from "@/components/AppSplashLoader";

type AuthMode = "login" | "register" | "forgot";

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const { user, signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();

  const navigateAfterLogin = useCallback(() => {
    const joinCode = sessionStorage.getItem("joinCode");
    if (joinCode) {
      sessionStorage.removeItem("joinCode");
      navigate(`/join/${joinCode}`);
    } else {
      navigate("/app");
    }
  }, [navigate]);

  useEffect(() => {
    if (user && !showSplash) {
      navigateAfterLogin();
    }
  }, [user, showSplash, navigateAfterLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) throw error;
        setShowSplash(true);
        setTimeout(() => navigateAfterLogin(), 500);
        return;
      } else if (mode === "register") {
        const { error } = await signUp(email, password, name);
        if (error) throw error;
        toast({ title: "Account aangemaakt! 🎉", description: "Je bent nu ingelogd. Veel plezier!" });
        setShowSplash(true);
        setTimeout(() => navigateAfterLogin(), 500);
        return;
      } else {
        const { error } = await resetPassword(email);
        if (error) throw error;
        toast({ title: "E-mail verstuurd ✉️", description: "Check je inbox voor de reset link." });
      }
    } catch (err: any) {
      toast({ title: "Fout", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (showSplash) {
    return <AppSplashLoader message="Welkom terug! ⚽" />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[hsl(var(--goaltje-navy))] via-[hsl(var(--goaltje-darkblue))] to-[hsl(var(--primary))]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6"
      >
        {/* Logo + link to landing */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-block">
            <img src={goaltjeLogo} alt="Goaltje" className="w-28 h-28 mx-auto hover:scale-105 transition-transform" />
          </Link>
          <h1 className="font-display font-bold text-xl text-white">GOALTJE ⚽</h1>
          <p className="text-white/70 text-sm">
            {mode === "login" && "Welkom terug!"}
            {mode === "register" && "Maak je account aan"}
            {mode === "forgot" && "Wachtwoord vergeten?"}
          </p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {mode === "forgot" && (
                  <motion.button
                    key="back"
                    type="button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setMode("login")}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" /> Terug naar login
                  </motion.button>
                )}
              </AnimatePresence>

              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="name">Naam</Label>
                  <Input id="name" placeholder="Jouw naam" value={name} onChange={(e) => setName(e.target.value)} className="h-12 text-base" />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" placeholder="naam@voorbeeld.nl" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 text-base" />
              </div>

              {mode !== "forgot" && (
                <div className="space-y-2">
                  <Label htmlFor="password">Wachtwoord</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 text-base pr-12"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              )}

              {mode === "login" && (
                <button type="button" onClick={() => setMode("forgot")} className="text-sm text-primary hover:underline">
                  Wachtwoord vergeten?
                </button>
              )}

              <Button type="submit" className="w-full h-12 text-base font-semibold gradient-primary text-primary-foreground" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    {mode === "login" ? "Inloggen…" : mode === "register" ? "Registreren…" : "Versturen…"}
                  </span>
                ) : mode === "login" ? "Inloggen" : mode === "register" ? "Registreren" : "Reset link versturen"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {mode !== "forgot" && (
          <p className="text-center text-sm text-white/70">
            {mode === "login" ? "Nog geen account? " : "Al een account? "}
            <button onClick={() => setMode(mode === "login" ? "register" : "login")} className="text-secondary font-semibold hover:underline">
              {mode === "login" ? "Registreren" : "Inloggen"}
            </button>
          </p>
        )}

        <Link to="/" className="block text-center text-xs text-white/50 hover:text-white/80 transition-colors">
          ← Terug naar homepage
        </Link>
        <p className="text-center text-[10px] text-white/30 mt-2">© 2026 RobertDev.nl – GOALTJE</p>
      </motion.div>
    </div>
  );
}
