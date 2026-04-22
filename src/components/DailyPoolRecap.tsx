import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys, staleTimes } from "@/lib/queryKeys";

interface DailyPoolRecapProps {
  poolId: string;
  poolName?: string;
}

interface RecapData {
  matchCount: number;
  dayWinner: { userId: string; name: string; points: number } | null;
  exactScorers: Array<{
    userId: string;
    name: string;
    homeShort: string | null;
    awayShort: string | null;
    score: string;
  }>;
  biggestUpset: {
    homeShort: string | null;
    awayShort: string | null;
    score: string;
    consensusPct: number;
  } | null;
}

function formatYesterdayNL(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Amsterdam",
  });
}

export function DailyPoolRecap({ poolId, poolName }: DailyPoolRecapProps) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.dailyPoolRecap(poolId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_daily_pool_recap", {
        _pool_id: poolId,
      });
      if (error) throw error;
      return data as unknown as RecapData | null;
    },
    enabled: !!poolId,
    staleTime: staleTimes.predictions,
  });

  if (isLoading || !data || data.matchCount === 0) return null;

  const hasContent =
    data.dayWinner || data.exactScorers.length > 0 || data.biggestUpset;
  if (!hasContent) return null;

  return (
    <Card className="border-0 shadow-elevation-2 overflow-hidden">
      <div className="gradient-navy px-4 py-2 text-white flex items-center justify-between">
        <span className="text-xs font-semibold flex items-center gap-1.5">
          ✨ Gisteren{poolName ? ` in ${poolName}` : ""}
        </span>
        <span className="text-[10px] opacity-70">{formatYesterdayNL()}</span>
      </div>
      <CardContent className="p-4 space-y-2.5">
        {data.dayWinner && (
          <div className="flex items-center gap-2 text-xs">
            <span className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
              🥇
            </span>
            <span className="text-muted-foreground">Dagwinnaar:</span>
            <span className="font-semibold">{data.dayWinner.name}</span>
            <span className="ml-auto text-success font-bold">
              +{data.dayWinner.points}pt
            </span>
          </div>
        )}

        {data.exactScorers.length > 0 && (
          <div className="flex items-start gap-2 text-xs">
            <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              🎯
            </span>
            <span className="text-muted-foreground shrink-0">Exact:</span>
            <span className="font-semibold flex-1 min-w-0 truncate">
              {data.exactScorers
                .slice(0, 3)
                .map((e) => e.name)
                .join(", ")}
              {data.exactScorers.length > 3 && ` +${data.exactScorers.length - 3}`}
            </span>
            <span className="font-mono text-muted-foreground shrink-0">
              {data.exactScorers[0].homeShort ?? "?"} {data.exactScorers[0].score}{" "}
              {data.exactScorers[0].awayShort ?? "?"}
            </span>
          </div>
        )}

        {data.biggestUpset && (
          <div className="flex items-center gap-2 text-xs">
            <span className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              😱
            </span>
            <span className="text-muted-foreground">Verrassing:</span>
            <span className="font-semibold flex-1 truncate">
              {data.biggestUpset.homeShort ?? "?"} {data.biggestUpset.score}{" "}
              {data.biggestUpset.awayShort ?? "?"}
            </span>
            <span className="text-[10px] text-muted-foreground shrink-0">
              ({data.biggestUpset.consensusPct}% zat ernaast)
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
