import { useParams, Link } from "react-router-dom";
import { useMemo, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Trophy, Users, TrendingUp, TrendingDown, Minus, Crown,
  Swords, X, Share2, ChevronRight,
} from "lucide-react";
import { motion, LayoutGroup, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { RivalBanner } from "@/components/RivalBanner";
import { BadgesGrid, calculateBadges } from "@/components/BadgesGrid";
import { SmartInsights } from "@/components/SmartInsights";
import { GoalCelebration, useGoalCelebration } from "@/components/GoalCelebration";
import { LiveRankNotification } from "@/components/LiveRankNotification";
import { useRealtimeMatches, useRealtimePredictions } from "@/hooks/useRealtimeMatches";
import { CatchUpCalculator } from "@/components/CatchUpCalculator";
import { SocialShareSheet } from "@/components/SocialShareSheet";

interface LeaderboardEntry {
  userId: string;
  name: string;
  avatar_url: string | null;
  points: number;
  todayPoints: number;
  role: string;
  exactCount: number;
  correctResults: number;
  totalCorrectGoals: number;
  lastCorrectAt: string | null;
}

export default function PoolDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showGoal, triggerGoal, hideGoal } = useGoalCelebration();
  const [rankNotification, setRankNotification] = useState<{
    visible: boolean; direction: "up" | "down"; newPosition: number; passedName?: string;
  }>({ visible: false, direction: "up", newPosition: 0 });
  const prevPositionRef = useRef<number | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [showRivalPicker, setShowRivalPicker] = useState(false);

  // Realtime subscriptions
  useRealtimeMatches((_matchId, _team) => triggerGoal());
  useRealtimePredictions();

  const { data: pool, isLoading } = useQuery({
    queryKey: ["pool", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("pools").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: members } = useQuery({
    queryKey: ["pool-members", id],
    queryFn: async () => {
      const { data: memberRows, error } = await supabase
        .from("pool_members").select("*").eq("pool_id", id!).order("joined_at", { ascending: true });
      if (error) throw error;
      if (!memberRows || memberRows.length === 0) return [];
      const userIds = memberRows.map((m) => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, name, avatar_url").in("user_id", userIds);
      const profileMap: Record<string, { name: string | null; avatar_url: string | null }> = {};
      profiles?.forEach((p) => { profileMap[p.user_id] = p; });
      return memberRows.map((m) => ({ ...m, profile: profileMap[m.user_id] || { name: null, avatar_url: null } }));
    },
    enabled: !!id,
  });

  const { data: myMembership } = useQuery({
    queryKey: ["my-membership", id, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("pool_members").select("*").eq("pool_id", id!).eq("user_id", user.id).single();
      return data;
    },
    enabled: !!id && !!user,
  });

  const setRival = useMutation({
    mutationFn: async (rivalUserId: string | null) => {
      if (!user || !id) throw new Error("Not ready");
      const { error } = await supabase.from("pool_members").update({ rival_user_id: rivalUserId }).eq("pool_id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-membership", id] });
      toast({ title: "Rivaal ingesteld! ⚔️" });
    },
  });

  const { data: leaderboard } = useQuery({
    queryKey: ["leaderboard", id],
    queryFn: async () => {
      const { data: memberRows } = await supabase.from("pool_members").select("user_id, role").eq("pool_id", id!);
      if (!memberRows || memberRows.length === 0) return [];
      const userIds = memberRows.map((m) => m.user_id);
      const { data: preds } = await supabase
        .from("predictions").select("user_id, points_awarded, home_pred, away_pred, match_id, updated_at, matches(kickoff_utc, home_score, away_score, status)").eq("pool_id", id!);
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const userPoints: Record<string, number> = {};
      const userTodayPoints: Record<string, number> = {};
      const userExactCount: Record<string, number> = {};
      const userCorrectResults: Record<string, number> = {};
      const userTotalCorrectGoals: Record<string, number> = {};
      const userLastCorrectAt: Record<string, string | null> = {};
      userIds.forEach((uid) => {
        userPoints[uid] = 0; userTodayPoints[uid] = 0;
        userExactCount[uid] = 0; userCorrectResults[uid] = 0;
        userTotalCorrectGoals[uid] = 0; userLastCorrectAt[uid] = null;
      });
      preds?.forEach((p: any) => {
        const pts = p.points_awarded || 0;
        const m = p.matches;
        userPoints[p.user_id] = (userPoints[p.user_id] || 0) + pts;
        const kickoff = m?.kickoff_utc ? new Date(m.kickoff_utc) : null;
        if (kickoff && kickoff >= todayStart) { userTodayPoints[p.user_id] = (userTodayPoints[p.user_id] || 0) + pts; }

        // Tiebreaker stats (only for finished matches)
        if (m?.status === 'finished' && m.home_score != null && m.away_score != null && p.home_pred != null && p.away_pred != null) {
          // Exact score
          if (p.home_pred === m.home_score && p.away_pred === m.away_score) {
            userExactCount[p.user_id] = (userExactCount[p.user_id] || 0) + 1;
          }
          // Correct result
          if (pts > 0) {
            userCorrectResults[p.user_id] = (userCorrectResults[p.user_id] || 0) + 1;
            // Total correct predicted goals
            const homeCorrect = p.home_pred === m.home_score ? 1 : 0;
            const awayCorrect = p.away_pred === m.away_score ? 1 : 0;
            userTotalCorrectGoals[p.user_id] = (userTotalCorrectGoals[p.user_id] || 0) + homeCorrect + awayCorrect;
            // Last correct prediction timestamp
            if (!userLastCorrectAt[p.user_id] || p.updated_at > userLastCorrectAt[p.user_id]!) {
              userLastCorrectAt[p.user_id] = p.updated_at;
            }
          }
        }
      });
      const { data: profiles } = await supabase.from("profiles").select("user_id, name, avatar_url").in("user_id", userIds);
      const profileMap: Record<string, any> = {};
      profiles?.forEach((p: any) => { profileMap[p.user_id] = p; });
      const roleMap: Record<string, string> = {};
      memberRows.forEach((m) => { roleMap[m.user_id] = m.role; });
      return Object.entries(userPoints)
        .map(([userId, points]) => ({
          userId, name: profileMap[userId]?.name || "Onbekend", avatar_url: profileMap[userId]?.avatar_url || null,
          points, todayPoints: userTodayPoints[userId] || 0, role: roleMap[userId] || "member",
          exactCount: userExactCount[userId] || 0,
          correctResults: userCorrectResults[userId] || 0,
          totalCorrectGoals: userTotalCorrectGoals[userId] || 0,
          lastCorrectAt: userLastCorrectAt[userId] || null,
        }))
        .sort((a, b) => {
          // 1. Points
          if (b.points !== a.points) return b.points - a.points;
          // 2. Most exact scores
          if (b.exactCount !== a.exactCount) return b.exactCount - a.exactCount;
          // 3. Most correct results
          if (b.correctResults !== a.correctResults) return b.correctResults - a.correctResults;
          // 4. Total correct goals predicted
          if (b.totalCorrectGoals !== a.totalCorrectGoals) return b.totalCorrectGoals - a.totalCorrectGoals;
          // 5. Last correct prediction (earlier = higher)
          if (a.lastCorrectAt && b.lastCorrectAt) return a.lastCorrectAt < b.lastCorrectAt ? -1 : 1;
          return 0;
        }) as LeaderboardEntry[];
    },
    enabled: !!id,
  });

  const { data: myPredictions } = useQuery({
    queryKey: ["my-pool-predictions", id, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("predictions").select("home_pred, away_pred, points_awarded, match_id, matches(home_score, away_score, status, stage)")
        .eq("pool_id", id!).eq("user_id", user.id);
      return data || [];
    },
    enabled: !!id && !!user,
  });

  // Remaining matches count
  const { data: remainingMatches } = useQuery({
    queryKey: ["remaining-matches"],
    queryFn: async () => {
      const { count } = await supabase.from("matches").select("id", { count: "exact", head: true }).eq("status", "scheduled");
      return count || 0;
    },
  });

  const badges = useMemo(() => calculateBadges(myPredictions || []), [myPredictions]);

  const dailyWinner = useMemo(() => {
    if (!leaderboard) return null;
    return leaderboard.reduce<LeaderboardEntry | null>((top, entry) => {
      if (entry.todayPoints > 0 && (!top || entry.todayPoints > top.todayPoints)) return entry;
      return top;
    }, null);
  }, [leaderboard]);

  const rivalEntry = useMemo(() => {
    if (!myMembership?.rival_user_id || !leaderboard) return null;
    return leaderboard.find((e) => e.userId === myMembership.rival_user_id) || null;
  }, [myMembership, leaderboard]);

  const myEntry = useMemo(() => {
    if (!user || !leaderboard) return null;
    return leaderboard.find((e) => e.userId === user.id) || null;
  }, [user, leaderboard]);

  const myPosition = useMemo(() => {
    if (!user || !leaderboard) return null;
    const idx = leaderboard.findIndex((e) => e.userId === user.id);
    return idx >= 0 ? idx + 1 : null;
  }, [user, leaderboard]);

  useMemo(() => {
    if (myPosition == null) return;
    if (prevPositionRef.current != null && prevPositionRef.current !== myPosition) {
      const direction = myPosition < prevPositionRef.current ? "up" : "down";
      const passedIdx = direction === "up" ? myPosition : myPosition - 2;
      const passedName = leaderboard && passedIdx >= 0 && passedIdx < leaderboard.length
        ? leaderboard[passedIdx]?.name : undefined;
      setRankNotification({ visible: true, direction, newPosition: myPosition, passedName });
    }
    prevPositionRef.current = myPosition;
  }, [myPosition, leaderboard]);

  const scoringRules = pool?.scoring_rules_json as any;
  const exactPts = scoringRules?.exact ?? 6;
  const resultPts = scoringRules?.result ?? 3;
  const goalDiffPts = scoringRules?.goal_diff ?? 4;

  const appOrigin = import.meta.env.PROD ? "https://goaltje-world-cup-ai.lovable.app" : window.location.origin;
  const poolLink = pool ? `${appOrigin}/join/${pool.invite_code}` : "";
  const shareText = pool ? `Doe mee met mijn WK 2026 poule "${pool.name}" op Goaltje! 🏆⚽\n\nCode: ${pool.invite_code}\n${poolLink}` : "";

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-6 text-center">
        <p className="text-muted-foreground">Poule niet gevonden</p>
      </div>
    );
  }

  const getRankBadge = (i: number) => {
    if (i === 0) return "🥇";
    if (i === 1) return "🥈";
    if (i === 2) return "🥉";
    return `${i + 1}`;
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-3 pb-6 space-y-4">
      {/* Overlays */}
      <GoalCelebration visible={showGoal} onComplete={hideGoal} />
      <LiveRankNotification
        visible={rankNotification.visible} direction={rankNotification.direction}
        newPosition={rankNotification.newPosition} passedName={rankNotification.passedName}
        onComplete={() => setRankNotification((s) => ({ ...s, visible: false }))}
      />

      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link to="/pool" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors">
          <ArrowLeft className="h-4 w-4" /> Terug
        </Link>
        <Button
          size="sm" variant="outline"
          className="gap-1.5 rounded-xl h-9 shadow-elevation-1"
          onClick={() => setShowShare(true)}
        >
          <Share2 className="h-3.5 w-3.5" /> Delen
        </Button>
      </div>

      {/* Pool Hero Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-elevation-3 overflow-hidden">
          <div className="gradient-primary h-1.5" />
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-2xl gradient-navy flex items-center justify-center shrink-0 shadow-elevation-2">
                <Trophy className="h-6 w-6 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold font-display truncate">{pool.name}</h1>
                {pool.description && <p className="text-xs text-muted-foreground mt-0.5">{pool.description}</p>}
                <div className="flex items-center gap-3 mt-2">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" /> {members?.length || 0} leden
                  </span>
                  {pool.prize_text && (
                    <span className="inline-flex items-center gap-1 text-xs text-secondary font-medium">
                      🏆 {pool.prize_text}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Share Sheet - Expandable */}
      <AnimatePresence>
        {showShare && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-0 shadow-elevation-3 overflow-hidden">
              <CardContent className="p-5 space-y-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-display font-bold text-sm">Nodig vrienden uit 🎉</p>
                  <button onClick={() => setShowShare(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <SocialShareSheet
                  poolName={pool.name}
                  inviteCode={pool.invite_code}
                  poolLink={poolLink}
                  shareText={shareText}
                />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rival Banner */}
      {myEntry && rivalEntry && (
        <div className="relative">
          <RivalBanner myName={myEntry.name} myPoints={myEntry.points} rivalName={rivalEntry.name} rivalPoints={rivalEntry.points} />
          <button
            onClick={() => setRival.mutate(null)}
            className="absolute top-2 right-2 h-6 w-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Set Rival */}
      {user && myEntry && !rivalEntry && !showRivalPicker && leaderboard && leaderboard.length > 1 && (
        <Button variant="outline" className="w-full gap-2 h-10 border-dashed rounded-xl" onClick={() => setShowRivalPicker(true)}>
          <Swords className="h-4 w-4 text-primary" /> Kies een rivaal
        </Button>
      )}

      {/* Rival Picker */}
      {showRivalPicker && leaderboard && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 shadow-elevation-2">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-muted-foreground">⚔️ Kies je rivaal</p>
                <button onClick={() => setShowRivalPicker(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
              {leaderboard.filter((e) => e.userId !== user?.id).map((entry) => (
                <button
                  key={entry.userId}
                  onClick={() => { setRival.mutate(entry.userId); setShowRivalPicker(false); }}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold overflow-hidden">
                    {entry.avatar_url ? <img src={entry.avatar_url} alt="" className="h-full w-full object-cover" /> : entry.name[0]?.toUpperCase() || "?"}
                  </div>
                  <span className="text-sm font-medium flex-1">{entry.name}</span>
                  <span className="text-xs text-muted-foreground">{entry.points} pt</span>
                </button>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* #1 Calculator */}
      {myEntry && leaderboard && leaderboard.length > 1 && myPosition !== 1 && (
        <CatchUpCalculator
          myPoints={myEntry.points}
          leaderPoints={leaderboard[0].points}
          leaderName={leaderboard[0].name}
          remainingMatches={remainingMatches || 48}
          exactPoints={exactPts}
          resultPoints={resultPts}
        />
      )}

      {/* Daily Winner */}
      {dailyWinner && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15, type: "spring", stiffness: 300 }}>
          <Card className="border-0 shadow-glow-gold overflow-hidden">
            <div className="bg-gradient-to-r from-secondary via-secondary to-warning h-1" />
            <CardContent className="p-4 flex items-center gap-3">
              <motion.div animate={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 0.5, delay: 0.4 }}>
                <Crown className="h-7 w-7 text-secondary" />
              </motion.div>
              <div className="flex-1">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Dagwinnaar</p>
                <p className="font-bold font-display text-sm">
                  {dailyWinner.name}
                  {dailyWinner.userId === user?.id && <span className="text-primary ml-1">(jij!)</span>}
                </p>
              </div>
              <motion.div className="text-right" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring", stiffness: 400 }}>
                <span className="text-xl font-bold font-display text-secondary">+{dailyWinner.todayPoints}</span>
                <p className="text-[10px] text-muted-foreground">vandaag</p>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="leaderboard" className="w-full">
        <TabsList className="w-full grid grid-cols-4 h-11 rounded-xl">
          <TabsTrigger value="leaderboard" className="text-xs rounded-lg data-[state=active]:shadow-elevation-1">🏆 Rang</TabsTrigger>
          <TabsTrigger value="badges" className="text-xs rounded-lg data-[state=active]:shadow-elevation-1">🎖️ Badges</TabsTrigger>
          <TabsTrigger value="insights" className="text-xs rounded-lg data-[state=active]:shadow-elevation-1">🧠 Insights</TabsTrigger>
          <TabsTrigger value="members" className="text-xs rounded-lg data-[state=active]:shadow-elevation-1">👥 Leden</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="mt-4 space-y-2">
          {leaderboard && leaderboard.length > 0 ? (
            <LayoutGroup>
              {leaderboard.map((entry, i) => {
                const isMe = entry.userId === user?.id;
                const isRival = entry.userId === myMembership?.rival_user_id;
                const pointsAbove = i > 0 ? leaderboard[i - 1].points - entry.points : 0;
                const pointsBelow = i < leaderboard.length - 1 ? entry.points - leaderboard[i + 1].points : 0;

                return (
                  <motion.div
                    key={entry.userId} layout layoutId={entry.userId}
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, layout: { type: "spring", stiffness: 300, damping: 30 } }}
                  >
                    <Card className={cn(
                      "border-0 transition-all duration-300 overflow-hidden",
                      isMe ? "shadow-glow-primary ring-1 ring-primary/20" : "shadow-elevation-1",
                      isRival && "ring-1 ring-destructive/20",
                      i === 0 && "shadow-glow-gold ring-1 ring-secondary/30",
                      i === 1 && "ring-1 ring-muted-foreground/20",
                      i === 2 && "ring-1 ring-warning/20",
                    )}>
                      {i === 0 && <div className="bg-gradient-to-r from-secondary/20 to-transparent h-0.5" />}
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "text-lg font-bold font-display w-8 text-center shrink-0",
                            i === 0 && "text-secondary", i === 1 && "text-muted-foreground",
                            i === 2 && "text-warning", i > 2 && "text-muted-foreground",
                          )}>
                            {getRankBadge(i)}
                          </span>

                          <div className={cn(
                            "h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden shrink-0",
                            i === 0 ? "ring-2 ring-secondary/40 bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground",
                          )}>
                            {entry.avatar_url
                              ? <img src={entry.avatar_url} alt="" className="h-full w-full object-cover" />
                              : entry.name[0]?.toUpperCase() || "?"}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {entry.name}
                              {isMe && <span className="text-primary ml-1 text-xs">(jij)</span>}
                              {isRival && <span className="text-destructive ml-1">⚔️</span>}
                              {entry.role === "admin" && <span className="ml-1">👑</span>}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              {i > 0 && pointsAbove > 0 && (
                                <span className="flex items-center gap-0.5"><TrendingUp className="h-2.5 w-2.5" />{pointsAbove} achter #{i}</span>
                              )}
                              {i < leaderboard.length - 1 && pointsBelow > 0 && (
                                <span className="flex items-center gap-0.5">+{pointsBelow} voor #{i + 2}</span>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={cn("font-bold text-lg font-display", i === 0 ? "text-secondary" : "text-primary")}>
                              {entry.points}
                            </span>
                            <span className="text-xs text-muted-foreground ml-0.5">pt</span>
                            {entry.todayPoints > 0 && (
                              <motion.div
                                className="flex items-center justify-end gap-0.5 text-xs font-semibold text-success"
                                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + i * 0.05 }}
                              >
                                <TrendingUp className="h-3 w-3" />+{entry.todayPoints}
                              </motion.div>
                            )}
                            {entry.todayPoints === 0 && (
                              <div className="flex items-center justify-end gap-0.5 text-[10px] text-muted-foreground/50">
                                <Minus className="h-2.5 w-2.5" />
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </LayoutGroup>
          ) : (
            <Card className="border-0 shadow-elevation-1">
              <CardContent className="p-6 text-center text-muted-foreground text-sm">
                Nog geen deelnemers. Nodig vrienden uit! ⚽
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="badges" className="mt-4">
          <BadgesGrid badges={badges} />
        </TabsContent>

        <TabsContent value="insights" className="mt-4">
          <SmartInsights predictions={myPredictions || []} />
        </TabsContent>

        <TabsContent value="members" className="mt-4 space-y-2">
          {members && members.length > 0 ? (
            members.map((member: any) => (
              <Card key={member.id} className="border-0 shadow-elevation-1">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold overflow-hidden">
                    {member.profile?.avatar_url
                      ? <img src={member.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                      : (member.profile?.name || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{member.profile?.name || "Onbekend"}</p>
                    <p className="text-xs text-muted-foreground">{member.role === "admin" ? "👑 Aanmaker" : "Lid"}</p>
                  </div>
                  {member.user_id === user?.id && <Badge variant="outline" className="text-xs">Jij</Badge>}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-0 shadow-elevation-1">
              <CardContent className="p-6 text-center text-muted-foreground text-sm">Nog geen leden</CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
