import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Swords, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface RivalBannerProps {
  myName: string;
  myPoints: number;
  rivalName: string;
  rivalPoints: number;
}

export function RivalBanner({ myName, myPoints, rivalName, rivalPoints }: RivalBannerProps) {
  const diff = myPoints - rivalPoints;
  const isAhead = diff > 0;
  const isTied = diff === 0;

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
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Swords className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rivaal Modus</span>
          </div>
          <div className="flex items-center justify-between">
            {/* Me */}
            <div className="text-center flex-1">
              <p className="text-xs text-muted-foreground mb-1">Jij</p>
              <p className="text-2xl font-bold font-display text-primary">{myPoints}</p>
              <p className="text-xs font-medium truncate">{myName}</p>
            </div>

            {/* VS indicator */}
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

            {/* Rival */}
            <div className="text-center flex-1">
              <p className="text-xs text-muted-foreground mb-1">Rivaal</p>
              <p className="text-2xl font-bold font-display text-destructive">{rivalPoints}</p>
              <p className="text-xs font-medium truncate">{rivalName}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
