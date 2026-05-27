import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { queryKeys, staleTimes } from "@/lib/queryKeys";

interface MemberPrediction {
  user_id: string;
  name: string;
  avatar_url: string | null;
  home_pred: number;
  away_pred: number;
  points_awarded: number | null;
  is_self: boolean;
}

interface Props {
  poolId: string;
  matchId: string;
  homeShort?: string | null;
  awayShort?: string | null;
  matchFinished: boolean;
}

export function MatchMemberPredictions({
  poolId, matchId, homeShort, awayShort, matchFinished,
}: Props) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.matchPredictionsPerPool(poolId, matchId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_match_predictions_for_pool", {
        _pool_id: poolId,
        _match_id: matchId,
      });
      if (error) throw error;
      return (data || []) as MemberPrediction[];
    },
    enabled: !!poolId && !!matchId,
    staleTime: staleTimes.predictions,
  });

  if (isLoading) return <Skeleton className="h-24 rounded-xl" />;
  if (!data || data.length === 0) return null;

  return (
    <Card className="border-0 shadow-md">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Wat heeft je poule ingevuld
          </h3>
          <span className="text-[10px] text-muted-foreground">{data.length} lid{data.length === 1 ? "" : "ren"}</span>
        </div>

        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {data.map((p) => (
            <div
              key={p.user_id}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm",
                p.is_self ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted/50",
              )}
            >
              <div className="h-6 w-6 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center text-[10px] font-bold">
                {p.avatar_url
                  ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                  : p.name.charAt(0).toUpperCase()}
              </div>

              <span className="flex-1 truncate text-xs">
                {p.name}
                {p.is_self && <span className="ml-1 text-[10px] text-primary">(jij)</span>}
              </span>

              <span className="font-mono text-xs tabular-nums">
                <span className="text-muted-foreground mr-1">{homeShort}</span>
                <span className="font-semibold">{p.home_pred}</span>
                <span className="text-muted-foreground mx-1">–</span>
                <span className="font-semibold">{p.away_pred}</span>
                <span className="text-muted-foreground ml-1">{awayShort}</span>
              </span>

              {matchFinished && p.points_awarded !== null && (
                <Badge
                  variant={p.points_awarded > 0 ? "default" : "secondary"}
                  className={cn(
                    "text-[10px] gap-0.5 shrink-0",
                    p.points_awarded >= 6 && "bg-emerald-500 hover:bg-emerald-500",
                    p.points_awarded >= 3 && p.points_awarded < 6 && "bg-blue-500 hover:bg-blue-500",
                  )}
                >
                  {p.points_awarded >= 6 && <Trophy className="h-3 w-3" />}
                  {p.points_awarded}p
                </Badge>
              )}
            </div>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground italic">
          Pas zichtbaar nadat de deadline van de wedstrijd voorbij is.
        </p>
      </CardContent>
    </Card>
  );
}
