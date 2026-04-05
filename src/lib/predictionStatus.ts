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
}

export type PredictionState =
  | "saved"
  | "open_missing"
  | "missed"
  | "locked_with_prediction"
  | "cancelled";

export function hasSavedPrediction(prediction?: PredictionForStatus | null): boolean {
  return prediction?.home_pred != null && prediction?.away_pred != null;
}

export function getPredictionState(
  match: MatchForPredictionStatus,
  prediction?: PredictionForStatus | null,
): PredictionState {
  if (match.status === "cancelled" || match.status === "void") {
    return "cancelled";
  }

  const saved = hasSavedPrediction(prediction);
  const deadlineUtc = match.prediction_deadline_utc || match.kickoff_utc;
  const predictionOpen = isPredictionAllowed(match.status, deadlineUtc);

  if (saved) {
    return predictionOpen ? "saved" : "locked_with_prediction";
  }

  return predictionOpen ? "open_missing" : "missed";
}

export function isMissingToday(
  match: MatchForPredictionStatus,
  prediction?: PredictionForStatus | null,
): boolean {
  return isToday(match.kickoff_utc) && getPredictionState(match, prediction) === "open_missing";
}

export function getShortMatchLabel(match: MatchForPredictionStatus): string {
  const home = match.home_team?.short_name || match.home_team?.name || "Home";
  const away = match.away_team?.short_name || match.away_team?.name || "Away";
  return `${home} - ${away}`;
}
