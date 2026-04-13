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

// Inline SVG icons to avoid extra dependencies
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.42c1.39.07 2.35.74 3.16.8 1.19-.24 2.33-.93 3.62-.84 1.54.12 2.7.72 3.45 1.84-3.15 1.88-2.41 6.01.49 7.17-.57 1.46-1.32 2.9-2.72 3.89zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  );
}

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
  const [showSplash, setShowSplash] = useState(false);
  const { user, signIn, signUp, resetPassword, signInWithGoogle, signInWithApple } = useAuth();
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

  const handleGoogle = async () => {
    setOauthLoading("google");
    try {
      await signInWithGoogle();
      // Page will redirect to Google — no further action needed
    } catch (err: any) {
      toast({ title: "Fout", description: err.message, variant: "destructive" });
      setOauthLoading(null);
    }
  };

  const handleApple = async () => {
    setOauthLoading("apple");
    try {
      await signInWithApple();
      // Page will redirect to Apple — no further action needed
    } catch (err: any) {
      toast({ title: "Fout", description: err.message, variant: "destructive" });
      setOauthLoading(null);
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
        {/* Logo */}
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

            {/* OAuth — only show on login / register, not forgot-password */}
            {mode !== "forgot" && (
              <>
                {/* Divider */}
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-background px-3 text-xs text-muted-foreground">of doorgaan met</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Google */}
                  <button
                    type="button"
                    onClick={handleGoogle}
                    disabled={!!oauthLoading}
                    className="w-full h-12 flex items-center justify-center gap-3 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-60"
                  >
                    {oauthLoading === "google" ? (
                      <span className="block w-4 h-4 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
                    ) : (
                      <GoogleIcon />
                    )}
                    Doorgaan met Google
                  </button>

                  {/* Apple */}
                  <button
                    type="button"
                    onClick={handleApple}
                    disabled={!!oauthLoading}
                    className="w-full h-12 flex items-center justify-center gap-3 rounded-xl text-sm font-medium bg-black text-white hover:bg-zinc-800 transition-colors disabled:opacity-60"
                  >
                    {oauthLoading === "apple" ? (
                      <span className="block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    ) : (
                      <AppleIcon />
                    )}
                    Doorgaan met Apple
                  </button>
                </div>
              </>
            )}
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
