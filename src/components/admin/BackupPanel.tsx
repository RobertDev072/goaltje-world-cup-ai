import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Database, Download, Plus, RotateCcw, ShieldCheck, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatNLDateTime } from "@/lib/timezone";

interface BackupRow {
  id: string;
  created_at: string;
  kind: string;
  prediction_count: number;
  bonus_count: number;
}

export function BackupPanel({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: backups, isLoading } = useQuery({
    queryKey: ["admin-prediction-backups"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_prediction_backups");
      if (error) throw error;
      return (data || []) as BackupRow[];
    },
    enabled,
    refetchInterval: enabled ? 60_000 : false,
  });

  const makeBackup = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("create_prediction_backup", { _kind: "manual" });
      if (error) throw error;
      return data as { prediction_count: number };
    },
    onSuccess: (d) => {
      toast({ title: "Backup gemaakt ✓", description: `${d?.prediction_count ?? 0} voorspellingen veiliggesteld.` });
      queryClient.invalidateQueries({ queryKey: ["admin-prediction-backups"] });
    },
    onError: (e: Error) => toast({ title: "Fout", description: e.message, variant: "destructive" }),
  });

  const download = async (b: BackupRow) => {
    setBusyId(b.id);
    try {
      const { data, error } = await supabase.rpc("get_prediction_backup", { _backup_id: b.id });
      if (error) throw error;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date(b.created_at).toISOString().slice(0, 19).replace(/[:T]/g, "-");
      a.href = url;
      a.download = `goaltje-backup-${stamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Download gestart" });
    } catch (e) {
      toast({ title: "Download mislukt", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const restore = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc("restore_prediction_backup", { _backup_id: id });
      if (error) throw error;
      return data as { restored_predictions: number; restored_bonus: number };
    },
    onSuccess: (d) => {
      toast({
        title: "Herstel voltooid",
        description: `${d?.restored_predictions ?? 0} voorspellingen + ${d?.restored_bonus ?? 0} bonus teruggezet (alleen ontbrekende).`,
      });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
    onError: (e: Error) => toast({ title: "Herstel mislukt", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm bg-emerald-50 dark:bg-emerald-950/20">
        <CardContent className="p-3 flex items-start gap-2 text-xs">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-muted-foreground">
            <p className="font-medium text-foreground">Eigen backups (Free plan)</p>
            <p>Elke nacht om 03:30 wordt automatisch een snapshot van álle voorspellingen
              gemaakt. Download er één als bestand, of herstel ontbrekende voorspellingen.
              Herstel <b>verwijdert of overschrijft nooit</b> — het vult alleen gaten.</p>
          </div>
        </CardContent>
      </Card>

      <Button
        className="w-full gap-2"
        onClick={() => makeBackup.mutate()}
        disabled={makeBackup.isPending}
      >
        <Plus className="h-4 w-4" />
        {makeBackup.isPending ? "Bezig..." : "Maak nu een backup"}
      </Button>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-2">
          <h3 className="font-display font-semibold text-sm flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" /> Beschikbare backups
            {backups && <Badge variant="outline" className="text-[10px]">{backups.length}</Badge>}
          </h3>

          {isLoading ? (
            <Skeleton className="h-32 rounded-md" />
          ) : (backups?.length ?? 0) === 0 ? (
            <p className="text-xs text-muted-foreground py-3 text-center">Nog geen backups.</p>
          ) : (
            <div className="space-y-1.5">
              {backups!.map((b) => (
                <div key={b.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 text-xs">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{formatNLDateTime(b.created_at)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {b.prediction_count} voorspellingen · {b.bonus_count} bonus
                      {b.kind !== "auto" && <> · <span className="uppercase">{b.kind}</span></>}
                    </p>
                  </div>
                  <Button
                    size="sm" variant="outline" className="h-7 px-2 gap-1 shrink-0"
                    onClick={() => download(b)} disabled={busyId === b.id}
                  >
                    <Download className="h-3.5 w-3.5" /> JSON
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 shrink-0 text-primary">
                        <RotateCcw className="h-3.5 w-3.5" /> Herstel
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Voorspellingen herstellen?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Dit zet <b>ontbrekende</b> voorspellingen uit deze backup
                          ({formatNLDateTime(b.created_at)}) terug. Bestaande voorspellingen
                          worden <b>niet</b> aangeraakt of overschreven. Niets wordt verwijderd.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuleren</AlertDialogCancel>
                        <AlertDialogAction onClick={() => restore.mutate(b.id)} disabled={restore.isPending}>
                          {restore.isPending ? "Herstellen..." : "Herstel ontbrekende"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
