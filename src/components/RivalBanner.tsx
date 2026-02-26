import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Swords, TrendingUp, TrendingDown, Minus, Trophy, Flame, Target } from "lucide-react";

interface RivalBannerProps {
  myName: string;
  myPoints: number;
  rivalName: string;
  rivalPoints: number;
  // New: match-by-match duel data
  duelMatches?: { matchId: string; myPoints: number; rivalPoints: number; matchLabel: string }[];
}

export function RivalBanner({ myName, myPoints, rivalName, rivalPoints, duelMatches }: RivalBannerProps) {
  const diff = myPoints - rivalPoints;
  const isAhead = diff > 0;
  const isTied = diff === 0;

  // Best-of-7 style duel tracking
  const duelStats = useMemo(() => {
    if (!duelMatches || duelMatches.length === 0) return null;

    let myWins = 0;
    let rivalWins = 0;
    let draws = 0;
    let myStreak = 0;
    let currentStreak = 0;

    duelMatches.forEach((d) => {
      if (d.myPoints > d.rivalPoints) {
        myWins++;
        currentStreak = currentStreak > 0 ? currentStreak + 1 : 1;
      } else if (d.rivalPoints > d.myPoints) {
        rivalWins++;
        currentStreak = currentStreak < 0 ? currentStreak - 1 : -1;
      } else {
        draws++;
        currentStreak = 0;
      }
    });
    myStreak = currentStreak;

    // Best-of-7: first to 4 wins
    const bestOf7Target = 4;
    const seriesOver = myWins >= bestOf7Target || rivalWins >= bestOf7Target;

    return { myWins, rivalWins, draws, myStreak, seriesOver, bestOf7Target, total: duelMatches.length };
  }, [duelMatches]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Card className={cn(
        "border-0 overflow-hidden",
        isAhead ? "shadow-glow-success" : isTied ? "shadow-elevation-2" : "shadow-elevation-2 ring-1 ring-destructive/20"
      )}>
        <div className={cn(
          "p-[1px]",
          isAhead ? "gradient-success" : isTied ? "gradient-primary" : "bg-destructive"
        )} />
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Swords className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rivaal Duel</span>
            </div>
            {duelStats && (
              <Badge variant="outline" className="text-[9px] gap-1">
                <Target className="h-2.5 w-2.5" />
                Best of 7
              </Badge>
            )}
          </div>

          {/* Points comparison */}
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-xs text-muted-foreground mb-1">Jij</p>
              <p className="text-2xl font-bold font-display text-primary">{myPoints}</p>
              <p className="text-xs font-medium truncate">{myName}</p>
            </div>

            <div className="px-4 text-center">
              <motion.div
                className={cn(
                  "text-sm font-bold rounded-full px-3 py-1",
                  isAhead ? "bg-success/10 text-success" : isTied ? "bg-muted text-muted-foreground" : "bg-destructive/10 text-destructive"
                )}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
              >
                {isTied ? (
                  <span className="flex items-center gap-1"><Minus className="h-3 w-3" /> Gelijk</span>
                ) : isAhead ? (
                  <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> +{diff}</span>
                ) : (
                  <span className="flex items-center gap-1"><TrendingDown className="h-3 w-3" /> {diff}</span>
                )}
              </motion.div>
            </div>

            <div className="text-center flex-1">
              <p className="text-xs text-muted-foreground mb-1">Rivaal</p>
              <p className="text-2xl font-bold font-display text-destructive">{rivalPoints}</p>
              <p className="text-xs font-medium truncate">{rivalName}</p>
            </div>
          </div>

          {/* Best-of-7 Duel Tracker */}
          {duelStats && (
            <div className="space-y-2">
              {/* Win dots */}
              <div className="flex items-center justify-center gap-3">
                {/* My wins */}
                <div className="flex gap-1">
                  {Array.from({ length: duelStats.bestOf7Target }).map((_, i) => (
                    <motion.div
                      key={`my-${i}`}
                      className={cn(
                        "h-3 w-3 rounded-full",
                        i < duelStats.myWins ? "bg-primary" : "bg-muted"
                      )}
                      initial={i < duelStats.myWins ? { scale: 0 } : {}}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.08, type: "spring" }}
                    />
                  ))}
                </div>

                <span className="text-xs font-bold text-muted-foreground">
                  {duelStats.myWins} - {duelStats.rivalWins}
                </span>

                {/* Rival wins */}
                <div className="flex gap-1">
                  {Array.from({ length: duelStats.bestOf7Target }).map((_, i) => (
                    <motion.div
                      key={`rival-${i}`}
                      className={cn(
                        "h-3 w-3 rounded-full",
                        i < duelStats.rivalWins ? "bg-destructive" : "bg-muted"
                      )}
                      initial={i < duelStats.rivalWins ? { scale: 0 } : {}}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.08, type: "spring" }}
                    />
                  ))}
                </div>
              </div>

              {/* Stats row */}
              <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
                <span>{duelStats.total} wedstrijden gespeeld</span>
                {duelStats.draws > 0 && <span>{duelStats.draws}× gelijk</span>}
                {duelStats.myStreak > 1 && (
                  <span className="flex items-center gap-0.5 text-primary font-medium">
                    <Flame className="h-2.5 w-2.5" /> {duelStats.myStreak} op rij!
                  </span>
                )}
                {duelStats.myStreak < -1 && (
                  <span className="flex items-center gap-0.5 text-destructive font-medium">
                    <TrendingDown className="h-2.5 w-2.5" /> {Math.abs(duelStats.myStreak)} verloren
                  </span>
                )}
              </div>

              {/* Series winner */}
              {duelStats.seriesOver && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center"
                >
                  <Badge className={cn(
                    "gap-1",
                    duelStats.myWins >= duelStats.bestOf7Target
                      ? "bg-primary/10 text-primary hover:bg-primary/10"
                      : "bg-destructive/10 text-destructive hover:bg-destructive/10"
                  )}>
                    <Trophy className="h-3 w-3" />
                    {duelStats.myWins >= duelStats.bestOf7Target
                      ? "Jij wint de serie! 🎉"
                      : `${rivalName} wint de serie`}
                  </Badge>
                </motion.div>
              )}
            </div>
          )}

          {/* Recent match results (last 5) */}
          {duelMatches && duelMatches.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-medium">Laatste duels:</p>
              <div className="flex gap-1">
                {duelMatches.slice(-7).map((d, i) => {
                  const won = d.myPoints > d.rivalPoints;
                  const lost = d.rivalPoints > d.myPoints;
                  return (
                    <motion.div
                      key={d.matchId}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.4 + i * 0.05 }}
                      className={cn(
                        "flex-1 h-6 rounded flex items-center justify-center text-[9px] font-bold",
                        won ? "bg-primary/10 text-primary" : lost ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                      )}
                      title={d.matchLabel}
                    >
                      {won ? "W" : lost ? "V" : "G"}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
