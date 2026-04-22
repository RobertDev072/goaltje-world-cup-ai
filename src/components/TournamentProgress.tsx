import { Globe2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys, staleTimes } from "@/lib/queryKeys";

const TOTAL_MATCHES = 104;

export function TournamentProgress() {
  const { data: finished = 0 } = useQuery({
    queryKey: queryKeys.tournamentFinishedCount(),
    queryFn: async () => {
      const { count } = await supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .eq("status", "finished");
      return count || 0;
    },
    staleTime: staleTimes.matches,
  });

  const pct = Math.min(100, Math.round((finished / TOTAL_MATCHES) * 100));

  return (
    <Card className="border-0 shadow-elevation-1 border border-secondary/30">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold inline-flex items-center gap-1.5">
            <Globe2 className="h-3.5 w-3.5 text-primary" /> WK 2026 voortgang
          </span>
          <span className="text-xs text-muted-foreground font-mono tabular-nums">
            {finished} / {TOTAL_MATCHES}
          </span>
        </div>
        <div
          className="h-1.5 rounded-full bg-muted overflow-hidden"
          role="progressbar"
          aria-valuenow={finished}
          aria-valuemin={0}
          aria-valuemax={TOTAL_MATCHES}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-secondary to-warning transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
          <span>Groepsfase</span>
          <span>1/16</span>
          <span>¼F</span>
          <span>½F</span>
          <span aria-hidden>🏆</span>
        </div>
      </CardContent>
    </Card>
  );
}
