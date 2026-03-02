/**
 * Centralized query key factory.
 * Every query/mutation/invalidation must use these keys for consistency.
 */
export const queryKeys = {
  // Match detail predictions (per match, per user, per pool)
  myPredictions: (matchId: string, userId: string) =>
    ["my-predictions", matchId, userId] as const,

  // Home page predictions (per user, per matchIds set)
  homePredictions: (userId: string, matchIds: string[]) =>
    ["home-predictions", userId, matchIds] as const,

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
