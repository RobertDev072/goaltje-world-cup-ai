/**
 * Centralized query key factory.
 * Every query/mutation/invalidation must use these keys for consistency.
 */
export const queryKeys = {
  // Match detail predictions (per match, per user, per pool)
  myPredictions: (matchId: string, userId: string, poolId: string) =>
    ["my-predictions", matchId, userId, poolId] as const,

  // Home page predictions (per user, per pool, stable matchIds signature)
  homePredictions: (userId: string, matchIds: string[], poolId?: string) =>
    ["home-predictions", userId, matchIds.slice().sort().join(","), poolId ?? ""] as const,

  // Matches list page predictions (per user, optionally filtered by pool)
  matchPredictions: (userId: string, poolId: string) =>
    ["match-predictions", userId, poolId] as const,

  // Match lists
  upcomingMatches: () => ["upcoming-matches"] as const,
  allMatches: () => ["matches"] as const,
  matchDetail: (matchId: string) => ["match", matchId] as const,

  // Leaderboard
  leaderboard: (poolId: string) => ["leaderboard", poolId] as const,

  // Pools
  myPools: (userId: string) => ["my-pools", userId] as const,

  // Profile
  profile: (userId: string) => ["profile", userId] as const,

  // All prediction-related keys (for broad realtime invalidation)
  allPredictions: () => ["my-predictions"] as const,
  allHomePredictions: () => ["home-predictions"] as const,
  allMatchPredictions: () => ["match-predictions"] as const,
} as const;

/**
 * Centralized staleTime constants (in ms).
 * Keeps cache freshness consistent across all pages.
 */
export const staleTimes = {
  /** Matches list / detail — 30s (semi-live) */
  matches: 30_000,
  /** Predictions — 30s */
  predictions: 30_000,
  /** Pools & members — 2 min */
  pools: 2 * 60_000,
  /** Profile data — 5 min */
  profile: 5 * 60_000,
  /** Stats / news / AI insights — 1 hour */
  stats: 60 * 60_000,
  /** News cache — 5 min */
  news: 5 * 60_000,
  /** Leaderboard — 30s */
  leaderboard: 30_000,
  /** Static data (teams, rules) — 10 min */
  static: 10 * 60_000,
} as const;

