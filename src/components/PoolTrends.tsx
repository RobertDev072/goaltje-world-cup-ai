import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys, staleTimes } from "@/lib/queryKeys";

interface PoolTrendsProps {
  poolId: string;
  poolName?: string;
}

interface TrendsData {
  totalPredictions: number;
  avgGoals: number;
  drawRatePct: number;
  upsetCount: number;
  mostVotedScore: string;
  mood: "aanvallend" | "behoudend" | "neutraal";
}

const MOOD_CONFIG: Record<string, { emoji: string; color: string; desc: string }> = {
  aanvallend: { emoji: "⚡", color: "text-success", desc: "De poule voorspelt meer goals dan gemiddeld" },
  behoudend: { emoji: "🛡️", color: "text-primary", desc: "De poule speelt het veilig met lage scores" },
  neutraal: { emoji: "⚖️", color: "text-muted-foreground", desc: "Gebalanceerde voorspel-cultuur" },
};

export function PoolTrends({ poolId, poolName }: PoolTrendsProps) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.poolTrends(poolId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_pool_trends", { _pool_id: poolId });
      if (error) throw error;
      return data as unknown as TrendsData;
    },
    enabled: !!poolId,
    staleTime: staleTimes.stats,
  });

  if (isLoading || !data || data.totalPredictions === 0) return null;

  const mood = MOOD_CONFIG[data.mood] ?? MOOD_CONFIG.neutraal;

  return (
    <Card className="border-0 shadow-elevation-2">
      <CardContent className="p-4 space-y-3">
        <h2 className="text-xs font-semibold flex items-center gap-1.5">
          👥 {poolName ?? "Deze poule"} in cijfers
        </h2>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-muted/50 rounded-xl py-2.5">
            <p className="text-lg font-bold font-display tabular-nums">{data.avgGoals}</p>
            <p className="text-[10px] text-muted-foreground">Gem. goals/match</p>
          </div>
          <div className="bg-muted/50 rounded-xl py-2.5">
            <p className="text-lg font-bold font-display tabular-nums">{data.drawRatePct}%</p>
            <p className="text-[10px] text-muted-foreground">Gelijkspel-voorkeur</p>
          </div>
          <div className="bg-muted/50 rounded-xl py-2.5">
            <p className="text-lg font-bold font-display tabular-nums">{data.upsetCount}</p>
            <p className="text-[10px] text-muted-foreground">Upsets tegen consensus</p>
          </div>
          <div className="bg-muted/50 rounded-xl py-2.5">
            <p className="text-lg font-bold font-display tabular-nums">{data.mostVotedScore}</p>
            <p className="text-[10px] text-muted-foreground">Meest voorspeld</p>
          </div>
        </div>
        <div className="pt-2 border-t border-border/60 flex items-center gap-2">
          <span className="text-lg">{mood.emoji}</span>
          <div className="flex-1 text-[11px]">
            <p className="text-foreground font-medium">
              Poule-stemming: <span className={mood.color}>{data.mood}</span>
            </p>
            <p className="text-muted-foreground">{mood.desc}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
