import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Hook that subscribes to realtime changes on the matches table.
 */
export function useRealtimeMatches(onGoal?: (matchId: string, team: "home" | "away") => void) {
  const queryClient = useQueryClient();
  const prevScoresRef = useRef<Record<string, { home: number | null; away: number | null }>>({});

  const handleMatchChange = useCallback((payload: any) => {
    const newRow = payload.new;
    const oldRow = payload.old;

    if (!newRow) return;

    // Detect goals
    if (onGoal && newRow.status === "live") {
      const prevHome = oldRow?.home_score ?? prevScoresRef.current[newRow.id]?.home ?? null;
      const prevAway = oldRow?.away_score ?? prevScoresRef.current[newRow.id]?.away ?? null;
      
      if (newRow.home_score != null && prevHome != null && newRow.home_score > prevHome) {
        onGoal(newRow.id, "home");
      }
      if (newRow.away_score != null && prevAway != null && newRow.away_score > prevAway) {
        onGoal(newRow.id, "away");
      }
    }

    // Track scores
    prevScoresRef.current[newRow.id] = {
      home: newRow.home_score,
      away: newRow.away_score,
    };

    // Scoped invalidation
    queryClient.invalidateQueries({ queryKey: queryKeys.matchDetail(newRow.id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.upcomingMatches() });

    // Only invalidate heavy queries when score/status actually changed
    const scoreChanged =
      oldRow?.home_score !== newRow.home_score || oldRow?.away_score !== newRow.away_score;
    const statusChanged = oldRow?.status !== newRow.status;

    if (scoreChanged || statusChanged) {
      queryClient.invalidateQueries({ queryKey: queryKeys.allMatches() });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.allPredictions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.allHomePredictions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.allMatchPredictions() });
    }
  }, [queryClient, onGoal]);

  useEffect(() => {
    const channel = supabase
      .channel("live-matches")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches" },
        handleMatchChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [handleMatchChange]);
}

/**
 * Hook that subscribes to realtime prediction points updates.
 */
export function useRealtimePredictions() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("live-predictions")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "predictions" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
          queryClient.invalidateQueries({ queryKey: queryKeys.allPredictions() });
          queryClient.invalidateQueries({ queryKey: queryKeys.allHomePredictions() });
          queryClient.invalidateQueries({ queryKey: queryKeys.allMatchPredictions() });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
