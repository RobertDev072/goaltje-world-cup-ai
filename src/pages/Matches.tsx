import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { formatNLDate, formatNLTime } from "@/lib/timezone";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
      <h1 className="text-2xl font-bold font-display">Wedstrijden</h1>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              filter === f.key
                ? "gradient-primary text-primary-foreground shadow-md"
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
                <Card className="border-0 shadow-md hover:shadow-lg transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">
                        {match.stage === "group" ? `Groep ${match.group}` : match.stage}
                      </span>
                      {match.status === "live" && (
                        <Badge variant="destructive" className="text-[10px] live-pulse">
                          🔴 LIVE
                        </Badge>
                      )}
                      {match.status === "finished" && (
                        <Badge variant="secondary" className="text-[10px]">Gespeeld</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{match.home_team?.flag_url || "🏳️"}</span>
                          <span className="font-medium text-sm">{match.home_team?.name || "TBD"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{match.away_team?.flag_url || "🏳️"}</span>
                          <span className="font-medium text-sm">{match.away_team?.name || "TBD"}</span>
                        </div>
                      </div>
                      {match.status === "finished" || match.status === "live" ? (
                        <div className="text-right">
                          <div className="text-2xl font-bold font-display">
                            {match.home_score ?? 0}
                          </div>
                          <div className="text-2xl font-bold font-display">
                            {match.away_score ?? 0}
                          </div>
                        </div>
                      ) : (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">{formatNLDate(match.kickoff_utc)}</p>
                          <p className="text-lg font-bold text-primary">{formatNLTime(match.kickoff_utc)}</p>
                        </div>
                      )}
                    </div>
                    {match.venue && (
                      <p className="text-[10px] text-muted-foreground mt-2">📍 {match.venue}</p>
                    )}
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
