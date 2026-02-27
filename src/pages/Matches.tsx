import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { PoolSelector } from "@/components/PoolSelector";
import { MatchSections } from "@/components/MatchSections";
import { GoalCelebration, useGoalCelebration } from "@/components/GoalCelebration";
import { useRealtimeMatches, useRealtimePredictions } from "@/hooks/useRealtimeMatches";
import { motion } from "framer-motion";


export default function Matches() {
  const { user } = useAuth();
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const { showGoal, triggerGoal, hideGoal } = useGoalCelebration();

  useRealtimeMatches((_matchId, _team) => triggerGoal());
  useRealtimePredictions();

  const { data: matches, isLoading } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
        .order("kickoff_utc", { ascending: true });
      return data || [];
    },
  });

  // Fetch user predictions
  const matchIds = matches?.map((m: any) => m.id) || [];
  const { data: myPredictions } = useQuery({
    queryKey: ["match-predictions", user?.id, selectedPoolId],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase
        .from("predictions")
        .select("match_id, home_pred, away_pred, points_awarded, pool_id")
        .eq("user_id", user.id);
      if (selectedPoolId) {
        query = query.eq("pool_id", selectedPoolId);
      }
      const { data } = await query;
      return data || [];
    },
    enabled: !!user && matchIds.length > 0,
  });

  const predictionMap = new Map(
    myPredictions?.map((p: any) => [p.match_id, p]) || []
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
