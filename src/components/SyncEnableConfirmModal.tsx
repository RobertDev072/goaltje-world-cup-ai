import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import { useSyncPreferences } from "@/hooks/useSyncPreferences";
import { toast } from "@/hooks/use-toast";

type PreviewRow = {
  pool_id: string;
  pool_name: string;
  current_count: number;
  will_be_added: number;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SyncEnableConfirmModal({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { enableSync } = useSyncPreferences();

  const { data: rows, isLoading } = useQuery({
    queryKey: queryKeys.syncPreview(user?.id ?? ""),
    queryFn: async (): Promise<PreviewRow[]> => {
      const rpcClient = supabase.rpc.bind(supabase) as unknown as (
        fn: string,
      ) => Promise<{ data: PreviewRow[] | null; error: Error | null }>;
      const { data, error } = await rpcClient("preview_prediction_sync");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && open,
    staleTime: staleTimes.profile,
  });

  const totalToAdd = (rows ?? []).reduce((acc, r) => acc + r.will_be_added, 0);

  const confirm = async () => {
    try {
      const result = await enableSync.mutateAsync();
      toast({
        title: "Sync ingeschakeld 🔗",
        description:
          result.matches_filled > 0
            ? `${result.matches_filled} voorspelling${result.matches_filled === 1 ? "" : "en"} aangevuld in ${result.pools_affected} pool${result.pools_affected === 1 ? "" : "s"}.`
            : "Toekomstige voorspellingen worden gedeeld over al je pools.",
      });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Er ging iets mis",
        description: err instanceof Error ? err.message : "Probeer het opnieuw.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Voorspellingen synchroniseren?</DialogTitle>
          <DialogDescription>
            Bestaande voorspellingen blijven zoals ze zijn — alleen lege plekken worden aangevuld met je meest recente voorspelling per wedstrijd.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-72 overflow-y-auto py-2 -mx-1 px-1">
          {isLoading ? (
            <>
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
            </>
          ) : rows && rows.length > 0 ? (
            rows.map((r) => (
              <div
                key={r.pool_id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3 text-sm"
              >
                <span className="font-medium truncate">{r.pool_name}</span>
                <span className="text-xs text-muted-foreground shrink-0 text-right">
                  <span>{r.current_count} blijven</span>
                  {r.will_be_added > 0 && (
                    <>
                      ,{" "}
                      <span className="text-success font-semibold">
                        +{r.will_be_added} aanvullen
                      </span>
                    </>
                  )}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Geen pools gevonden.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enableSync.isPending}>
            Annuleren
          </Button>
          <Button onClick={confirm} disabled={enableSync.isPending || isLoading}>
            {enableSync.isPending
              ? "Bezig…"
              : totalToAdd > 0
                ? `Ja, vul ${totalToAdd} aan`
                : "Ja, synchroniseer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
