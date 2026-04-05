import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Check, X, TrendingUp, TrendingDown, Flame, MapPin, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { formatNLDate, formatNLTime } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import { STATUS_CONFIG, type MatchStatus, isPredictionAllowed } from "@/lib/scoring";
import { CountdownTimer } from "@/components/CountdownTimer";
import { getPredictionState } from "@/lib/predictionStatus";

interface MatchCardProps {
  match: any;
  prediction?: { home_pred: number | null; away_pred: number | null; points_awarded?: number | null } | null;
  index?: number;
  rankingImpact?: number | null;
  streak?: number | null;
  compact?: boolean;
}

export function MatchCard({ match, prediction, index = 0, rankingImpact, streak, compact = false }: MatchCardProps) {
  const status = (match.status || "scheduled") as MatchStatus;
  const statusInfo = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;
  const isFinished = status === "finished";
  const isLive = status === "live";
  const isCancelled = status === "cancelled" || status === "void";
  const isPostponed = status === "postponed";
  const hasScore = match.home_score != null && match.away_score != null;
  const points = prediction?.points_awarded ?? null;
  const hasPrediction = prediction && prediction.home_pred != null;
  const canPredict = isPredictionAllowed(status, match.prediction_deadline_utc || match.kickoff_utc);
  const gotPoints = points != null && points > 0;
  const predictionState = getPredictionState(match, prediction);
  const isOpenMissing = predictionState === "open_missing";
  const isMissed = predictionState === "missed";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
    >
      <Link to={`/app/matches/${match.id}`}>
        <Card
          className={cn(
            "border-0 overflow-hidden transition-all duration-300 group",
            isLive && "shadow-glow-primary ring-1 ring-primary/20",
            isFinished && gotPoints && "shadow-glow-success",
            isFinished && !gotPoints && hasPrediction && "shadow-elevation-2",
            !isFinished && !isLive && "shadow-elevation-2 hover:shadow-elevation-3",
          )}
        >
          <div
            className={cn(
              "px-4 py-1.5 flex items-center justify-between",
              isLive ? "gradient-warm" : "gradient-navy",
            )}
          >
            <span className="text-[10px] font-medium text-white/80">
              {match.stage === "group"
                ? `Groep ${match.group}`
                : match.stage === "round_of_32"
                  ? "Laatste 32"
                  : match.stage === "round_of_16"
                    ? "Laatste 16"
                    : match.stage === "quarter_final"
                      ? "Kwartfinale"
                      : match.stage === "semi_final"
                        ? "Halve finale"
                        : match.stage === "third_place"
                          ? "3e/4e plaats"
                          : match.stage === "final"
                            ? "Finale"
                            : match.stage}
              {match.external_id ? ` (${match.external_id})` : ""}
            </span>
            <div className="flex items-center gap-2">
              {isLive && (
                <Badge variant="destructive" className="text-[10px] live-pulse h-5 bg-white/20 hover:bg-white/20 border-0">
                  LIVE
                </Badge>
              )}
              {isFinished && <span className="text-[10px] text-white/60">Gespeeld</span>}
              {(isCancelled || isPostponed) && (
                <Badge variant="outline" className="text-[10px] h-5 bg-white/10 hover:bg-white/10 border-white/20 text-white/80">
                  {statusInfo.label}
                </Badge>
              )}
              {canPredict && (
                <span className="text-[10px] text-white/80 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {formatNLTime(match.kickoff_utc)}
                </span>
              )}
            </div>
          </div>

          <CardContent className={cn("p-4", compact && "p-3")}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <span className="text-2xl shrink-0">{match.home_team?.flag_url || "?"}</span>
                <span className="font-semibold text-sm truncate">
                  {match.home_team?.short_name || match.home_team?.name || "TBD"}
                </span>
              </div>

              <div className="px-3 text-center shrink-0">
                {hasScore ? (
                  <motion.span
                    className="text-2xl font-bold font-display"
                    initial={isFinished ? { scale: 0.8, opacity: 0 } : false}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    {match.home_score} - {match.away_score}
                  </motion.span>
                ) : (
                  <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                    {formatNLDate(match.kickoff_utc)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
                <span className="font-semibold text-sm truncate text-right">
                  {match.away_team?.short_name || match.away_team?.name || "TBD"}
                </span>
                <span className="text-2xl shrink-0">{match.away_team?.flag_url || "?"}</span>
              </div>
            </div>

            {isFinished && hasPrediction && (
              <motion.div
                className="mt-3 flex flex-wrap items-center gap-2"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div
                  className={cn(
                    "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium",
                    gotPoints ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
                  )}
                >
                  {gotPoints ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  {prediction!.home_pred}-{prediction!.away_pred}
                </div>

                {points != null && (
                  <motion.div
                    className={cn(
                      "flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full",
                      gotPoints ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                    )}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.25, type: "spring", stiffness: 400 }}
                  >
                    {gotPoints ? `+${points}` : "0"} pt
                  </motion.div>
                )}

                {rankingImpact != null && rankingImpact !== 0 && (
                  <motion.div
                    className={cn(
                      "flex items-center gap-0.5 text-xs font-medium px-2 py-1 rounded-full",
                      rankingImpact > 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
                    )}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: "spring" }}
                  >
                    {rankingImpact > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {rankingImpact > 0 ? `+${rankingImpact}` : rankingImpact}
                  </motion.div>
                )}

                {streak != null && streak >= 2 && (
                  <motion.div
                    className="flex items-center gap-0.5 text-xs font-medium px-2 py-1 rounded-full bg-secondary/15 text-secondary-foreground"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.35, type: "spring" }}
                  >
                    <Flame className="h-3 w-3 text-warning" />
                    {streak} op rij
                  </motion.div>
                )}
              </motion.div>
            )}

            {!isFinished && !isCancelled && hasPrediction && (
              <div className="mt-2 flex items-center justify-center gap-2 text-xs">
                <Check className="h-3.5 w-3.5 text-primary" />
                <span className="text-muted-foreground">Jouw voorspelling:</span>
                <span className="font-bold text-primary">{prediction!.home_pred} - {prediction!.away_pred}</span>
              </div>
            )}

            {isOpenMissing && (
              <div className="mt-2 flex items-center justify-center gap-2 text-xs text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="font-medium">Nog niet ingevuld</span>
              </div>
            )}

            {isMissed && (
              <div className="mt-2 flex items-center justify-center gap-2 text-xs text-destructive">
                <X className="h-3.5 w-3.5" />
                <span className="font-medium">Niet ingevuld</span>
              </div>
            )}

            {canPredict && (
              <div className="mt-2 flex justify-center">
                <CountdownTimer kickoffUtc={match.prediction_deadline_utc || match.kickoff_utc} compact />
              </div>
            )}

            {isOpenMissing && (
              <p className="text-[10px] text-muted-foreground text-center mt-1 group-hover:text-primary transition-colors">
                Voorspelling invullen
              </p>
            )}

            {isMissed && (
              <p className="text-[10px] text-muted-foreground text-center mt-1">
                Geen voorspelling opgeslagen voor deze wedstrijd
              </p>
            )}

            {isCancelled && (
              <p className="text-[10px] text-destructive/60 text-center mt-2">
                {statusInfo.label} - telt niet mee
              </p>
            )}

            {isPostponed && canPredict && (
              <p className="text-[10px] text-warning text-center mt-2">
                Uitgesteld - voorspellingen weer open
              </p>
            )}

            {match.venue && !compact && (
              <p className="text-[10px] text-muted-foreground text-center mt-1.5 flex items-center justify-center gap-1">
                <MapPin className="h-3 w-3" /> {match.venue}
              </p>
            )}
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
