import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";

interface WeekSummaryProps {
  userId: string;
  poolId: string;
}

interface SummaryData {
  weekPoints: number;
  exactCount: number;
  missedCount: number;
  rankNow: number | null;
  rankDelta: number;
}

function getIsoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function WeekSummary({ userId, poolId }: WeekSummaryProps) {
  const { data } = useQuery({
    queryKey: queryKeys.userWeekSummary(userId, poolId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_week_summary", {
        _pool_id: poolId,
        _user_id: userId,
      });
      if (error) throw error;
      return data as unknown as SummaryData;
    },
    enabled: !!userId && !!poolId,
    staleTime: staleTimes.stats,
  });

  if (!data) return null;

  // Verberg als er echt niets is gebeurd deze week
  const hasAnything = data.weekPoints > 0 || data.exactCount > 0 || data.missedCount > 0 || data.rankDelta !== 0;
  if (!hasAnything) return null;

  const weekNum = getIsoWeek(new Date());

  return (
    <Card className="border-0 shadow-elevation-2 overflow-hidden">
      <div className="px-4 py-2 flex items-center justify-between border-b border-border/60">
        <span className="text-xs font-semibold">📅 Deze week (wk {weekNum})</span>
      </div>
      <CardContent className="p-0">
        <div className="grid grid-cols-4 divide-x divide-border/60 text-center">
          <div className="p-3">
            <p className={cn(
              "text-lg font-bold font-display tabular-nums",
              data.weekPoints > 0 ? "text-success" : "text-muted-foreground"
            )}>
              +{data.weekPoints}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">punten</p>
          </div>
          <div className="p-3">
            <p className={cn(
              "text-lg font-bold font-display tabular-nums",
              data.rankDelta > 0 && "text-success",
              data.rankDelta < 0 && "text-destructive",
              data.rankDelta === 0 && "text-muted-foreground"
            )}>
              {data.rankDelta > 0 && "↗ +"}
              {data.rankDelta < 0 && "↘ "}
              {data.rankDelta === 0 ? "—" : data.rankDelta}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">ranking</p>
          </div>
          <div className="p-3">
            <p className="text-lg font-bold font-display tabular-nums">{data.exactCount}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">exacten</p>
          </div>
          <div className="p-3">
            <p className={cn(
              "text-lg font-bold font-display tabular-nums",
              data.missedCount > 0 ? "text-destructive" : "text-muted-foreground"
            )}>
              {data.missedCount}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">gemist</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
