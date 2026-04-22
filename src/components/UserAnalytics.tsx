import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";

interface UserAnalyticsProps {
  userId: string;
  poolId?: string | null;
  poolName?: string | null;
  days?: number;
}

interface RankPoint {
  date: string;
  rank: number;
  points: number;
}

interface StageAccuracy {
  stage: string;
  stageLabel: string;
  correct: number;
  total: number;
  pct: number;
}

function accuracyColor(pct: number): string {
  if (pct >= 60) return "bg-success";
  if (pct >= 40) return "bg-primary";
  if (pct >= 25) return "bg-warning";
  return "bg-destructive";
}

function accuracyTextColor(pct: number): string {
  if (pct >= 60) return "text-success";
  if (pct >= 40) return "text-primary";
  if (pct >= 25) return "text-warning";
  return "text-destructive";
}

export function UserAnalytics({ userId, poolId, poolName, days = 14 }: UserAnalyticsProps) {
  const { data: evolution } = useQuery({
    queryKey: queryKeys.userRankEvolution(userId, poolId || "", days),
    queryFn: async () => {
      if (!poolId) return [];
      const { data, error } = await supabase.rpc("get_user_rank_evolution", {
        _pool_id: poolId,
        _user_id: userId,
        _days: days,
      });
      if (error) throw error;
      return (data as unknown as RankPoint[]) || [];
    },
    enabled: !!userId && !!poolId,
    staleTime: staleTimes.stats,
  });

  const { data: stages } = useQuery({
    queryKey: queryKeys.userStageAccuracy(userId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_stage_accuracy", {
        _user_id: userId,
      });
      if (error) throw error;
      return (data as unknown as StageAccuracy[]) || [];
    },
    enabled: !!userId,
    staleTime: staleTimes.stats,
  });

  // Sparkline path — verbergt als alle ranks hetzelfde of te weinig data
  const sparkline = useMemo(() => {
    if (!evolution || evolution.length < 2) return null;
    const ranks = evolution.map((e) => e.rank);
    const minR = Math.min(...ranks);
    const maxR = Math.max(...ranks);
    if (minR === maxR) return null; // Geen verandering
    const width = 300;
    const height = 50;
    const padding = 5;
    const xStep = (width - padding * 2) / (evolution.length - 1);
    const yScale = (height - padding * 2) / (maxR - minR);
    const points = evolution.map((e, i) => {
      const x = padding + i * xStep;
      // Rank 1 = hoog (boven), grote rank = laag (onder) — dus inverteren
      const y = padding + (e.rank - minR) * yScale;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return {
      points: points.join(" "),
      last: { x: padding + (evolution.length - 1) * xStep, y: padding + (evolution[evolution.length - 1].rank - minR) * yScale },
      first: evolution[0].rank,
      current: evolution[evolution.length - 1].rank,
      best: minR,
    };
  }, [evolution]);

  const hasRankData = sparkline !== null;
  const hasStageData = stages && stages.length > 0;

  if (!hasRankData && !hasStageData) return null;

  return (
    <div className="space-y-3">
      {/* Rang-evolutie sparkline */}
      {hasRankData && poolId && sparkline && (
        <Card className="border-0 shadow-elevation-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                📉 Jouw rang afgelopen {days} dagen
              </span>
              <span className="text-[10px] text-muted-foreground">
                {poolName ?? "Pool"}
              </span>
            </div>
            <svg viewBox="0 0 300 60" className="w-full h-16">
              <polyline
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={sparkline.points}
              />
              <circle
                cx={sparkline.last.x}
                cy={sparkline.last.y}
                r="4"
                fill="hsl(var(--secondary))"
                stroke="white"
                strokeWidth="2"
              />
            </svg>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>#{sparkline.first} toen</span>
              <span>·</span>
              <span>beste: #{sparkline.best}</span>
              <span>·</span>
              <span className="text-primary font-bold">#{sparkline.current} nu</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-fase accuratesse */}
      {hasStageData && (
        <Card className="border-0 shadow-elevation-2">
          <CardContent className="p-4 space-y-3">
            <h2 className="text-xs font-semibold flex items-center gap-1.5">
              🎯 Accuratesse per toernooifase
            </h2>
            <div className="space-y-2">
              {stages!.map((s) => (
                <div key={s.stage}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-muted-foreground">{s.stageLabel}</span>
                    <span className={cn("font-bold tabular-nums", accuracyTextColor(s.pct))}>
                      {s.correct}/{s.total} · {s.pct}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full transition-all", accuracyColor(s.pct))}
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
