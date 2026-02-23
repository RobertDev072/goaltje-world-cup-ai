import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface BadgeDefinition {
  id: string;
  icon: string;
  name: string;
  description: string;
  earned: boolean;
  progress?: string;
}

interface PredictionData {
  home_pred: number | null;
  away_pred: number | null;
  points_awarded: number | null;
  match_id: string;
  matches?: {
    home_score: number | null;
    away_score: number | null;
    status: string;
    stage: string;
  };
}

export function calculateBadges(predictions: PredictionData[]): BadgeDefinition[] {
  const finished = predictions.filter(
    (p) => p.matches?.status === "finished" && p.points_awarded != null
  );

  if (finished.length === 0) {
    return getDefaultBadges();
  }

  // Streak calculation
  let maxStreak = 0;
  let currentStreak = 0;
  finished.forEach((p) => {
    if ((p.points_awarded || 0) > 0) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  });

  // Exact scores
  const exactScores = finished.filter(
    (p) =>
      p.home_pred === p.matches?.home_score &&
      p.away_pred === p.matches?.away_score
  ).length;

  // Biggest comeback (most points in a single day - simplified: most points overall vs worst start)
  const totalPoints = finished.reduce((s, p) => s + (p.points_awarded || 0), 0);

  // Underdog detection: predicted the underdog win correctly (away team wins with lower expected)
  const underdogWins = finished.filter((p) => {
    const actual = p.matches;
    if (!actual || actual.home_score == null || actual.away_score == null) return false;
    // If away won and user predicted away win
    const awayWon = actual.away_score > actual.home_score;
    const userPredAwayWin = (p.away_pred || 0) > (p.home_pred || 0);
    return awayWon && userPredAwayWin && (p.points_awarded || 0) > 0;
  }).length;

  // Group vs knockout performance
  const groupPreds = finished.filter((p) => p.matches?.stage === "group");
  const koPreds = finished.filter((p) => p.matches?.stage !== "group");
  const groupAccuracy = groupPreds.length > 0
    ? groupPreds.filter((p) => (p.points_awarded || 0) > 0).length / groupPreds.length
    : 0;
  const koAccuracy = koPreds.length > 0
    ? koPreds.filter((p) => (p.points_awarded || 0) > 0).length / koPreds.length
    : 0;

  // Average goals predicted
  const avgGoals = finished.reduce((s, p) => s + (p.home_pred || 0) + (p.away_pred || 0), 0) / Math.max(finished.length, 1);

  return [
    {
      id: "streak-master",
      icon: "🔥",
      name: "Streak Master",
      description: "3 voorspellingen op rij goed",
      earned: maxStreak >= 3,
      progress: `${maxStreak}/3 op rij`,
    },
    {
      id: "exact-king",
      icon: "🎯",
      name: "Exact Score King",
      description: "3 exacte scores voorspeld",
      earned: exactScores >= 3,
      progress: `${exactScores}/3 exact`,
    },
    {
      id: "comeback-king",
      icon: "🚀",
      name: "Comeback King",
      description: "10+ punten gescoord na slechte start",
      earned: totalPoints >= 10 && finished.slice(0, 3).every((p) => (p.points_awarded || 0) === 0),
      progress: `${totalPoints} totaal punten`,
    },
    {
      id: "underdog-detector",
      icon: "🧠",
      name: "Underdog Detector",
      description: "2 uitoverwinningen correct voorspeld",
      earned: underdogWins >= 2,
      progress: `${underdogWins}/2 underdogs`,
    },
    {
      id: "sharpshooter",
      icon: "🏆",
      name: "Sharpshooter",
      description: "60%+ voorspellingen goed",
      earned: finished.length >= 5 && finished.filter((p) => (p.points_awarded || 0) > 0).length / finished.length >= 0.6,
      progress: `${Math.round(finished.filter((p) => (p.points_awarded || 0) > 0).length / Math.max(finished.length, 1) * 100)}% accuraat`,
    },
  ];
}

function getDefaultBadges(): BadgeDefinition[] {
  return [
    { id: "streak-master", icon: "🔥", name: "Streak Master", description: "3 voorspellingen op rij goed", earned: false, progress: "0/3 op rij" },
    { id: "exact-king", icon: "🎯", name: "Exact Score King", description: "3 exacte scores voorspeld", earned: false, progress: "0/3 exact" },
    { id: "comeback-king", icon: "🚀", name: "Comeback King", description: "10+ punten na slechte start", earned: false },
    { id: "underdog-detector", icon: "🧠", name: "Underdog Detector", description: "2 uitoverwinningen correct", earned: false, progress: "0/2 underdogs" },
    { id: "sharpshooter", icon: "🏆", name: "Sharpshooter", description: "60%+ voorspellingen goed", earned: false, progress: "0% accuraat" },
  ];
}

interface BadgesGridProps {
  badges: BadgeDefinition[];
}

export function BadgesGrid({ badges }: BadgesGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {badges.map((badge, i) => (
        <motion.div
          key={badge.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.06 }}
        >
          <Card className={cn(
            "border-0 transition-all h-full",
            badge.earned
              ? "shadow-glow-gold ring-1 ring-secondary/30"
              : "shadow-elevation-1 opacity-50 grayscale"
          )}>
            <CardContent className="p-3 text-center space-y-1">
              <motion.span
                className="text-2xl block"
                animate={badge.earned ? { scale: [1, 1.2, 1] } : {}}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.3 }}
              >
                {badge.icon}
              </motion.span>
              <p className="font-display font-semibold text-xs">{badge.name}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{badge.description}</p>
              {badge.progress && (
                <p className={cn(
                  "text-[10px] font-medium",
                  badge.earned ? "text-success" : "text-muted-foreground"
                )}>
                  {badge.progress}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
