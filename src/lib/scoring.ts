// Default scoring rules for Goaltje — "Classic WK" preset
export interface ScoringRules {
  exact: number;     // Exact score correct (no stacking)
  result: number;    // Correct winner/draw only
  goal_diff: number; // Correct goal difference (but not exact)
}

export const DEFAULT_RULES: ScoringRules = {
  exact: 6,
  result: 3,
  goal_diff: 4,
};

// All valid match statuses
export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled' | 'void';

export const STATUS_CONFIG: Record<MatchStatus, { label: string; emoji: string; color: string }> = {
  scheduled: { label: 'Gepland', emoji: '🕐', color: 'outline' },
  live: { label: 'Live', emoji: '🔴', color: 'destructive' },
  finished: { label: 'Gespeeld', emoji: '✅', color: 'secondary' },
  postponed: { label: 'Uitgesteld', emoji: '⏸️', color: 'outline' },
  cancelled: { label: 'Afgelast', emoji: '❌', color: 'destructive' },
  void: { label: 'Ongeldig', emoji: '🚫', color: 'destructive' },
};

export function isPredictionAllowed(status: string): boolean {
  return status === 'scheduled';
}

export function isMatchCounted(status: string): boolean {
  return status === 'finished';
}

export function calculatePoints(
  homePred: number | null,
  awayPred: number | null,
  homeActual: number | null,
  awayActual: number | null,
  rules: ScoringRules = DEFAULT_RULES
): number {
  if (homePred == null || awayPred == null || homeActual == null || awayActual == null) {
    return 0;
  }

  // Exact score — highest priority, no stacking
  if (homePred === homeActual && awayPred === awayActual) {
    return rules.exact;
  }

  const predDiff = homePred - awayPred;
  const actualDiff = homeActual - awayActual;
  const predResult = Math.sign(predDiff);
  const actualResult = Math.sign(actualDiff);

  // Must have correct result (winner/draw)
  if (predResult !== actualResult) return 0;

  // Correct goal difference (but not exact)
  if (predDiff === actualDiff) {
    return rules.goal_diff;
  }

  // Only correct result
  return rules.result;
}

/**
 * Explain why points were awarded — for transparency
 */
export function explainPoints(
  homePred: number | null,
  awayPred: number | null,
  homeActual: number | null,
  awayActual: number | null,
  rules: ScoringRules = DEFAULT_RULES
): { points: number; reason: string } {
  const pts = calculatePoints(homePred, awayPred, homeActual, awayActual, rules);
  if (pts === rules.exact) return { points: pts, reason: 'Exacte score!' };
  if (pts === rules.goal_diff) return { points: pts, reason: 'Correct doelverschil' };
  if (pts === rules.result) return { points: pts, reason: 'Correct resultaat' };
  return { points: 0, reason: 'Fout' };
}
