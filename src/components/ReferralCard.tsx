import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Gift, Copy, Check, Share2, Trophy, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ReferralStatus {
  referral_code: string;
  total_referrals: number;
  active_referrals: number;
  required: number;
  qualified: boolean;
  completed?: boolean;
  has_made_prediction?: boolean;
}

export function ReferralCard() {
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

  if (isLoading) return <Skeleton className="h-44 rounded-xl" />;

  // Gebruiker heeft alles voltooid → card verbergen (zoals de promo).
  if (data?.completed) return null;

  // Fallback wanneer de RPC nog niet bestaat in de DB (migration niet
  // gerund) of een andere fout gooit. Voorheen toonde de card niets,
  // wat verwarrend was — nu een duidelijke melding.
  if (error || !data) {
    return (
      <Card className="border-0 shadow-elevation-1 bg-muted/40">
        <CardContent className="p-4 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-medium text-foreground">Invite-functie wordt nog ingesteld</p>
            <p className="text-muted-foreground mt-0.5">
              De winactie voor het Nederlands Elftal shirt is bijna klaar. Probeer 't over een paar minuten opnieuw.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const inviteUrl = `${window.location.origin}/login?ref=${data.referral_code}`;
  const progressPct = Math.min(100, (data.active_referrals / data.required) * 100);

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
    const text = `Doe mee met Goaltje WK 2026 ⚽\nMaak kans op het officiële Nederlands Elftal shirt 2026 via mijn invite-link:\n${inviteUrl}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Goaltje WK 2026", text, url: inviteUrl }); }
      catch { /* user cancelled */ }
    } else {
      handleCopy();
    }
  };

  return (
    <Card className="border-0 shadow-elevation-2 overflow-hidden">
      <div className="gradient-primary h-1" />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <div className="h-9 w-9 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
            <Gift className="h-5 w-5 text-secondary" />
          </div>
          <div className="flex-1">
            <h3 className="font-display font-semibold text-sm">Win het officiële Nederlands Elftal shirt 2026 🎽</h3>
            <p className="text-[11px] text-muted-foreground">
              Nodig 5 vrienden uit en wordt het hoogst in de globale poel om het shirt te winnen.
            </p>
          </div>
          {data.qualified && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-bold flex items-center gap-1 shrink-0">
              <Trophy className="h-3 w-3" /> Gekwalificeerd
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground">Actieve vrienden</span>
            <span className="font-mono font-semibold">
              {data.active_referrals}/{data.required}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
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

        {/* Invite link */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-xs font-mono">
          <span className="flex-1 truncate">{inviteUrl}</span>
          <Button size="sm" variant="ghost" className="h-7 px-2 shrink-0" onClick={handleCopy}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>

        <Button size="sm" className="w-full gap-2 gradient-primary text-primary-foreground" onClick={handleShare}>
          <Share2 className="h-4 w-4" /> Deel met vrienden
        </Button>

        <p className="text-[10px] text-muted-foreground italic">
          Een vriend telt mee zodra ze zich registreren via jouw link én minimaal 1 voorspelling hebben gedaan.
        </p>
      </CardContent>
    </Card>
  );
}
