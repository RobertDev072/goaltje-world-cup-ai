import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Radio } from "lucide-react";

interface LiveMatchBannerProps {
  matches: any[];
}

export function LiveMatchBanner({ matches }: LiveMatchBannerProps) {
  const liveMatches = useMemo(
    () => matches.filter((m) => m.status === "live"),
    [matches]
  );

  if (liveMatches.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      <div className="flex items-center gap-2">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Radio className="h-4 w-4 text-destructive" />
        </motion.div>
        <span className="text-xs font-bold uppercase tracking-wider text-destructive">
          Live nu
        </span>
      </div>

      {liveMatches.map((match) => (
        <Card
          key={match.id}
          className={cn(
            "border-0 overflow-hidden shadow-glow-primary",
            "ring-1 ring-primary/20"
          )}
        >
          <motion.div
            className="gradient-warm p-[2px]"
            animate={{ opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xl shrink-0">{match.home_team?.flag_url || "🏳️"}</span>
                <span className="font-semibold text-xs truncate">
                  {match.home_team?.short_name || "TBD"}
                </span>
              </div>
              <motion.div
                className="px-3 text-center shrink-0"
                key={`${match.home_score}-${match.away_score}`}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500 }}
              >
                <span className="text-xl font-bold font-display">
                  {match.home_score ?? 0} - {match.away_score ?? 0}
                </span>
              </motion.div>
              <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                <span className="font-semibold text-xs truncate text-right">
                  {match.away_team?.short_name || "TBD"}
                </span>
                <span className="text-xl shrink-0">{match.away_team?.flag_url || "🏳️"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </motion.div>
  );
}
