import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, useRef } from "react";
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
  Swords, X, Share2, ChevronRight, LogOut,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { RivalBanner } from "@/components/RivalBanner";
import { BadgesGrid, calculateBadges } from "@/components/BadgesGrid";
import { SmartInsights } from "@/components/SmartInsights";
import { GoalCelebration, useGoalCelebration } from "@/components/GoalCelebration";
import { LiveRankNotification } from "@/components/LiveRankNotification";
import { useRealtimeMatches, useRealtimePredictions } from "@/hooks/useRealtimeMatches";
import { CatchUpCalculator } from "@/components/CatchUpCalculator";
import { SocialShareSheet } from "@/components/SocialShareSheet";
import { PoolChat } from "@/components/PoolChat";
import { ShareCard } from "@/components/ShareCard";
import { VirtualizedLeaderboard } from "@/components/VirtualizedLeaderboard";
import { TiebreakerInfo } from "@/components/TiebreakerInfo";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


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
  const navigate = useNavigate();
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
    staleTime: staleTimes.pools,
  });

  // Fetch tenant branding if pool has tenant_id
  const { data: tenant } = useQuery({
    queryKey: ["tenant", pool?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").eq("id", pool!.tenant_id!).single();
      if (error) return null;
      return data;
    },
    enabled: !!pool?.tenant_id,
    staleTime: staleTimes.static,
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
    staleTime: staleTimes.pools,
  });

  const { data: myMembership } = useQuery({
    queryKey: ["my-membership", id, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("pool_members").select("*").eq("pool_id", id!).eq("user_id", user.id).single();
      return data;
    },
    enabled: !!id && !!user,
    staleTime: staleTimes.pools,
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

  const leavePool = useMutation({
    mutationFn: async () => {
      if (!user || !id) throw new Error("Not ready");
      // Delete predictions for this pool
      await supabase.from("predictions").delete().eq("pool_id", id).eq("user_id", user.id);
      // Delete bonus predictions for this pool
      await supabase.from("bonus_predictions").delete().eq("pool_id", id).eq("user_id", user.id);
      // Delete pool messages by this user in this pool
      await supabase.from("pool_messages").delete().eq("pool_id", id).eq("user_id", user.id);
      // Remove membership
      const { error } = await supabase.from("pool_members").delete().eq("pool_id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-pools"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard(id || "") });
      queryClient.invalidateQueries({ queryKey: ["pool-members", id] });
      toast({ title: "Je hebt de poule verlaten" });
      navigate("/app/pool");
    },
    onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" }),
  });

  const { data: leaderboard } = useQuery({
    queryKey: queryKeys.leaderboard(id || ""),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_pool_leaderboard", { _pool_id: id! });
      if (error) throw error;
      return (data as unknown as LeaderboardEntry[]) || [];
    },
    enabled: !!id,
    staleTime: staleTimes.leaderboard,
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
    staleTime: staleTimes.predictions,
  });

  // Remaining matches count
  const { data: remainingMatches } = useQuery({
    queryKey: ["remaining-matches"],
    queryFn: async () => {
      const { count } = await supabase.from("matches").select("id", { count: "exact", head: true }).eq("status", "scheduled");
      return count || 0;
    },
    staleTime: staleTimes.stats,
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

  // Track rank changes via useEffect (not useMemo — side effects belong in useEffect)
  useEffect(() => {
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

  const scoringRules = pool?.scoring_rules_json as { exact?: number; result?: number; goal_diff?: number } | null;
  const exactPts = scoringRules?.exact ?? 6;
  const resultPts = scoringRules?.result ?? 3;
  const goalDiffPts = scoringRules?.goal_diff ?? 4;

  const appOrigin = import.meta.env.PROD ? "https://goaltje.nl" : window.location.origin;
  const poolLink = pool ? `${appOrigin}/join/${pool.invite_code}` : "";
  const shareText = pool
    ? `🏆 Doe mee met "${pool.name}" op Goaltje!\n\n⚽ Voorspel alle 104 WK 2026 wedstrijden\n📊 Live ranglijst & puntentelling\n🎯 Gratis meedoen!\n\n🔗 Code: ${pool.invite_code}\n${poolLink}`
    : "";

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
        <Link to="/app/pool" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors">
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
          {/* Tenant branded gradient bar or default */}
          <div
            className="h-1.5"
            style={tenant?.primary_color
              ? { background: `linear-gradient(90deg, ${tenant.primary_color}, ${tenant.secondary_color || tenant.primary_color})` }
              : undefined}
          >
            {!tenant?.primary_color && <div className="gradient-primary h-full w-full" />}
          </div>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start gap-3">
              {/* Tenant logo or default trophy icon */}
              {tenant?.logo_url ? (
                <div className="h-14 w-14 rounded-2xl bg-white border border-border/50 flex items-center justify-center shrink-0 shadow-elevation-2 overflow-hidden p-1.5">
                  <img src={tenant.logo_url} alt={tenant.name} className="h-full w-full object-contain" />
                </div>
              ) : (
                <div className="h-14 w-14 rounded-2xl gradient-navy flex items-center justify-center shrink-0 shadow-elevation-2">
                  <Trophy className="h-7 w-7 text-secondary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold font-display truncate">{pool.name}</h1>
                {tenant && (
                  <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: tenant.primary_color || undefined }}>
                    {tenant.name}
                  </p>
                )}
                {pool.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{pool.description}</p>}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                    <Users className="h-3 w-3" /> {members?.length || 0} leden
                  </span>
                  {pool.prize_text && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-secondary/15 text-secondary">
                      🏆 {pool.prize_text}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold tracking-[0.2em] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    {pool.invite_code}
                  </span>
                </div>
              </div>
            </div>

            {/* Scoring rules mini-bar */}
            <div className="flex items-center gap-3 pt-2 border-t border-border/50">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-primary">{exactPts}</span>
                <span className="text-[10px] text-muted-foreground">exact</span>
              </div>
              <div className="w-px h-3 bg-border" />
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-secondary">{goalDiffPts}</span>
                <span className="text-[10px] text-muted-foreground">doelsaldo</span>
              </div>
              <div className="w-px h-3 bg-border" />
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-accent">{resultPts}</span>
                <span className="text-[10px] text-muted-foreground">uitslag</span>
              </div>
              <div className="flex-1" />
              {myPosition && (
                <span className="text-xs font-display font-bold text-primary">
                  #{myPosition} van {leaderboard?.length}
                </span>
              )}
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
                  tenant={tenant}
                />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rival Banner with duel data */}
      {myEntry && rivalEntry && (
        <div className="relative">
          <RivalBanner
            myName={myEntry.name}
            myPoints={myEntry.points}
            rivalName={rivalEntry.name}
            rivalPoints={rivalEntry.points}
            duelMatches={(() => {
              if (!myPredictions || !myMembership?.rival_user_id) return undefined;
              // Build duel match data from predictions
              // This is a simplified version - in production you'd fetch rival's predictions too
              return undefined; // Will be enhanced when rival predictions are fetched
            })()}
          />
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
                    {entry.avatar_url ? <img src={entry.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" /> : entry.name[0]?.toUpperCase() || "?"}
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
        <TabsList className="w-full grid grid-cols-5 h-11 rounded-xl">
          <TabsTrigger value="leaderboard" className="text-xs rounded-lg data-[state=active]:shadow-elevation-1">🏆 Rang</TabsTrigger>
          <TabsTrigger value="chat" className="text-xs rounded-lg data-[state=active]:shadow-elevation-1">💬 Chat</TabsTrigger>
          <TabsTrigger value="badges" className="text-xs rounded-lg data-[state=active]:shadow-elevation-1">🎖️ Badges</TabsTrigger>
          <TabsTrigger value="insights" className="text-xs rounded-lg data-[state=active]:shadow-elevation-1">🧠 Stats</TabsTrigger>
          <TabsTrigger value="members" className="text-xs rounded-lg data-[state=active]:shadow-elevation-1">👥 Leden</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="mt-4 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">{leaderboard?.length || 0} deelnemers</span>
            <TiebreakerInfo />
          </div>
          {leaderboard && leaderboard.length > 0 ? (
            <VirtualizedLeaderboard
              leaderboard={leaderboard}
              currentUserId={user?.id}
              rivalUserId={myMembership?.rival_user_id}
            />
          ) : (
            <Card className="border-0 shadow-elevation-1">
              <CardContent className="p-6 text-center text-muted-foreground text-sm">
                Nog geen deelnemers. Nodig vrienden uit! ⚽
              </CardContent>
            </Card>
          )}

          {/* Share Card */}
          {myEntry && myPosition && (
            <div className="mt-4">
              <Card className="border-0 shadow-elevation-1 overflow-hidden">
                <CardContent className="p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">📸 Deel je score</p>
                  <ShareCard
                    type="rank"
                    poolName={pool.name}
                    playerName={myEntry.name}
                    rank={myPosition}
                    totalPlayers={leaderboard?.length}
                    points={myEntry.points}
                    todayPoints={myEntry.todayPoints}
                    tenant={tenant}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Leave Pool Button */}
          {user && myMembership && myMembership.role !== "admin" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full mt-4 gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                  disabled={leavePool.isPending}
                >
                  <LogOut className="h-4 w-4" />
                  {leavePool.isPending ? "Verlaten..." : "Poule verlaten"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Poule verlaten?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Weet je zeker dat je deze poule wilt verlaten? Je voorspellingen worden verwijderd en je kunt niet meer meedoen tenzij je opnieuw joinet.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuleren</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => leavePool.mutate()}
                  >
                    Verlaten
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </TabsContent>


        {/* Chat Tab */}
        <TabsContent value="chat" className="mt-4">
          <PoolChat poolId={id!} />
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
                      ? <img src={member.profile.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
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
