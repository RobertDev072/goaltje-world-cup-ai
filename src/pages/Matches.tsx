import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { PoolSelector } from "@/components/PoolSelector";
import { MatchSections } from "@/components/MatchSections";
import { GoalCelebration, useGoalCelebration } from "@/components/GoalCelebration";
import { useRealtimeMatches, useRealtimePredictions } from "@/hooks/useRealtimeMatches";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import { motion } from "framer-motion";
import { PredictionReminderBanner } from "@/components/PredictionReminderBanner";
import { getPredictionState, isMissingToday } from "@/lib/predictionStatus";


export default function Matches() {
  const { user } = useAuth();
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const { showGoal, triggerGoal, hideGoal } = useGoalCelebration();

  useRealtimeMatches((_matchId, _team) => triggerGoal());
  useRealtimePredictions();

  const { data: matches, isLoading } = useQuery({
    queryKey: queryKeys.allMatches(),
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("id, kickoff_utc, status, stage, group, venue, home_score, away_score, prediction_deadline_utc, external_id, home_team:teams!matches_home_team_id_fkey(id, name, short_name, flag_url), away_team:teams!matches_away_team_id_fkey(id, name, short_name, flag_url)")
        .order("kickoff_utc", { ascending: true });
      return data || [];
    },
    staleTime: staleTimes.matches,
  });

  const { data: pools } = useQuery({
    queryKey: queryKeys.myPools(user?.id || ""),
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("pool_members")
        .select("pool_id, pools(id, name)")
        .eq("user_id", user.id);
      return data?.map((row: any) => row.pools).filter(Boolean) || [];
    },
    enabled: !!user,
    staleTime: staleTimes.pools,
  });

  const activePoolId = selectedPoolId || pools?.[0]?.id || "";

  // Fetch user predictions
  const matchIds = matches?.map((m: any) => m.id) || [];
  const { data: myPredictions } = useQuery({
    queryKey: queryKeys.matchPredictions(user?.id || "", activePoolId),
    queryFn: async () => {
      if (!user || !activePoolId) return [];
      const { data } = await supabase
        .from("predictions")
        .select("match_id, home_pred, away_pred, points_awarded, pool_id")
        .eq("user_id", user.id)
        .eq("pool_id", activePoolId);
      return data || [];
    },
    enabled: !!user && !!activePoolId && matchIds.length > 0,
    staleTime: staleTimes.predictions,
  });

  const predictionMap = new Map(
    myPredictions?.map((p: any) => [p.match_id, p]) || []
  );

  const missingTodayMatches = useMemo(
    () => (matches || []).filter((match: any) => isMissingToday(match, predictionMap.get(match.id))),
    [matches, predictionMap],
  );

  const missedMatches = useMemo(
    () => (matches || []).filter((match: any) => getPredictionState(match, predictionMap.get(match.id)) === "missed"),
    [matches, predictionMap],
  );

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-4 space-y-4">
      <GoalCelebration visible={showGoal} onComplete={hideGoal} />
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold font-display">Wedstrijden</h1>
        </div>
      </motion.div>

      {/* Pool Selector */}
      {user && (
        <PoolSelector value={selectedPoolId} onChange={setSelectedPoolId} />
      )}

      {user && activePoolId && (
        <PredictionReminderBanner
          missingTodayMatches={missingTodayMatches}
          missedMatches={missedMatches}
        />
      )}

      {/* Match Sections */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : matches ? (
        <MatchSections
          matches={matches}
          predictions={predictionMap}
          showPredictions={!!user}
        />
      ) : null}

    </div>
  );
}
