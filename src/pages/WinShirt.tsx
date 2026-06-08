import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Copy, Check, Share2, Users, Trophy, AlertTriangle, Sparkles, ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ReferralStatus {
  referral_code: string;
  total_referrals: number;
  active_referrals: number;
  required: number;
  has_made_prediction: boolean;
  qualified: boolean;
  completed: boolean;
}

export default function WinShirt() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-referral-status"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_referral_status");
      if (error) throw error;
      return data as ReferralStatus;
    },
    staleTime: 60_000,
    retry: 1,
  });

  // Klaar met de winactie? → terug naar profiel, pagina is "uit"
  useEffect(() => {
    if (data?.completed) {
      toast({
        title: "Je bent gekwalificeerd! 🏆",
        description: "5 vrienden binnen en zelf actief — je dingt mee naar het shirt.",
      });
      navigate("/app/profile", { replace: true });
    }
  }, [data?.completed, navigate]);

  const inviteUrl = data ? `${window.location.origin}/login?ref=${data.referral_code}` : "";
  const progressPct = data ? Math.min(100, (data.active_referrals / data.required) * 100) : 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast({ title: "Link gekopieerd ✓" });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Kon niet kopiëren", variant: "destructive" });
    }
  };

  const handleShare = async () => {
    const text = `Doe mee met Goaltje WK 2026 ⚽\nWin het officiële Nederlands Elftal shirt 2026 via mijn link:\n${inviteUrl}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Goaltje WK 2026", text, url: inviteUrl }); }
      catch { /* user cancelled */ }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-8 space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Terug
      </button>

      {/* Hero — shirt visual */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-xl overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700" />
          {/* Stylized shirt silhouet — geen externe afbeelding */}
          <div className="absolute inset-0 flex items-center justify-center opacity-15">
            <svg viewBox="0 0 200 200" className="w-72 h-72">
              <path
                d="M40 50 L70 30 L80 40 L120 40 L130 30 L160 50 L150 80 L130 75 L130 170 L70 170 L70 75 L50 80 Z"
                fill="white"
                stroke="white"
                strokeWidth="2"
              />
            </svg>
          </div>
          <CardContent className="p-6 relative text-white">
            <Badge className="bg-white/20 text-white text-[10px] mb-2 backdrop-blur-sm border-0">
              EXCLUSIEVE WINACTIE
            </Badge>
            <h1 className="font-display font-bold text-2xl leading-tight">
              Win het officiële<br />
              <span className="text-3xl">Nederlands Elftal</span><br />
              shirt 2026 🎽
            </h1>
            <p className="text-sm mt-3 opacity-95">
              Nodig 5 vrienden uit en wordt het hoogst in de globale poel.
              Onder de gekwalificeerden krijgt #1 het shirt thuisbezorgd.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Het verhaal */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="border-0 shadow-elevation-1">
          <CardContent className="p-4 space-y-2">
            <h2 className="font-display font-semibold text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-secondary" /> Het verhaal
            </h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Speciaal voor het WK 2026 lanceert Nike het nieuwe thuis-tenue
              van het Nederlands Elftal — het oranje dat een hele generatie
              dragers achter zich aan trok. Strak design, gerecyclede polyester,
              en het iconische Oranje-rood-wit-blauw langs de kraag. Het shirt
              dat Memphis, Cody en Xavi straks dragen op het allergrootste podium.
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Wij geven er <b className="text-foreground">één</b> weg aan de
              fan met de scherpste voorspellingen — en de meeste vrienden
              die ook meedoen.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Hoe werkt het */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="border-0 shadow-elevation-1 bg-primary/5">
          <CardContent className="p-4 space-y-2">
            <h2 className="font-display font-semibold text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Hoe werkt het?
            </h2>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>Deel jouw persoonlijke invite-link met vrienden</li>
              <li>Zij registreren via jouw link <i>én</i> doen minimaal 1 voorspelling → tellen als <b className="text-foreground">actief</b></li>
              <li>Bij 5 actieve vrienden en zelf ≥1 voorspelling: je bent gekwalificeerd</li>
              <li>Na de finale: hoogste score in de globale poel wint het shirt</li>
            </ol>
          </CardContent>
        </Card>
      </motion.div>

      {/* Invite-link + progress */}
      {isLoading ? (
        <Skeleton className="h-44 rounded-xl" />
      ) : error || !data ? (
        <Card className="border-0 shadow-elevation-1 bg-muted/40">
          <CardContent className="p-4 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-medium text-foreground">Invite-functie wordt nog ingesteld</p>
              <p className="text-muted-foreground mt-0.5">
                Probeer 't over een paar minuten opnieuw.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-0 shadow-elevation-2">
            <div className="gradient-primary h-1" />
            <CardContent className="p-4 space-y-3">
              <h2 className="font-display font-semibold text-sm flex items-center gap-2">
                <Trophy className="h-4 w-4 text-secondary" /> Jouw voortgang
              </h2>

              {/* Progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" /> Actieve vrienden
                  </span>
                  <span className="font-mono font-bold">
                    {data.active_referrals}/{data.required}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      data.qualified ? "bg-emerald-500" : "gradient-primary",
                    )}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                {data.total_referrals > data.active_referrals && (
                  <p className="text-[10px] text-muted-foreground">
                    {data.total_referrals - data.active_referrals} aangemeld, nog geen voorspelling gedaan.
                  </p>
                )}
              </div>

              {/* Eigen-voorspelling check */}
              <div className={cn(
                "flex items-center gap-2 text-xs p-2 rounded-md",
                data.has_made_prediction ? "bg-emerald-500/10 text-emerald-700" : "bg-muted/50 text-muted-foreground",
              )}>
                {data.has_made_prediction
                  ? <Check className="h-3.5 w-3.5" />
                  : <AlertTriangle className="h-3.5 w-3.5" />}
                <span>
                  {data.has_made_prediction
                    ? "Je hebt zelf voorspellingen gedaan ✓"
                    : "Vergeet zelf ook minimaal 1 wedstrijd te voorspellen"}
                </span>
              </div>

              {/* Invite link */}
              <div className="space-y-1.5">
                <p className="text-[11px] text-muted-foreground">Jouw persoonlijke invite-link:</p>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/60 text-xs font-mono">
                  <span className="flex-1 truncate select-all">{inviteUrl}</span>
                  <Button size="sm" variant="ghost" className="h-7 px-2 shrink-0" onClick={handleCopy}>
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full gap-2 gradient-primary text-primary-foreground"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4" /> Deel met vrienden
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <p className="text-[10px] text-muted-foreground italic text-center px-4">
        Anti-fraude: vrienden tellen pas zodra ze ≥1 voorspelling hebben gedaan.
        Acties met overduidelijk fake-accounts worden door admins gediskwalificeerd.
      </p>
    </div>
  );
}
