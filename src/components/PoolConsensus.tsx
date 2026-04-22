import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";

interface PoolConsensusProps {
  poolId: string;
  matchId: string;
  homeShort?: string | null;
  awayShort?: string | null;
  className?: string;
}

interface TopScore {
  home_pred: number;
  away_pred: number;
  count: number;
}

interface ConsensusData {
  totalVotes: number;
  homeWins: number;
  draws: number;
  awayWins: number;
  topScores: TopScore[];
}

export function PoolConsensus({ poolId, matchId, homeShort, awayShort, className }: PoolConsensusProps) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.poolConsensus(poolId, matchId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_pool_consensus", {
        _pool_id: poolId,
        _match_id: matchId,
      });
      if (error) throw error;
      return data as unknown as ConsensusData;
    },
    enabled: !!poolId && !!matchId,
    staleTime: staleTimes.predictions,
  });

  if (isLoading || !data || data.totalVotes < 2) return null;

  const { totalVotes, homeWins, draws, awayWins, topScores } = data;
  const homePct = Math.round((homeWins / totalVotes) * 100);
  const drawPct = Math.round((draws / totalVotes) * 100);
  const awayPct = Math.max(0, 100 - homePct - drawPct);

  return (
    <Card className={cn("border-0 shadow-elevation-2 overflow-hidden", className)}>
      <div className="gradient-navy px-4 py-2 flex items-center justify-between text-white">
        <span className="text-xs font-semibold">🗳 Wat denkt de poule?</span>
        <span className="text-[10px] opacity-70">{totalVotes} ingevuld</span>
      </div>
      <CardContent className="p-4 space-y-3">
        <div>
          <div className="flex h-3 rounded-full overflow-hidden text-[9px] font-bold text-white">
            {homePct > 0 && (
              <div
                className="flex items-center justify-center bg-primary"
                style={{ width: `${homePct}%` }}
                title={`${homePct}% tipt ${homeShort || "thuis"} wint`}
              >
                {homePct >= 10 ? `${homePct}%` : ""}
              </div>
            )}
            {drawPct > 0 && (
              <div
                className="flex items-center justify-center bg-slate-400"
                style={{ width: `${drawPct}%` }}
                title={`${drawPct}% tipt gelijk`}
              >
                {drawPct >= 10 ? `${drawPct}%` : ""}
              </div>
            )}
            {awayPct > 0 && (
              <div
                className="flex items-center justify-center bg-destructive"
                style={{ width: `${awayPct}%` }}
                title={`${awayPct}% tipt ${awayShort || "uit"} wint`}
              >
                {awayPct >= 10 ? `${awayPct}%` : ""}
              </div>
            )}
          </div>
          <div className="flex justify-between text-[10px] mt-1.5">
            <span className="font-semibold text-primary">{homeShort || "Thuis"} wint</span>
            <span className="text-muted-foreground">Gelijk</span>
            <span className="text-destructive">{awayShort || "Uit"} wint</span>
          </div>
        </div>

        {topScores.length > 0 && (
          <div className="pt-3 border-t border-border/60">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">
              Populairste uitslagen
            </p>
            <div className="flex gap-2">
              {topScores.map((s, i) => {
                const pct = Math.round((s.count / totalVotes) * 100);
                const isTop = i === 0;
                return (
                  <div
                    key={`${s.home_pred}-${s.away_pred}`}
                    className={cn(
                      "flex-1 rounded-lg p-2 text-center",
                      isTop
                        ? "bg-primary/5 border border-primary/20"
                        : "bg-muted/50",
                    )}
                  >
                    <p
                      className={cn(
                        "font-display font-bold tabular-nums",
                        isTop ? "text-primary" : "text-foreground",
                      )}
                    >
                      {s.home_pred} – {s.away_pred}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {s.count}× · {pct}%
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
