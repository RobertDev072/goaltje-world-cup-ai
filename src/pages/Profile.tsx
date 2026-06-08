import { useState, useRef, useCallback, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Moon, Sun, Shield, Camera, Loader2, Trophy, Target, Zap, Users, ChevronRight, Cookie, Check, HelpCircle, Link2 } from "lucide-react";
import { motion } from "framer-motion";
import { getConsent, getConsentCategories, setConsent } from "@/lib/consent";
import { Switch } from "@/components/ui/switch";
import { PredictorProfile } from "@/components/PredictorProfile";
import { ReferralCard } from "@/components/ReferralCard";
import { useSyncPreferences } from "@/hooks/useSyncPreferences";
import { SyncEnableConfirmModal } from "@/components/SyncEnableConfirmModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [uploading, setUploading] = useState(false);
  const [showCookieSettings, setShowCookieSettings] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cookieAnalytics, setCookieAnalytics] = useState(() => getConsentCategories().analytics);
  const [cookieFunctional, setCookieFunctional] = useState(() => getConsentCategories().functional);
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);
  const [showSyncDisableConfirm, setShowSyncDisableConfirm] = useState(false);

  const { syncEnabled, isLoading: syncLoading, disableSync } = useSyncPreferences();

  // Scroll naar de referral-card als de URL #invite bevat (vanaf de promo-banner)
  // en geef de card een korte oranje glow zodat 't oog er meteen naartoe trekt.
  useEffect(() => {
    if (window.location.hash !== "#invite") return;
    const el = document.getElementById("invite");
    if (!el) return;
    const t = setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("ring-2", "ring-secondary", "ring-offset-2");
      setTimeout(() => el.classList.remove("ring-2", "ring-secondary", "ring-offset-2"), 2400);
    }, 150);
    return () => clearTimeout(t);
  }, []);

  const saveCookiePrefs = useCallback(() => {
    setConsent("granted", { analytics: cookieAnalytics, functional: cookieFunctional });
    toast({ title: "Cookie-voorkeuren opgeslagen ✅" });
    setShowCookieSettings(false);
  }, [cookieAnalytics, cookieFunctional]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      return data === true;
    },
    enabled: !!user,
  });

  // Fetch user stats
  const { data: stats } = useQuery({
    queryKey: ["profile-stats", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const [{ count: poolCount }, { count: predCount }, { data: preds }] = await Promise.all([
        supabase.from("pool_members").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("predictions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("predictions").select("points_awarded").eq("user_id", user.id).not("points_awarded", "is", null),
      ]);
      const totalPoints = preds?.reduce((sum, p) => sum + (p.points_awarded || 0), 0) || 0;
      const exactCount = preds?.filter(p => p.points_awarded && p.points_awarded >= 6).length || 0;
      return { pools: poolCount || 0, predictions: predCount || 0, totalPoints, exactCount };
    },
    enabled: !!user,
  });

  // Fetch user pools
  const { data: myPools } = useQuery({
    queryKey: ["my-pools-profile", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("pool_members")
        .select("pool_id, pools(id, name, invite_code)")
        .eq("user_id", user.id);
      return data?.map((m: any) => m.pools).filter(Boolean) || [];
    },
    enabled: !!user,
  });

  const [name, setName] = useState("");
  const nameValue = name || profile?.name || "";

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Niet ingelogd");
      // UPSERT zodat oudere accounts zonder profile-rij óók kunnen updaten —
      // RLS blijft dicht omdat user_id verplicht gelijk is aan auth.uid().
      const { error } = await supabase
        .from("profiles")
        .upsert({ user_id: user.id, name: nameValue }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      setSaved(true);
      toast({ title: "Profiel bijgewerkt! ✅" });
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" }),
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Bestand te groot", description: "Maximaal 5 MB", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Ongeldig bestand", description: "Upload een afbeelding (JPG, PNG, WebP)", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const { error: updateError } = await supabase
        .from("profiles")
        .upsert(
          { user_id: user.id, avatar_url: `${urlData.publicUrl}?t=${Date.now()}` },
          { onConflict: "user_id" },
        );
      if (updateError) throw updateError;
      toast({ title: "Profielfoto bijgewerkt! 📸" });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch (err: any) {
      toast({ title: "Upload mislukt", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const toggleDark = () => {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-4 text-center space-y-4">
        <h1 className="text-2xl font-bold font-display">Profiel</h1>
        <p className="text-muted-foreground">Log in om je profiel te bekijken.</p>
        <Link to="/login"><Button className="bg-primary text-primary-foreground">Inloggen</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-4 space-y-4">
      <h1 className="text-2xl font-bold font-display">Profiel</h1>

      {/* Avatar Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-xl overflow-hidden">
          <div className="bg-primary h-20" />
          <CardContent className="pt-0 -mt-10 text-center space-y-4 pb-6">
            <div className="relative inline-block">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="h-20 w-20 rounded-full object-cover mx-auto border-4 border-card" loading="lazy" decoding="async" />
              ) : (
                <div className="h-20 w-20 rounded-full bg-primary mx-auto flex items-center justify-center text-3xl font-bold text-primary-foreground border-4 border-card">
                  {(profile?.name || user.email || "?")[0].toUpperCase()}
                </div>
              )}
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>
            <div>
              <p className="font-semibold text-lg">{profile?.name || "Naamloos"}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      {stats && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: <Users className="h-4 w-4 text-primary" />, value: stats.pools, label: "Poules" },
              { icon: <Target className="h-4 w-4 text-secondary" />, value: stats.predictions, label: "Voorsp." },
              { icon: <Zap className="h-4 w-4 text-success" />, value: stats.totalPoints, label: "Punten" },
              { icon: <Trophy className="h-4 w-4 text-secondary" />, value: stats.exactCount, label: "Exact" },
            ].map((stat, i) => (
              <Card key={i} className="border-0 shadow-elevation-1">
                <CardContent className="p-3 text-center space-y-1">
                  <div className="flex justify-center">{stat.icon}</div>
                  <p className="text-lg font-bold font-display">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* Predictor Profile — auto-gegenereerd uit voorspel-patronen */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <PredictorProfile userId={user.id} />
      </motion.div>

      {/* Referral card — win een officieel shirt */}
      <motion.div
        id="invite"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14 }}
        className="scroll-mt-4 rounded-xl"
      >
        <ReferralCard />
      </motion.div>

      {/* Snelle links naar inzichten + uitleg */}
      <div className="space-y-2">
        <Link to="/app/insights">
          <Card className="border-0 shadow-elevation-1 hover:shadow-elevation-2 transition-all">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-secondary/15 flex items-center justify-center shrink-0">
                <span className="text-lg">✨</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Alle inzichten</p>
                <p className="text-[11px] text-muted-foreground">Deze week · Rang-evolutie · Team-bias · Pool-trends</p>
              </div>
              <ChevronRight className="h-4 w-4 text-primary shrink-0" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/app/help">
          <Card className="border-0 shadow-elevation-1 hover:shadow-elevation-2 transition-all">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <HelpCircle className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Help &amp; puntensysteem</p>
                <p className="text-[11px] text-muted-foreground">Hoe werken de punten · FAQ · Voorbeelden</p>
              </div>
              <ChevronRight className="h-4 w-4 text-primary shrink-0" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* My Pools */}
      {myPools && myPools.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h2 className="font-display font-semibold text-sm text-muted-foreground mb-2">🏆 Mijn poules</h2>
          <div className="space-y-2">
            {myPools.map((pool: any) => (
              <Link key={pool.id} to={`/app/pool/${pool.id}`}>
                <Card className="border-0 shadow-elevation-1 hover:shadow-elevation-2 transition-all mb-2 group">
                  <CardContent className="p-3 flex items-center justify-between">
                    <p className="font-medium text-sm">{pool.name}</p>
                    <ChevronRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Voorspellingen — sync over alle pools */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-primary shrink-0" />
                  <Label htmlFor="sync-toggle" className="text-sm font-semibold cursor-pointer">
                    Voorspellingen synchroniseren
                  </Label>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Sla je voorspelling één keer op en deel 'm meteen over al je pools.
                </p>
              </div>
              <Switch
                id="sync-toggle"
                checked={syncEnabled}
                disabled={syncLoading || disableSync.isPending}
                onCheckedChange={(next) => {
                  if (next) {
                    setShowSyncConfirm(true);
                  } else {
                    setShowSyncDisableConfirm(true);
                  }
                }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
              {syncLoading
                ? "Voorkeur laden…"
                : syncEnabled
                  ? `🔗 Aan — je voorspellingen worden gedeeld over al je pools (${myPools?.length ?? 0}).`
                  : "Uit — elke pool staat los. Wijzigingen blijven binnen één pool."}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <SyncEnableConfirmModal open={showSyncConfirm} onOpenChange={setShowSyncConfirm} />

      <AlertDialog open={showSyncDisableConfirm} onOpenChange={setShowSyncDisableConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Synchronisatie uitzetten?</AlertDialogTitle>
            <AlertDialogDescription>
              Bestaande voorspellingen blijven staan. Vanaf nu worden nieuwe voorspellingen alleen in de actieve pool opgeslagen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disableSync.isPending}>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              disabled={disableSync.isPending}
              onClick={async (e) => {
                e.preventDefault();
                try {
                  await disableSync.mutateAsync();
                  toast({ title: "Synchronisatie uit" });
                  setShowSyncDisableConfirm(false);
                } catch (err) {
                  toast({
                    title: "Er ging iets mis",
                    description: err instanceof Error ? err.message : "Probeer het opnieuw.",
                    variant: "destructive",
                  });
                }
              }}
            >
              {disableSync.isPending ? "Bezig…" : "Ja, uitzetten"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Name */}
      <Card className="border-0 shadow-md">
        <CardContent className="pt-4 space-y-3">
          <Label>Naam</Label>
          <Input value={nameValue} onChange={(e) => setName(e.target.value)} placeholder="Jouw naam" className="h-12" />
          <Button
            className={`w-full h-12 transition-all duration-300 ${saved ? "bg-green-500 hover:bg-green-500 text-white" : "bg-primary text-primary-foreground"}`}
            onClick={() => updateProfile.mutate()}
            disabled={updateProfile.isPending || saved}
          >
            <AnimatePresence mode="wait">
              {saved ? (
                <motion.span key="saved" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                  <Check className="h-5 w-5" /> Opgeslagen!
                </motion.span>
              ) : updateProfile.isPending ? (
                <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  Opslaan...
                </motion.span>
              ) : (
                <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  Naam opslaan
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card className="border-0 shadow-md">
        <CardContent className="pt-4 space-y-3">
          {isAdmin && (
            <Link to="/app/admin">
              <Button variant="outline" className="w-full h-12 justify-start gap-3">
                <Shield className="h-5 w-5 text-primary" /> Developer Dashboard
              </Button>
            </Link>
          )}
          <Button variant="outline" className="w-full h-12 justify-start" onClick={toggleDark}>
            {isDark ? <Sun className="h-5 w-5 mr-3" /> : <Moon className="h-5 w-5 mr-3" />}
            {isDark ? "Licht thema" : "Donker thema"}
          </Button>
          <Button variant="outline" className="w-full h-12 justify-start" onClick={() => setShowCookieSettings(!showCookieSettings)}>
            <Cookie className="h-5 w-5 mr-3 text-primary" /> Cookie-voorkeuren
          </Button>
          {showCookieSettings && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="border border-border/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold">Noodzakelijk</p>
                  <p className="text-[10px] text-muted-foreground">Altijd actief</p>
                </div>
                <Switch checked disabled className="opacity-60" />
              </div>
              <div className="border-t border-border/30" />
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="prof-func" className="text-xs font-semibold cursor-pointer">Functioneel</Label>
                  <p className="text-[10px] text-muted-foreground">Taalvoorkeur, thema</p>
                </div>
                <Switch id="prof-func" checked={cookieFunctional} onCheckedChange={setCookieFunctional} />
              </div>
              <div className="border-t border-border/30" />
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="prof-analytics" className="text-xs font-semibold cursor-pointer">Analytisch</Label>
                  <p className="text-[10px] text-muted-foreground">Anonieme statistieken</p>
                </div>
                <Switch id="prof-analytics" checked={cookieAnalytics} onCheckedChange={setCookieAnalytics} />
              </div>
              <Button size="sm" className="w-full h-9 rounded-xl gradient-primary text-white text-xs" onClick={saveCookiePrefs}>
                Voorkeuren opslaan
              </Button>
            </motion.div>
          )}
          <Link to="/privacy" className="block">
            <Button variant="outline" className="w-full h-12 justify-start">
              <Shield className="h-5 w-5 mr-3 text-muted-foreground" /> Privacybeleid
            </Button>
          </Link>
          <Button variant="outline" className="w-full h-12 justify-start text-destructive hover:text-destructive" onClick={handleSignOut}>
            <LogOut className="h-5 w-5 mr-3" /> Uitloggen
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
