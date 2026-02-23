import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Users, ChevronRight, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PoolSelector } from "@/components/PoolSelector";
import { MatchCard } from "@/components/MatchCard";
import { LiveMatchBanner } from "@/components/LiveMatchBanner";
import { GoalCelebration, useGoalCelebration } from "@/components/GoalCelebration";
import { useRealtimeMatches, useRealtimePredictions } from "@/hooks/useRealtimeMatches";
import goaltjeLogo from "@/assets/goaltje-logo.png";

export default function Index() {
  const { user } = useAuth();
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const { showGoal, triggerGoal, hideGoal } = useGoalCelebration();

  // Realtime subscriptions
  useRealtimeMatches((_matchId, _team) => {
    triggerGoal();
  });
  useRealtimePredictions();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  // Fetch both upcoming AND recent finished matches
  const { data: upcomingMatches, isLoading: matchesLoading } = useQuery({
    queryKey: ["upcoming-matches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
        .gte("kickoff_utc", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
        .order("kickoff_utc", { ascending: true })
        .limit(8);
      return data || [];
    },
  });

  const matchIds = upcomingMatches?.map((m: any) => m.id) || [];
  const { data: myPredictions } = useQuery({
    queryKey: ["home-predictions", user?.id, matchIds],
    queryFn: async () => {
      if (!user || matchIds.length === 0) return [];
      const { data } = await supabase
        .from("predictions")
        .select("match_id, home_pred, away_pred, points_awarded, pool_id")
        .eq("user_id", user.id)
        .in("match_id", matchIds);
      return data || [];
    },
    enabled: !!user && matchIds.length > 0,
  });

  // Build prediction map filtered by selected pool
  const predictionMap = new Map(
    myPredictions
      ?.filter((p: any) => !selectedPoolId || p.pool_id === selectedPoolId)
      .map((p: any) => [p.match_id, p]) || []
  );

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

  // Split matches
  const liveMatches = upcomingMatches?.filter((m: any) => m.status === "live") || [];
  const recentFinished = upcomingMatches?.filter((m: any) => m.status === "finished").slice(-3) || [];
  const upcoming = upcomingMatches?.filter((m: any) => m.status !== "finished" && m.status !== "live").slice(0, 5) || [];

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-4 space-y-5">
      {/* Goal Celebration Overlay */}
      <GoalCelebration visible={showGoal} onComplete={hideGoal} />
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <img src={goaltjeLogo} alt="Goaltje" className="w-14 h-14" />
        <div className="flex-1">
          <p className="text-muted-foreground text-sm">{greeting()}</p>
          <h1 className="text-2xl font-bold font-display">
            {profile?.name || "Voetbalfan"} ⚽
          </h1>
        </div>
      </motion.div>

      {/* Pool Selector */}
      {user && pools && pools.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <PoolSelector value={selectedPoolId} onChange={setSelectedPoolId} />
        </motion.div>
      )}

      {/* Live Match Banner */}
      {liveMatches.length > 0 && (
        <LiveMatchBanner matches={liveMatches} />
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/pool">
          <Card className="border-0 shadow-elevation-2 hover:shadow-elevation-3 transition-all gradient-navy text-white overflow-hidden group">
            <CardContent className="p-4 flex items-center gap-3 relative">
              <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{pools?.length || 0}</p>
                <p className="text-xs opacity-70">Poules</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/matches">
          <Card className="border-0 shadow-elevation-2 hover:shadow-elevation-3 transition-all bg-secondary text-secondary-foreground overflow-hidden group">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-black/10 flex items-center justify-center group-hover:bg-black/15 transition-colors">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">WK '26</p>
                <p className="text-xs opacity-70">Toernooi</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent results */}
      {recentFinished.length > 0 && (
        <div>
          <h2 className="font-display font-semibold text-lg flex items-center gap-2 mb-3">
            <TrendingUp className="h-5 w-5 text-success" /> Laatste uitslagen
          </h2>
          <div className="space-y-3">
            {recentFinished.map((match: any, i: number) => (
              <MatchCard
                key={match.id}
                match={match}
                prediction={predictionMap.get(match.id)}
                index={i}
                compact
              />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Matches */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-lg flex items-center gap-2">
            🟡 Voorspellingen
          </h2>
          <Link to="/matches" className="text-sm text-primary font-medium flex items-center gap-1">
            Alles <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {matchesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : upcoming.length > 0 ? (
          <div className="space-y-3">
            {upcoming.map((match: any, i: number) => (
              <MatchCard
                key={match.id}
                match={match}
                prediction={predictionMap.get(match.id)}
                index={i}
              />
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-elevation-2">
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
                <Card className="border-0 shadow-elevation-2 hover:shadow-elevation-3 transition-all mb-3 group">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{pool.name}</p>
                      <p className="text-xs text-muted-foreground">Code: {pool.invite_code}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-primary group-hover:translate-x-1 transition-transform" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!user && (
        <Card className="border-0 shadow-elevation-3 gradient-navy text-white">
          <CardContent className="p-6 text-center space-y-3">
            <p className="font-display font-semibold text-lg">Klaar om mee te doen?</p>
            <p className="text-sm opacity-80">Maak een account aan en doe mee met poules!</p>
            <Link to="/auth">
              <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 mt-2 font-semibold">Aan de slag</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
