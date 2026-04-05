import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, Clock } from "lucide-react";
import { getShortMatchLabel, type MatchForPredictionStatus } from "@/lib/predictionStatus";

interface PredictionReminderBannerProps {
  missingTodayMatches: MatchForPredictionStatus[];
  missedMatches: MatchForPredictionStatus[];
}

export function PredictionReminderBanner({
  missingTodayMatches,
  missedMatches,
}: PredictionReminderBannerProps) {
  if (missingTodayMatches.length === 0 && missedMatches.length === 0) return null;

  const firstMissing = missingTodayMatches[0];
  const firstMissed = missedMatches[0];

  return (
    <Card className="border-0 shadow-elevation-2 overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-amber-400 via-primary to-destructive" />
      <CardContent className="p-4 space-y-3">
        {missingTodayMatches.length > 0 ? (
          <>
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-sm">
                  Je mist nog {missingTodayMatches.length} voorspelling{missingTodayMatches.length > 1 ? "en" : ""} voor vandaag
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Begin met {getShortMatchLabel(firstMissing)}
                  {missingTodayMatches.length > 1 ? ` en nog ${missingTodayMatches.length - 1}` : ""}.
                </p>
                {missedMatches.length > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Eerder gemist: {missedMatches.length} wedstrijd{missedMatches.length > 1 ? "en" : ""} staat nu als niet ingevuld.
                  </p>
                )}
              </div>
            </div>
            <Button asChild className="w-full gradient-primary text-primary-foreground">
              <Link to="/app/matches">
                Nu invullen <ArrowRight className="h-4 w-4 ml-1.5" />
              </Link>
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-sm">Je hebt een wedstrijd zonder voorspelling gemist</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {getShortMatchLabel(firstMissed)} staat nu als niet ingevuld en levert 0 punten op.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link to="/app/matches">
                Bekijk wedstrijden <ArrowRight className="h-4 w-4 ml-1.5" />
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
