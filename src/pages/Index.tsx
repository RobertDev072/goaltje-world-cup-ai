import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Users, ChevronRight, TrendingUp, Target, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PoolHeaderCard } from "@/components/PoolHeaderCard";
import { TournamentProgress } from "@/components/TournamentProgress";
import { MatchCard } from "@/components/MatchCard";
import { LiveMatchBanner } from "@/components/LiveMatchBanner";
import { GoalCelebration, useGoalCelebration } from "@/components/GoalCelebration";
import { useRealtimeMatches, useRealtimePredictions } from "@/hooks/useRealtimeMatches";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import goaltjeLogo from "@/assets/goaltje-logo.png";
import { PredictionReminderBanner } from "@/components/PredictionReminderBanner";
import { DailyPoolRecap } from "@/components/DailyPoolRecap";
import { getPredictionState, isMissingToday } from "@/lib/predictionStatus";
import { toast } from "@/hooks/use-toast";
import { OnboardingModal } from "@/components/OnboardingModal";


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
    queryKey: queryKeys.profile(user?.id || ""),
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("name, avatar_url").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user,
    staleTime: staleTimes.profile,
  });

  // Fetch only upcoming + live matches (no past results on home)
  const { data: upcomingMatches, isLoading: matchesLoading } = useQuery({
    queryKey: queryKeys.upcomingMatches(),
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("id, kickoff_utc, status, stage, group, venue, home_score, away_score, prediction_deadline_utc, home_team:teams!matches_home_team_id_fkey(id, name, short_name, flag_url), away_team:teams!matches_away_team_id_fkey(id, name, short_name, flag_url)")
        .in("status", ["scheduled", "live"])
        .order("kickoff_utc", { ascending: true })
        .limit(6);
      return data || [];
    },
    staleTime: staleTimes.matches,
  });

  const matchIds = upcomingMatches?.map((m: any) => m.id) || [];
  const { data: pools } = useQuery({
    queryKey: queryKeys.myPools(user?.id || ""),
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("pool_members")
        .select("pool_id, pools(id, name, invite_code)")
        .eq("user_id", user.id);
      return data?.map((m: any) => m.pools).filter(Boolean) || [];
    },
    enabled: !!user,
    staleTime: staleTimes.pools,
  });

  const activePoolId = selectedPoolId || pools?.[0]?.id || "";

  // Leaderboard for ranking display
  const { data: leaderboard } = useQuery({
    queryKey: queryKeys.leaderboard(activePoolId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_pool_leaderboard", { _pool_id: activePoolId });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!activePoolId,
    staleTime: staleTimes.leaderboard,
  });

  const myRank = useMemo(() => {
    if (!user || !leaderboard) return null;
    const idx = leaderboard.findIndex((e: any) => e.userId === user.id);
    if (idx < 0) return null;
    return { position: idx + 1, total: leaderboard.length, points: leaderboard[idx].points, exactCount: leaderboard[idx].exactCount };
  }, [user, leaderboard]);

  // Count open predictions
  const { data: remainingMatches } = useQuery({
    queryKey: ["remaining-matches"],
    queryFn: async () => {
      const { count } = await supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .eq("status", "scheduled");
      return count || 0;
    },
    staleTime: staleTimes.matches,
  });

  const { data: myPredictions } = useQuery({
    queryKey: queryKeys.homePredictions(user?.id || "", matchIds, activePoolId),
    queryFn: async () => {
      if (!user || matchIds.length === 0 || !activePoolId) return [];
      const { data } = await supabase
        .from("predictions")
        .select("match_id, home_pred, away_pred, points_awarded, pool_id")
        .eq("user_id", user.id)
        .eq("pool_id", activePoolId)
        .in("match_id", matchIds);
      return data || [];
    },
    enabled: !!user && !!activePoolId && matchIds.length > 0,
    staleTime: staleTimes.predictions,
  });

  const predictionMap = new Map(
    myPredictions?.map((p: any) => [p.match_id, p]) || []
  );

  // Batch: meest-voorspelde uitslag per match in de actieve pool
  const { data: poolTopScores } = useQuery({
    queryKey: queryKeys.poolTopScores(activePoolId, matchIds),
    queryFn: async () => {
      if (!activePoolId || matchIds.length === 0) return {} as Record<string, any>;
      const { data, error } = await supabase.rpc("get_pool_top_scores", {
        _pool_id: activePoolId,
        _match_ids: matchIds,
      });
      if (error) throw error;
      return (data as Record<string, any>) || {};
    },
    enabled: !!activePoolId && matchIds.length > 0,
    staleTime: staleTimes.predictions,
  });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Goedemorgen";
    if (hour < 18) return "Goedemiddag";
    return "Goedenavond";
  };

  // Split matches (only live + scheduled, no finished on home)
  const liveMatches = upcomingMatches?.filter((m: any) => m.status === "live") || [];
  const upcoming = upcomingMatches?.filter((m: any) => m.status === "scheduled").slice(0, 5) || [];

  const missingTodayMatches = useMemo(
    () => (upcomingMatches || []).filter((match: any) => isMissingToday(match, predictionMap.get(match.id))),
    [upcomingMatches, predictionMap],
  );

  const missedMatches = useMemo(
    () => (upcomingMatches || []).filter((match: any) => getPredictionState(match, predictionMap.get(match.id)) === "missed"),
    [upcomingMatches, predictionMap],
  );

  useEffect(() => {
    if (!user || !activePoolId || missingTodayMatches.length === 0) return;

    const todayKey = new Date().toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam" });
    const storageKey = `prediction-reminder:${activePoolId}:${todayKey}`;

    if (localStorage.getItem(storageKey)) return;

    localStorage.setItem(storageKey, "1");
    toast({
      title: `Je mist nog ${missingTodayMatches.length} voorspelling${missingTodayMatches.length > 1 ? "en" : ""} vandaag`,
      description: "Open wedstrijden en vul ze nog in voordat de deadline sluit.",
    });
  }, [user, activePoolId, missingTodayMatches]);


  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-4 space-y-5">
      <OnboardingModal />
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

      {/* Pool header (rich) + WK voortgangs-balk */}
      {user && pools && pools.length > 0 && activePoolId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <PoolHeaderCard
            poolId={activePoolId}
            poolName={pools.find((p: any) => p.id === activePoolId)?.name || ""}
            pools={pools}
            onPoolChange={setSelectedPoolId}
          />
          <TournamentProgress />
        </motion.div>
      )}

      {/* Live Match Banner */}
      {liveMatches.length > 0 && (
        <LiveMatchBanner matches={liveMatches} />
      )}

      {user && activePoolId && (
        <PredictionReminderBanner
          missingTodayMatches={missingTodayMatches}
          missedMatches={missedMatches}
        />
      )}

      {/* Ranking + Points + Open */}
      {user && myRank && (
        <div className="grid grid-cols-3 gap-2">
          <Link to={`/app/pool/${activePoolId}`}>
            <Card className="border-0 shadow-elevation-2 hover:shadow-elevation-3 transition-all gradient-navy text-white overflow-hidden">
              <CardContent className="p-3 text-center">
                <Trophy className="h-4 w-4 mx-auto mb-1 opacity-70" />
                <p className="text-xl font-bold font-display">#{myRank.position}</p>
                <p className="text-[10px] opacity-70">van {myRank.total}</p>
              </CardContent>
            </Card>
          </Link>
          <Card className="border-0 shadow-elevation-2 overflow-hidden">
            <CardContent className="p-3 text-center">
              <Target className="h-4 w-4 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold font-display">{myRank.points}</p>
              <p className="text-[10px] text-muted-foreground">{myRank.exactCount} exact</p>
            </CardContent>
          </Card>
          <Link to="/app/matches">
            <Card className={`border-0 shadow-elevation-2 hover:shadow-elevation-3 transition-all overflow-hidden ring-2 ring-secondary/60 ${
              missingTodayMatches.length > 0 ? "border-l-2 border-l-amber-500" : ""
            }`}>
              <CardContent className="p-3 text-center">
                {missingTodayMatches.length > 0 ? (
                  <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-amber-500" />
                ) : (
                  <Users className="h-4 w-4 mx-auto mb-1 text-primary" />
                )}
                <p className="text-xl font-bold font-display">{remainingMatches ?? "..."}</p>
                <p className="text-[10px] text-muted-foreground">open →</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* Pool navigation for users without ranking */}
      {user && !myRank && pools && pools.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Link to="/app/pool">
            <Card className="border-0 shadow-elevation-2 hover:shadow-elevation-3 transition-all gradient-navy text-white overflow-hidden">
              <CardContent className="p-4 flex items-center gap-3">
                <Users className="h-5 w-5" />
                <div>
                  <p className="text-2xl font-bold font-display">{pools.length}</p>
                  <p className="text-xs opacity-70">Poules</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/app/matches">
            <Card className="border-0 shadow-elevation-2 hover:shadow-elevation-3 transition-all bg-secondary text-secondary-foreground overflow-hidden">
              <CardContent className="p-4 flex items-center gap-3">
                <Trophy className="h-5 w-5" />
                <div>
                  <p className="text-2xl font-bold font-display">WK '26</p>
                  <p className="text-xs opacity-70">Toernooi</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}


      {/* Daily recap — verbergt zichzelf bij 0 afgeronde matches gisteren */}
      {user && activePoolId && (
        <DailyPoolRecap
          poolId={activePoolId}
          poolName={pools?.find((p: any) => p.id === activePoolId)?.name}
        />
      )}

      {/* Upcoming Matches */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-lg flex items-center gap-2">
            🟡 Aankomende wedstrijden
          </h2>
          <Link to="/app/matches" className="text-sm text-primary font-medium flex items-center gap-1">
            Schema <ChevronRight className="h-4 w-4" />
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
                poolTopScore={poolTopScores?.[match.id] ?? null}
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
              <Link key={pool.id} to={`/app/pool/${pool.id}`}>
                <Card className="border-0 shadow-elevation-2 hover:shadow-elevation-3 transition-all mb-3 group overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-3 p-4">
                      <div className="h-11 w-11 rounded-2xl gradient-navy flex items-center justify-center shrink-0 shadow-elevation-1">
                        <Trophy className="h-5 w-5 text-secondary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-sm truncate">{pool.name}</p>
                        {pool.invite_code && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono mt-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold tracking-wider">
                            {pool.invite_code}
                          </span>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-primary shrink-0 group-hover:translate-x-1 transition-transform" />
                    </div>
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
            <Link to="/login">
              <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 mt-2 font-semibold">Aan de slag</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
