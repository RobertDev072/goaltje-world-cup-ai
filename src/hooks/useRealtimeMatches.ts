import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

/** Minimum ms between realtime-triggered invalidations */
const THROTTLE_MS = 2_000;

function useThrottledCallback(fn: () => void, delay: number) {
  const lastRun = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  return useCallback(() => {
    const now = Date.now();
    const remaining = delay - (now - lastRun.current);
    if (remaining <= 0) {
      lastRun.current = now;
      fn();
    } else if (!timer.current) {
      timer.current = setTimeout(() => {
        lastRun.current = Date.now();
        timer.current = undefined;
        fn();
      }, remaining);
    }
  }, [fn, delay]);
}

/**
 * Hook that subscribes to realtime changes on the matches table.
 */
export function useRealtimeMatches(onGoal?: (matchId: string, team: "home" | "away") => void) {
  const queryClient = useQueryClient();
  const prevScoresRef = useRef<Record<string, { home: number | null; away: number | null }>>({});

  const invalidateHeavy = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.allMatches() });
    // Pool-scoped: invalidate all leaderboard keys (prefixed)
    queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.allPredictions() });
    queryClient.invalidateQueries({ queryKey: queryKeys.allHomePredictions() });
    queryClient.invalidateQueries({ queryKey: queryKeys.allMatchPredictions() });
    queryClient.invalidateQueries({ queryKey: ["my-pool-predictions"] });
  }, [queryClient]);

  const throttledInvalidateHeavy = useThrottledCallback(invalidateHeavy, THROTTLE_MS);

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

    // Scoped invalidation (always immediate)
    queryClient.invalidateQueries({ queryKey: queryKeys.matchDetail(newRow.id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.upcomingMatches() });

    // Only invalidate heavy queries when score/status actually changed — throttled
    const scoreChanged =
      oldRow?.home_score !== newRow.home_score || oldRow?.away_score !== newRow.away_score;
    const statusChanged = oldRow?.status !== newRow.status;

    if (scoreChanged || statusChanged) {
      throttledInvalidateHeavy();
    }
  }, [queryClient, onGoal, throttledInvalidateHeavy]);

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
 * Throttled to max 1 invalidation per 2 seconds.
 */
export function useRealtimePredictions() {
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.allPredictions() });
    queryClient.invalidateQueries({ queryKey: queryKeys.allHomePredictions() });
    queryClient.invalidateQueries({ queryKey: queryKeys.allMatchPredictions() });
    queryClient.invalidateQueries({ queryKey: ["my-pool-predictions"] });
  }, [queryClient]);

  const throttledInvalidate = useThrottledCallback(invalidate, THROTTLE_MS);

  useEffect(() => {
    const channel = supabase
      .channel("live-predictions")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "predictions" },
        () => throttledInvalidate()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [throttledInvalidate]);
}
