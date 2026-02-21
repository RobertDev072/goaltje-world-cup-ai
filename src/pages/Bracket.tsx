import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

const STAGES = [
  { key: "round_of_32", label: "Ronde van 32" },
  { key: "round_of_16", label: "Achtste finales" },
  { key: "quarter_final", label: "Kwartfinales" },
  { key: "semi_final", label: "Halve finales" },
  { key: "final", label: "Finale" },
];

export default function Bracket() {
  const { data: knockoutMatches, isLoading } = useQuery({
    queryKey: ["bracket-matches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
        .neq("stage", "group")
        .order("kickoff_utc", { ascending: true });
      return data || [];
    },
  });

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
      <h1 className="text-2xl font-bold font-display">Bracket 🏆</h1>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : knockoutMatches && knockoutMatches.length > 0 ? (
        STAGES.map((stage) => {
          const stageMatches = knockoutMatches.filter((m: any) => m.stage === stage.key);
          if (stageMatches.length === 0) return null;
          return (
            <div key={stage.key}>
              <h2 className="font-display font-semibold text-lg mb-3 text-primary">{stage.label}</h2>
              <div className="space-y-2">
                {stageMatches.map((match: any, i: number) => (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="border-0 shadow-md">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{match.home_team?.flag_url || "🏳️"}</span>
                              <span className="text-sm font-medium">{match.home_team?.name || "TBD"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{match.away_team?.flag_url || "🏳️"}</span>
                              <span className="text-sm font-medium">{match.away_team?.name || "TBD"}</span>
                            </div>
                          </div>
                          {match.status !== "scheduled" && (
                            <div className="text-right">
                              <p className="text-lg font-bold">{match.home_score ?? 0}</p>
                              <p className="text-lg font-bold">{match.away_score ?? 0}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })
      ) : (
        <Card className="border-0 shadow-md">
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-4xl">🏟️</p>
            <p className="text-muted-foreground">
              De knock-out fase begint nadat de groepsfase is afgelopen.
            </p>
            <p className="text-sm text-muted-foreground">
              Teams worden automatisch ingevuld op basis van de groepsstanden.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
