import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowLeft, ArrowRight } from "lucide-react";
import goaltjeLogo from "@/assets/goaltje-logo.png";
import { AppSplashLoader } from "@/components/AppSplashLoader";

type AuthMode = "login" | "register" | "forgot";

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
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
    <div className="relative min-h-screen overflow-x-clip bg-[hsl(var(--lp-bg))] text-white">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute -top-40 -left-20 h-96 w-96 rounded-full bg-primary/25 blur-[120px]" />
      <div className="pointer-events-none absolute top-[40%] -right-40 h-[26rem] w-[26rem] rounded-full bg-secondary/15 blur-[120px]" />

      {/* Header — matches MarketingHome */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[hsl(var(--lp-surface-dark))/0.76] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={goaltjeLogo} alt="Goaltje" className="h-9 w-9" />
            <span className="font-display text-lg font-bold tracking-wide">GOALTJE</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/" className="hidden rounded-xl px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white sm:block">
              Home
            </Link>
            <Link to="/bedrijven" className="hidden rounded-xl px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white sm:block">
              Voor bedrijven
            </Link>
          </nav>
        </div>
      </header>

      {/* Form */}
      <main className="flex min-h-[calc(100vh-4rem-5rem)] flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-6"
        >
          {/* Logo + title */}
          <div className="space-y-2 text-center">
            <Link to="/" className="inline-block">
              <img src={goaltjeLogo} alt="Goaltje" className="mx-auto h-24 w-24 hover:scale-105 transition-transform" />
            </Link>
            <h1 className="font-display text-xl font-bold">GOALTJE ⚽</h1>
            <p className="text-sm text-white/70">
              {mode === "login" && "Welkom terug!"}
              {mode === "register" && "Maak je account aan"}
              {mode === "forgot" && "Wachtwoord vergeten?"}
            </p>
          </div>

          {/* Glass card */}
          <div className="rounded-2xl border border-white/10 bg-[hsl(var(--lp-surface-dark))/0.85] p-6 shadow-[var(--lp-shadow-soft)] backdrop-blur-xl">
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
                    className="flex items-center gap-1 text-sm text-white/60 hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4" /> Terug naar login
                  </motion.button>
                )}
              </AnimatePresence>

              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-white/80">Naam</Label>
                  <Input
                    id="name"
                    placeholder="Jouw naam"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 border-white/20 bg-white/[0.08] text-base text-white placeholder:text-white/35 focus-visible:border-secondary focus-visible:ring-secondary/30"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-white/80">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="naam@voorbeeld.nl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 border-white/20 bg-white/[0.08] text-base text-white placeholder:text-white/35 focus-visible:border-secondary focus-visible:ring-secondary/30"
                />
              </div>

              {mode !== "forgot" && (
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-white/80">Wachtwoord</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 border-white/20 bg-white/[0.08] pr-12 text-base text-white placeholder:text-white/35 focus-visible:border-secondary focus-visible:ring-secondary/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/90 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              )}

              {mode === "login" && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-white/30 bg-white/10 accent-secondary cursor-pointer"
                  />
                  <label htmlFor="rememberMe" className="text-sm text-white/70 cursor-pointer select-none">
                    Onthoud mij
                  </label>
                </div>
              )}

              {mode === "login" && (
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-sm text-secondary/80 hover:text-secondary hover:underline"
                >
                  Wachtwoord vergeten?
                </button>
              )}

              <Button
                type="submit"
                className="group h-12 w-full text-base font-bold bg-secondary text-secondary-foreground hover:-translate-y-0.5 hover:bg-secondary/90 transition-all"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="block h-4 w-4 animate-spin rounded-full border-2 border-secondary-foreground/30 border-t-secondary-foreground" />
                    {mode === "login" ? "Inloggen…" : mode === "register" ? "Registreren…" : "Versturen…"}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {mode === "login" ? "Inloggen" : mode === "register" ? "Registreren" : "Reset link versturen"}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                )}
              </Button>
            </form>
          </div>

          {mode !== "forgot" && (
            <p className="text-center text-sm text-white/70">
              {mode === "login" ? "Nog geen account? " : "Al een account? "}
              <button
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="font-semibold text-secondary hover:underline"
              >
                {mode === "login" ? "Registreren" : "Inloggen"}
              </button>
            </p>
          )}
        </motion.div>
      </main>

      {/* Footer — matches MarketingHome */}
      <footer className="border-t border-white/10 py-8 text-sm text-white/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 sm:flex-row">
          <p>© 2026 Goaltje</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/bedrijven" className="hover:text-white transition-colors">Bedrijven</Link>
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
