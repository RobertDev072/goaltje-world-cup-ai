import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { formatNLDate, formatNLTime } from "@/lib/timezone";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

type Filter = "all" | "live" | "today" | "upcoming" | "finished";

export default function Matches() {
  const [filter, setFilter] = useState<Filter>("all");

  const { data: matches, isLoading } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
        .order("kickoff_utc", { ascending: true });
      return data || [];
    },
  });

  const filtered = matches?.filter((m: any) => {
    if (filter === "all") return true;
    if (filter === "live") return m.status === "live";
    if (filter === "finished") return m.status === "finished";
    if (filter === "upcoming") return m.status === "scheduled";
    if (filter === "today") {
      const today = new Date().toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam" });
      const matchDate = new Date(m.kickoff_utc).toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam" });
      return today === matchDate;
    }
    return true;
  });

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "Alle" },
    { key: "live", label: "🔴 Live" },
    { key: "today", label: "Vandaag" },
    { key: "upcoming", label: "Komend" },
    { key: "finished", label: "Gespeeld" },
  ];

  const lastUpdated = matches?.reduce((latest: string | null, m: any) => {
    if (!latest || (m.last_updated && m.last_updated > latest)) return m.last_updated;
    return latest;
  }, null);

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display">Wedstrijden</h1>
        {lastUpdated && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            🔄 {formatNLTime(lastUpdated)}
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              filter === f.key
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Match List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((match: any, i: number) => (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Link to={`/matches/${match.id}`}>
                <Card className="border-0 shadow-md hover:shadow-lg transition-all overflow-hidden">
                  {/* Match header bar */}
                  <div className="bg-primary px-4 py-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-primary-foreground/80">
                      {match.stage === "group" ? `Groep ${match.group}` : match.stage}
                    </span>
                    <div className="flex items-center gap-2">
                      {match.status === "live" && (
                        <Badge variant="destructive" className="text-[10px] live-pulse h-5">
                          🔴 LIVE
                        </Badge>
                      )}
                      {match.status === "finished" && (
                        <Badge className="text-[10px] bg-white/20 text-primary-foreground h-5 hover:bg-white/20">Gespeeld</Badge>
                      )}
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      {/* Home team */}
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <span className="text-2xl shrink-0">{match.home_team?.flag_url || "🏳️"}</span>
                        <span className="font-semibold text-sm truncate">{match.home_team?.short_name || match.home_team?.name || "TBD"}</span>
                      </div>

                      {/* Score / Time */}
                      <div className="px-3 text-center shrink-0">
                        {match.home_score != null && match.away_score != null ? (
                          <span className="text-2xl font-bold font-display">
                            {match.home_score} - {match.away_score}
                          </span>
                        ) : (
                          <div className="flex flex-col items-center">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground mb-0.5" />
                            <span className="text-sm font-bold text-primary">{formatNLTime(match.kickoff_utc)}</span>
                          </div>
                        )}
                      </div>

                      {/* Away team */}
                      <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
                        <span className="font-semibold text-sm truncate text-right">{match.away_team?.short_name || match.away_team?.name || "TBD"}</span>
                        <span className="text-2xl shrink-0">{match.away_team?.flag_url || "🏳️"}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-muted-foreground">{formatNLDate(match.kickoff_utc)}</span>
                      {match.venue && (
                        <span className="text-[10px] text-muted-foreground">📍 {match.venue}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-md">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Geen wedstrijden gevonden</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
