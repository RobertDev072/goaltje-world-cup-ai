import { useQuery } from "@tanstack/react-query";
import { Trophy, Users, Target, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";

interface PoolHeaderCardProps {
  poolId: string;
  poolName: string;
  pools: Array<{ id: string; name: string }>;
  onPoolChange: (poolId: string) => void;
  totalMatches?: number;
}

export function PoolHeaderCard({
  poolId,
  poolName,
  pools,
  onPoolChange,
  totalMatches = 104,
}: PoolHeaderCardProps) {
  const { user } = useAuth();
  const multiple = pools.length > 1;

  const { data: memberCount } = useQuery({
    queryKey: queryKeys.poolMemberCount(poolId),
    queryFn: async () => {
      if (!poolId) return 0;
      const { count } = await supabase
        .from("pool_members")
        .select("user_id", { count: "exact", head: true })
        .eq("pool_id", poolId);
      return count || 0;
    },
    enabled: !!poolId,
    staleTime: staleTimes.pools,
  });

  const { data: finishedCount } = useQuery({
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

  const { data: openForUser } = useQuery({
    queryKey: queryKeys.poolOpenPredictions(user?.id || "", poolId),
    queryFn: async () => {
      if (!user || !poolId) return 0;
      const [{ count: totalScheduled }, { count: predicted }] = await Promise.all([
        supabase
          .from("matches")
          .select("id", { count: "exact", head: true })
          .eq("status", "scheduled"),
        supabase
          .from("predictions")
          .select("match_id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("pool_id", poolId),
      ]);
      return Math.max((totalScheduled || 0) - (predicted || 0), 0);
    },
    enabled: !!user && !!poolId,
    staleTime: staleTimes.predictions,
  });

  const content = (
    <div className="flex items-center gap-3 w-full">
      <div className="w-10 h-10 rounded-xl gradient-navy flex items-center justify-center shrink-0 shadow-elevation-1">
        <Trophy className="h-5 w-5 text-secondary" />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="font-display font-bold text-base truncate">{poolName}</p>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" />
            {memberCount ?? "…"} {memberCount === 1 ? "lid" : "leden"}
          </span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Target className="h-3 w-3" />
            {finishedCount ?? 0}/{totalMatches}
          </span>
          {openForUser != null && openForUser > 0 && (
            <>
              <span aria-hidden>·</span>
              <span className="text-primary font-medium">{openForUser} open</span>
            </>
          )}
        </div>
      </div>
      {multiple && <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
    </div>
  );

  if (!multiple) {
    return (
      <Card className="border border-secondary/30 shadow-elevation-1">
        <CardContent className="p-3">{content}</CardContent>
      </Card>
    );
  }

  return (
    <Select value={poolId} onValueChange={onPoolChange}>
      <SelectTrigger
        className={cn(
          "h-auto w-full p-3 rounded-2xl border border-secondary/30 bg-card shadow-elevation-1 hover:bg-accent/5 transition",
          "[&>svg]:hidden text-left"
        )}
        aria-label="Kies poule"
      >
        <SelectValue asChild>{content}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {pools.map((pool) => (
          <SelectItem key={pool.id} value={pool.id}>
            {pool.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
