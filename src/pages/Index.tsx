import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { formatNLDate, formatNLTime } from "@/lib/timezone";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Users, Calendar, TrendingUp, ChevronRight, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import goaltjeLogo from "@/assets/goaltje-logo.png";

export default function Index() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: upcomingMatches, isLoading: matchesLoading } = useQuery({
    queryKey: ["upcoming-matches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
        .gte("kickoff_utc", new Date().toISOString())
        .order("kickoff_utc", { ascending: true })
        .limit(5);
      return data || [];
    },
  });

  const { data: pools } = useQuery({
    queryKey: ["my-pools", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("pool_members")
        .select("pool_id, pools(id, name, invite_code)")
        .eq("user_id", user.id);
      return data?.map((m: any) => m.pools).filter(Boolean) || [];
    },
    enabled: !!user,
  });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Goedemorgen";
    if (hour < 18) return "Goedemiddag";
    return "Goedenavond";
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <img src={goaltjeLogo} alt="Goaltje" className="w-14 h-14" />
        <div>
          <p className="text-muted-foreground text-sm">{greeting()}</p>
          <h1 className="text-2xl font-bold font-display">
            {profile?.name || "Voetbalfan"} ⚽
          </h1>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/pool">
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-primary text-primary-foreground">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{pools?.length || 0}</p>
                <p className="text-xs opacity-80">Poules</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/matches">
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-secondary text-secondary-foreground">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-black/10 flex items-center justify-center">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">WK '26</p>
                <p className="text-xs opacity-80">Toernooi</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Upcoming Matches */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" /> Voorspellingen
          </h2>
          <Link to="/matches" className="text-sm text-primary font-medium flex items-center gap-1">
            Alles <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {matchesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : upcomingMatches && upcomingMatches.length > 0 ? (
          <div className="space-y-3">
            {upcomingMatches.map((match: any, i: number) => (
              <motion.div key={match.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link to={`/matches/${match.id}`}>
                  <Card className="border-0 shadow-md hover:shadow-lg transition-all overflow-hidden">
                    {/* Match header bar */}
                    <div className="bg-primary px-4 py-1.5 flex items-center justify-between">
                      <span className="text-[10px] font-medium text-primary-foreground/80">
                        {match.stage === "group" ? `Groep ${match.group}` : match.stage}
                      </span>
                      <span className="text-[10px] text-primary-foreground/80 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatNLTime(match.kickoff_utc)}
                      </span>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        {/* Home team */}
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-2xl">{match.home_team?.flag_url || "🏳️"}</span>
                          <span className="font-semibold text-sm">{match.home_team?.short_name || match.home_team?.name || "TBD"}</span>
                        </div>

                        {/* Score / Time */}
                        <div className="px-4 text-center">
                          {match.home_score != null && match.away_score != null ? (
                            <span className="text-2xl font-bold font-display">
                              {match.home_score} - {match.away_score}
                            </span>
                          ) : (
                            <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                              {formatNLDate(match.kickoff_utc)}
                            </span>
                          )}
                        </div>

                        {/* Away team */}
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <span className="font-semibold text-sm text-right">{match.away_team?.short_name || match.away_team?.name || "TBD"}</span>
                          <span className="text-2xl">{match.away_team?.flag_url || "🏳️"}</span>
                        </div>
                      </div>

                      {match.venue && (
                        <p className="text-[10px] text-muted-foreground text-center mt-2">📍 {match.venue}</p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-md">
            <CardContent className="p-6 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nog geen wedstrijden gepland.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pool Standings Preview */}
      {pools && pools.length > 0 && (
        <div>
          <h2 className="font-display font-semibold text-lg flex items-center gap-2 mb-3">
            <TrendingUp className="h-5 w-5 text-secondary" /> Jouw poules
          </h2>
          <div className="space-y-3">
            {pools.map((pool: any) => (
              <Link key={pool.id} to={`/pool/${pool.id}`}>
                <Card className="border-0 shadow-md hover:shadow-lg transition-all mb-3">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{pool.name}</p>
                      <p className="text-xs text-muted-foreground">Code: {pool.invite_code}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-primary" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!user && (
        <Card className="border-0 shadow-lg bg-primary text-primary-foreground">
          <CardContent className="p-6 text-center space-y-3">
            <p className="font-display font-semibold text-lg">Klaar om mee te doen?</p>
            <p className="text-sm opacity-80">Maak een account aan en doe mee met poules!</p>
            <Link to="/auth">
              <Button className="bg-white text-primary hover:bg-white/90 mt-2 font-semibold">Aan de slag</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
