import { isPredictionAllowed } from "@/lib/scoring";
import { isToday } from "@/lib/timezone";

export interface MatchForPredictionStatus {
  id: string;
  kickoff_utc: string;
  prediction_deadline_utc?: string | null;
  status: string;
  home_team?: { short_name?: string | null; name?: string | null } | null;
  away_team?: { short_name?: string | null; name?: string | null } | null;
}

export interface PredictionForStatus {
  home_pred: number | null;
  away_pred: number | null;
  points_awarded?: number | null;
}

export type PredictionState =
  | "open"
  | "filled"
  | "locked"
  | "missed"
  | "scored"
  | "cancelled";

export function hasSavedPrediction(prediction?: PredictionForStatus | null): boolean {
  return prediction?.home_pred != null && prediction?.away_pred != null;
}

/**
 * Get the effective deadline for a match (1 hour before kickoff, or custom deadline)
 */
export function getDeadline(match: MatchForPredictionStatus): Date {
  if (match.prediction_deadline_utc) {
    return new Date(match.prediction_deadline_utc);
  }
  const deadline = new Date(match.kickoff_utc);
  deadline.setHours(deadline.getHours() - 1);
  return deadline;
}

/**
 * Check if we're in the "deadline approaching" window (within 24h of deadline)
 */
export function isDeadlineApproaching(match: MatchForPredictionStatus): boolean {
  const deadline = getDeadline(match);
  const now = new Date();
  const hoursUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntil > 0 && hoursUntil <= 24;
}

export function getPredictionState(
  match: MatchForPredictionStatus,
  prediction?: PredictionForStatus | null,
): PredictionState {
  if (match.status === "cancelled" || match.status === "void") {
    return "cancelled";
  }

  const saved = hasSavedPrediction(prediction);
  const isFinished = match.status === "finished";

  // If match is finished and user had a prediction, show score
  if (isFinished && saved) {
    return "scored";
  }

  const deadlineUtc = match.prediction_deadline_utc || undefined;
  const predictionOpen = isPredictionAllowed(match.status, deadlineUtc || match.kickoff_utc);

  // Also check 1-hour-before-kickoff deadline
  const deadline = getDeadline(match);
  const now = new Date();
  const isLocked = now >= deadline || !predictionOpen;

  if (!isLocked && !saved) return "open";
  if (!isLocked && saved) return "filled";
  if (isLocked && saved) return "locked";
  return "missed";
}

export function isMissingToday(
  match: MatchForPredictionStatus,
  prediction?: PredictionForStatus | null,
): boolean {
  return isToday(match.kickoff_utc) && getPredictionState(match, prediction) === "open";
}

/**
 * A match counts as "recently missed" for reminder purposes when it is in the
 * `missed` state AND its kickoff is recent (within `withinHours`) or still in
 * the future (deadline passed but not yet played).
 *
 * This keeps the reminder banner timely: without this window an old missed
 * match would stay flagged as "missed" for the rest of the tournament, so the
 * "Je hebt een wedstrijd zonder voorspelling gemist" banner would never
 * disappear ("blijft hangen").
 */
export function isRecentlyMissed(
  match: MatchForPredictionStatus,
  prediction?: PredictionForStatus | null,
  withinHours = 48,
): boolean {
  if (getPredictionState(match, prediction) !== "missed") return false;
  const hoursSinceKickoff =
    (new Date().getTime() - new Date(match.kickoff_utc).getTime()) / (1000 * 60 * 60);
  return hoursSinceKickoff <= withinHours;
}

export function getShortMatchLabel(match: MatchForPredictionStatus): string {
  const home = match.home_team?.short_name || match.home_team?.name || "Home";
  const away = match.away_team?.short_name || match.away_team?.name || "Away";
  return `${home} - ${away}`;
}
