import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { staleTimes, normalizeForm } from "@/lib/queryKeys";

interface Props {
  homeTeamName: string;
  awayTeamName: string;
}

export default function MatchStatsSection({ homeTeamName, awayTeamName }: Props) {
  const { data: matchStats, isLoading } = useQuery({
    queryKey: ["match-stats", homeTeamName, awayTeamName],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("match-stats", {
        body: { homeTeamName, awayTeamName },
      });
      if (error) throw error;
      return data;
    },
    staleTime: staleTimes.stats,
    retry: 1,
  });

  if (isLoading) return <Skeleton className="h-32 rounded-xl" />;
  if (!matchStats) return null;

  const homeForm = normalizeForm(matchStats.homeForm);
  const awayForm = normalizeForm(matchStats.awayForm);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-0 shadow-lg">
        <CardContent className="p-5">
          <h3 className="font-display font-semibold text-base mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Statistieken & H2H
          </h3>

          {matchStats.h2h && matchStats.h2h.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Laatste onderlinge wedstrijden</p>
              <div className="space-y-1">
                {matchStats.h2h.slice(0, 5).map((h: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-muted/50 rounded-lg px-3 py-1.5">
                    <span className="truncate flex-1">{h.home} vs {h.away}</span>
                    <span className="font-bold font-display">{h.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(homeForm.length > 0 || awayForm.length > 0) && (
            <div className="grid grid-cols-2 gap-3">
              {homeForm.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{homeTeamName} vorm</p>
                  <div className="flex gap-0.5">
                    {homeForm.map((r, i) => (
                      <span key={i} className={`w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center ${
                        r === "W" ? "bg-emerald-500/20 text-emerald-700" :
                        r === "L" ? "bg-red-500/20 text-red-700" :
                        "bg-amber-500/20 text-amber-700"
                      }`}>{r}</span>
                    ))}
                  </div>
                </div>
              )}
              {awayForm.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{awayTeamName} vorm</p>
                  <div className="flex gap-0.5">
                    {awayForm.map((r, i) => (
                      <span key={i} className={`w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center ${
                        r === "W" ? "bg-emerald-500/20 text-emerald-700" :
                        r === "L" ? "bg-red-500/20 text-red-700" :
                        "bg-amber-500/20 text-amber-700"
                      }`}>{r}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
