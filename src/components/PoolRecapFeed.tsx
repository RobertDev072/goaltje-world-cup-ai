import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys, staleTimes } from "@/lib/queryKeys";

interface PoolRecapFeedProps {
  poolId: string;
  days?: number;
}

interface FeedItem {
  date: string;
  matchCount: number;
  winner: { name: string; points: number } | null;
  upset: {
    homeShort: string | null;
    awayShort: string | null;
    score: string;
    consensusPct: number;
  } | null;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

export function PoolRecapFeed({ poolId, days = 7 }: PoolRecapFeedProps) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.poolRecapFeed(poolId, days),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_pool_recap_feed", {
        _pool_id: poolId,
        _days: days,
      });
      if (error) throw error;
      return (data as unknown as FeedItem[]) || [];
    },
    enabled: !!poolId,
    staleTime: staleTimes.predictions,
  });

  if (isLoading || !data || data.length === 0) return null;

  return (
    <Card className="border-0 shadow-elevation-2 overflow-hidden">
      <div className="gradient-navy px-4 py-2 flex items-center justify-between text-white">
        <span className="text-xs font-semibold">📜 Recap-feed</span>
        <span className="text-[10px] opacity-70">laatste {days} dagen</span>
      </div>
      <CardContent className="p-0 divide-y divide-border/60">
        {data.map((item) => {
          // Kies primaire highlight: upset > winner > fallback match-count
          const hasUpset = item.upset !== null;
          const hasWinner = item.winner !== null;
          return (
            <div key={item.date} className="p-3 flex items-center gap-3 text-xs">
              <span className="text-[10px] text-muted-foreground font-mono shrink-0 w-12">
                {formatDateShort(item.date)}
              </span>

              {hasWinner && !hasUpset && (
                <>
                  <span className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">🥇</span>
                  <span className="text-foreground flex-1 min-w-0 truncate">
                    <b>{item.winner!.name}</b> pakt dagwinst
                  </span>
                  <span className="text-success font-bold shrink-0">+{item.winner!.points}pt</span>
                </>
              )}

              {hasUpset && !hasWinner && (
                <>
                  <span className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">😱</span>
                  <span className="text-foreground flex-1 min-w-0 truncate">
                    Upset: {item.upset!.homeShort} {item.upset!.score} {item.upset!.awayShort}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {item.upset!.consensusPct}% zat ernaast
                  </span>
                </>
              )}

              {hasWinner && hasUpset && (
                <>
                  <span className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">🥇</span>
                  <span className="text-foreground flex-1 min-w-0 truncate">
                    <b>{item.winner!.name}</b> (+{item.winner!.points}pt) · upset {item.upset!.homeShort} {item.upset!.score} {item.upset!.awayShort}
                  </span>
                </>
              )}

              {!hasWinner && !hasUpset && (
                <>
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">⚽</span>
                  <span className="text-muted-foreground flex-1">
                    {item.matchCount} match{item.matchCount > 1 ? "es" : ""} gespeeld
                  </span>
                </>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
