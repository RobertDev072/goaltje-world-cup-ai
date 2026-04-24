import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSyncPreferences } from "@/hooks/useSyncPreferences";
import { toast } from "@/hooks/use-toast";
import { Link2, Layers, Loader2 } from "lucide-react";

export function SyncOnboardingModal() {
  const { user } = useAuth();
  const { onboarded, isLoading, enableSync, markOnboardingSeen } = useSyncPreferences();
  const [open, setOpen] = useState(false);

  // Pas tonen als user minstens één pool heeft (anders is sync zinloos)
  const { data: poolCount } = useQuery({
    queryKey: ["sync-onboarding-pool-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("pool_members")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      return count ?? 0;
    },
    enabled: !!user && !onboarded && !isLoading,
  });

  useEffect(() => {
    if (!isLoading && !onboarded && (poolCount ?? 0) >= 1) setOpen(true);
  }, [isLoading, onboarded, poolCount]);

  if (!user) return null;

  const handleEnable = async () => {
    try {
      const result = await enableSync.mutateAsync();
      const filled = result?.matches_filled ?? 0;
      const pools = result?.pools_affected ?? 0;
      toast({
        title: "Sync ingeschakeld 🔗",
        description: filled > 0
          ? `${filled} voorspelling${filled === 1 ? "" : "en"} aangevuld in ${pools} pool${pools === 1 ? "" : "s"}.`
          : "Toekomstige voorspellingen worden in al je pools opgeslagen.",
      });
      setOpen(false);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[SyncOnboardingModal] enable failed:", err);
      toast({
        title: "Er ging iets mis",
        description: err instanceof Error ? err.message : "Probeer het opnieuw.",
        variant: "destructive",
      });
    }
  };

  const handleSeparate = async () => {
    try {
      await markOnboardingSeen.mutateAsync();
      setOpen(false);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[SyncOnboardingModal] markSeen failed:", err);
      toast({
        title: "Er ging iets mis",
        description: err instanceof Error ? err.message : "Probeer het opnieuw.",
        variant: "destructive",
      });
    }
  };

  const busy = enableSync.isPending || markOnboardingSeen.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !busy) handleSeparate(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Hoe wil je voorspellen?</DialogTitle>
          <DialogDescription>
            Je doet mee aan minstens één pool. Kies hoe je je voorspellingen invult — dit kun je later in je profiel altijd nog aanpassen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <button
            type="button"
            disabled={busy}
            onClick={handleEnable}
            className="relative w-full text-left rounded-xl border-2 border-primary bg-primary/5 p-4 hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            <span className="absolute top-2 right-3 text-[10px] font-semibold uppercase tracking-wide text-primary">Aanrader</span>
            <div className="flex items-start gap-3">
              <Link2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-sm">Eén keer invullen voor alle pools</p>
                <p className="text-xs text-muted-foreground">
                  Vul een wedstrijd één keer in en je voorspelling staat in al je pools tegelijk.
                </p>
              </div>
              {enableSync.isPending && <Loader2 className="h-4 w-4 animate-spin text-primary ml-auto" />}
            </div>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={handleSeparate}
            className="w-full text-left rounded-xl border border-border bg-card p-4 hover:bg-muted transition-colors disabled:opacity-50"
          >
            <div className="flex items-start gap-3">
              <Layers className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-sm">Per pool apart invullen</p>
                <p className="text-xs text-muted-foreground">
                  Geef per pool een eigen voorspelling — handig als je tegen jezelf wilt gokken.
                </p>
              </div>
              {markOnboardingSeen.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />}
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
