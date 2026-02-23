import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Calculator, Target, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";

interface CatchUpCalculatorProps {
  myPoints: number;
  leaderPoints: number;
  leaderName: string;
  remainingMatches: number;
  exactPoints: number; // points for exact score
  resultPoints: number; // points for correct result
}

export function CatchUpCalculator({
  myPoints,
  leaderPoints,
  leaderName,
  remainingMatches,
  exactPoints,
  resultPoints,
}: CatchUpCalculatorProps) {
  const [expanded, setExpanded] = useState(false);
  const gap = leaderPoints - myPoints;

  const scenarios = useMemo(() => {
    if (gap <= 0) return null; // Already #1

    // How many exact scores needed (assuming leader scores 0 more)
    const exactNeeded = Math.ceil(gap / exactPoints);
    // Mix: some exact, some result
    const mixExact = Math.ceil(gap / (exactPoints + resultPoints)); // rough
    // Pure result predictions needed
    const resultNeeded = Math.ceil(gap / resultPoints);

    // More realistic: assume leader gets ~resultPoints per match average
    const realisticGapPerMatch = exactPoints - resultPoints; // net gain per exact vs leader getting result
    const realisticExactNeeded = realisticGapPerMatch > 0 ? Math.ceil(gap / realisticGapPerMatch) : Infinity;

    return {
      gap,
      exactNeeded: Math.min(exactNeeded, remainingMatches),
      resultNeeded: Math.min(resultNeeded, remainingMatches),
      realisticExactNeeded: Math.min(realisticExactNeeded, remainingMatches),
      possible: exactNeeded <= remainingMatches,
      realisticPossible: realisticExactNeeded <= remainingMatches,
      remainingMatches,
    };
  }, [gap, exactPoints, resultPoints, remainingMatches]);

  if (gap <= 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-glow-gold overflow-hidden">
          <div className="bg-gradient-to-r from-secondary to-warning h-1" />
          <CardContent className="p-4 text-center">
            <span className="text-2xl">👑</span>
            <p className="font-display font-bold text-sm mt-1">Jij bent de leider!</p>
            <p className="text-xs text-muted-foreground">Blijf zo doorgaan</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (!scenarios) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-0 shadow-elevation-2 overflow-hidden">
        <div className="gradient-primary h-1" />
        <CardContent className="p-0">
          {/* Header - always visible */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors"
          >
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shrink-0">
              <Calculator className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-sm">Wat heb je nodig voor #1?</p>
              <p className="text-xs text-muted-foreground truncate">
                {scenarios.gap} punten achter {leaderName}
              </p>
            </div>
            <div className="shrink-0 text-muted-foreground">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </button>

          {/* Expandable content */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-3">
                  {/* Gap visualization */}
                  <div className="bg-muted/50 rounded-xl p-3 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Jij</span>
                      <span className="text-muted-foreground">{leaderName}</span>
                    </div>
                    <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="absolute inset-y-0 left-0 gradient-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(5, (myPoints / Math.max(leaderPoints, 1)) * 100)}%` }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                      />
                    </div>
                    <div className="flex justify-between text-sm font-bold font-display">
                      <span className="text-primary">{myPoints} pt</span>
                      <span className="text-secondary">{leaderPoints} pt</span>
                    </div>
                  </div>

                  {/* Scenarios */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Scenario's ({scenarios.remainingMatches} wedstrijden over)
                    </p>

                    {/* Best case */}
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-success/5 border border-success/10">
                      <Target className="h-4 w-4 text-success shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-semibold">Best case</p>
                        <p className="text-[10px] text-muted-foreground">
                          {scenarios.exactNeeded} exacte scores nodig
                        </p>
                      </div>
                      <span className={cn(
                        "text-xs font-bold",
                        scenarios.possible ? "text-success" : "text-destructive"
                      )}>
                        {scenarios.possible ? "✅ Haalbaar" : "❌ Lastig"}
                      </span>
                    </div>

                    {/* Realistic */}
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                      <TrendingUp className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-semibold">Realistisch</p>
                        <p className="text-[10px] text-muted-foreground">
                          {scenarios.realisticExactNeeded === Infinity
                            ? "Leider moet fouten maken"
                            : `${scenarios.realisticExactNeeded} exacte scores als leider resultaat scoort`}
                        </p>
                      </div>
                      <span className={cn(
                        "text-xs font-bold",
                        scenarios.realisticPossible ? "text-primary" : "text-warning"
                      )}>
                        {scenarios.realisticPossible ? "💪 Mogelijk" : "⚡ Moeilijk"}
                      </span>
                    </div>

                    {/* Tip */}
                    <div className="p-2.5 rounded-lg bg-secondary/5 border border-secondary/10">
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        💡 <strong>Tip:</strong> Focus op exacte scores ({exactPoints} pt) in plaats van alleen
                        het resultaat ({resultPoints} pt). Dat is de snelste weg naar de top!
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
