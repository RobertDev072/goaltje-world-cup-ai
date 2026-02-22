// Default scoring rules for Goaltje
export interface ScoringRules {
  exact: number;     // Exact score correct
  result: number;    // Correct winner/draw
  goal_diff: number; // Correct goal difference (bonus, default off)
}

export const DEFAULT_RULES: ScoringRules = {
  exact: 3,
  result: 1,
  goal_diff: 0, // disabled by default
};

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

  // Exact score
  if (homePred === homeActual && awayPred === awayActual) {
    return rules.exact;
  }

  const predDiff = homePred - awayPred;
  const actualDiff = homeActual - awayActual;

  // Correct result (winner or draw)
  const predResult = Math.sign(predDiff);
  const actualResult = Math.sign(actualDiff);

  if (predResult === actualResult) {
    let points = rules.result;
    // Bonus: correct goal difference
    if (rules.goal_diff > 0 && predDiff === actualDiff) {
      points += rules.goal_diff;
    }
    return points;
  }

  return 0;
}
