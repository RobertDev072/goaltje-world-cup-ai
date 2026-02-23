import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Hook that subscribes to realtime changes on the matches table.
 * When a match is updated (score change, status change), it invalidates
 * relevant queries so the UI updates instantly.
 * 
 * Also detects goal events by comparing old vs new scores.
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

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ["matches"] });
    queryClient.invalidateQueries({ queryKey: ["upcoming-matches"] });
    queryClient.invalidateQueries({ queryKey: ["match", newRow.id] });
    queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    queryClient.invalidateQueries({ queryKey: ["my-predictions"] });
    queryClient.invalidateQueries({ queryKey: ["home-predictions"] });
    queryClient.invalidateQueries({ queryKey: ["match-predictions"] });
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
 * When points are recalculated (after admin enters scores), the leaderboard updates.
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
          queryClient.invalidateQueries({ queryKey: ["my-predictions"] });
          queryClient.invalidateQueries({ queryKey: ["home-predictions"] });
          queryClient.invalidateQueries({ queryKey: ["match-predictions"] });
          queryClient.invalidateQueries({ queryKey: ["my-pool-predictions"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
