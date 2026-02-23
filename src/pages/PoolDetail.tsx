import { useParams, Link } from "react-router-dom";
import { useMemo, useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, Share2, Trophy, Users, MessageCircle, Link2, TrendingUp, TrendingDown, Minus, Crown, Swords, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { motion, LayoutGroup } from "framer-motion";
import { cn } from "@/lib/utils";
import { RivalBanner } from "@/components/RivalBanner";
import { BadgesGrid, calculateBadges } from "@/components/BadgesGrid";
import { SmartInsights } from "@/components/SmartInsights";
import { GoalCelebration, useGoalCelebration } from "@/components/GoalCelebration";
import { LiveRankNotification } from "@/components/LiveRankNotification";
import { useRealtimeMatches, useRealtimePredictions } from "@/hooks/useRealtimeMatches";

interface LeaderboardEntry {
  userId: string;
  name: string;
  avatar_url: string | null;
  points: number;
  todayPoints: number;
  role: string;
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
        .from("pool_members")
        .select("*")
        .eq("pool_id", id!)
        .order("joined_at", { ascending: true });
      if (error) throw error;
      if (!memberRows || memberRows.length === 0) return [];

      const userIds = memberRows.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);

      const profileMap: Record<string, { name: string | null; avatar_url: string | null }> = {};
      profiles?.forEach((p) => { profileMap[p.user_id] = p; });

      return memberRows.map((m) => ({
        ...m,
        profile: profileMap[m.user_id] || { name: null, avatar_url: null },
      }));
    },
    enabled: !!id,
  });

  // Get current user's rival
  const { data: myMembership } = useQuery({
    queryKey: ["my-membership", id, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("pool_members")
        .select("*")
        .eq("pool_id", id!)
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!id && !!user,
  });

  const setRival = useMutation({
    mutationFn: async (rivalUserId: string | null) => {
      if (!user || !id) throw new Error("Not ready");
      const { error } = await supabase
        .from("pool_members")
        .update({ rival_user_id: rivalUserId })
        .eq("pool_id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-membership", id] });
      toast({ title: "Rivaal ingesteld! ⚔️" });
    },
  });

  // Enhanced leaderboard with today's points
  const { data: leaderboard } = useQuery({
    queryKey: ["leaderboard", id],
    queryFn: async () => {
      const { data: memberRows } = await supabase
        .from("pool_members")
        .select("user_id, role")
        .eq("pool_id", id!);
      if (!memberRows || memberRows.length === 0) return [];

      const userIds = memberRows.map((m) => m.user_id);

      const { data: preds } = await supabase
        .from("predictions")
        .select("user_id, points_awarded, match_id, matches(kickoff_utc)")
        .eq("pool_id", id!);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const userPoints: Record<string, number> = {};
      const userTodayPoints: Record<string, number> = {};
      userIds.forEach((uid) => { userPoints[uid] = 0; userTodayPoints[uid] = 0; });

      preds?.forEach((p: any) => {
        const pts = p.points_awarded || 0;
        userPoints[p.user_id] = (userPoints[p.user_id] || 0) + pts;
        const kickoff = p.matches?.kickoff_utc ? new Date(p.matches.kickoff_utc) : null;
        if (kickoff && kickoff >= todayStart) {
          userTodayPoints[p.user_id] = (userTodayPoints[p.user_id] || 0) + pts;
        }
      });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);

      const profileMap: Record<string, any> = {};
      profiles?.forEach((p: any) => { profileMap[p.user_id] = p; });

      const roleMap: Record<string, string> = {};
      memberRows.forEach((m) => { roleMap[m.user_id] = m.role; });

      return Object.entries(userPoints)
        .map(([userId, points]) => ({
          userId,
          name: profileMap[userId]?.name || "Onbekend",
          avatar_url: profileMap[userId]?.avatar_url || null,
          points,
          todayPoints: userTodayPoints[userId] || 0,
          role: roleMap[userId] || "member",
        }))
        .sort((a, b) => b.points - a.points) as LeaderboardEntry[];
    },
    enabled: !!id,
  });

  // Get user's predictions for badges & insights
  const { data: myPredictions } = useQuery({
    queryKey: ["my-pool-predictions", id, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("predictions")
        .select("home_pred, away_pred, points_awarded, match_id, matches(home_score, away_score, status, stage)")
        .eq("pool_id", id!)
        .eq("user_id", user.id);
      return data || [];
    },
    enabled: !!id && !!user,
  });

  const badges = useMemo(() => calculateBadges(myPredictions || []), [myPredictions]);

  const dailyWinner = useMemo(() => {
    if (!leaderboard) return null;
    return leaderboard.reduce<LeaderboardEntry | null>((top, entry) => {
      if (entry.todayPoints > 0 && (!top || entry.todayPoints > top.todayPoints)) return entry;
      return top;
    }, null);
  }, [leaderboard]);

  // Rival data
  const rivalEntry = useMemo(() => {
    if (!myMembership?.rival_user_id || !leaderboard) return null;
    return leaderboard.find((e) => e.userId === myMembership.rival_user_id) || null;
  }, [myMembership, leaderboard]);

  const myEntry = useMemo(() => {
    if (!user || !leaderboard) return null;
    return leaderboard.find((e) => e.userId === user.id) || null;
  }, [user, leaderboard]);

  // Track rank changes for notifications
  const myPosition = useMemo(() => {
    if (!user || !leaderboard) return null;
    const idx = leaderboard.findIndex((e) => e.userId === user.id);
    return idx >= 0 ? idx + 1 : null;
  }, [user, leaderboard]);

  // Detect rank changes
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

  const [showRivalPicker, setShowRivalPicker] = useState(false);

  const appOrigin = import.meta.env.PROD ? "https://goaltje-world-cup-ai.lovable.app" : window.location.origin;
  const poolLink = `${appOrigin}/join/${pool?.invite_code}`;
  const shareText = `Doe mee met mijn WK 2026 poule "${pool?.name}" op Goaltje! 🏆⚽\n\nCode: ${pool?.invite_code}\n${poolLink}`;

  const copyLink = () => { navigator.clipboard.writeText(poolLink); toast({ title: "Link gekopieerd! 📋" }); };
  const copyCode = () => { if (pool?.invite_code) { navigator.clipboard.writeText(pool.invite_code); toast({ title: "Code gekopieerd! 📋" }); } };
  const shareWhatsApp = () => { window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank"); };
  const shareNative = async () => {
    if (navigator.share) { try { await navigator.share({ title: `Goaltje - ${pool?.name}`, text: shareText, url: poolLink }); } catch {} }
    else { copyLink(); }
  };

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 rounded-xl" />
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

  const getRankStyle = (i: number) => {
    if (i === 0) return "shadow-glow-gold ring-1 ring-secondary/30";
    if (i === 1) return "ring-1 ring-muted-foreground/20";
    if (i === 2) return "ring-1 ring-warning/20";
    return "";
  };

  const getRankBadge = (i: number) => {
    if (i === 0) return "🥇";
    if (i === 1) return "🥈";
    if (i === 2) return "🥉";
    return `${i + 1}`;
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-4 space-y-4">
      {/* Live Mode Overlays */}
      <GoalCelebration visible={showGoal} onComplete={hideGoal} />
      <LiveRankNotification
        visible={rankNotification.visible}
        direction={rankNotification.direction}
        newPosition={rankNotification.newPosition}
        passedName={rankNotification.passedName}
        onComplete={() => setRankNotification((s) => ({ ...s, visible: false }))}
      />

      <Link to="/pool" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
        <ArrowLeft className="h-4 w-4" /> Terug
      </Link>

      {/* Pool Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-elevation-3 overflow-hidden">
          <div className="gradient-primary p-1" />
          <CardContent className="p-6 text-center space-y-4">
            <h1 className="text-2xl font-bold font-display">{pool.name}</h1>
            {pool.description && <p className="text-sm text-muted-foreground">{pool.description}</p>}
            {pool.prize_text && (
              <div className="bg-secondary/10 rounded-xl p-3">
                <p className="text-xs text-muted-foreground">🏆 Prijs</p>
                <p className="font-semibold text-secondary text-sm">{pool.prize_text}</p>
              </div>
            )}
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                <code className="text-2xl font-mono font-bold tracking-widest text-primary">{pool.invite_code}</code>
                <Button size="icon" variant="ghost" onClick={copyCode}><Copy className="h-4 w-4" /></Button>
              </div>
              <div className="flex justify-center">
                <div className="bg-white p-2 rounded-lg"><QRCodeSVG value={poolLink} size={120} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-11 gap-2" onClick={shareWhatsApp}><MessageCircle className="h-4 w-4 text-primary" /> WhatsApp</Button>
                <Button variant="outline" className="h-11 gap-2" onClick={copyLink}><Link2 className="h-4 w-4" /> Kopieer link</Button>
              </div>
              <Button variant="outline" className="w-full h-11 gap-2" onClick={shareNative}><Share2 className="h-4 w-4" /> Delen...</Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Rival Banner */}
      {myEntry && rivalEntry && (
        <div className="relative">
          <RivalBanner
            myName={myEntry.name}
            myPoints={myEntry.points}
            rivalName={rivalEntry.name}
            rivalPoints={rivalEntry.points}
          />
          <button
            onClick={() => setRival.mutate(null)}
            className="absolute top-2 right-2 h-6 w-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Set Rival button (if no rival set) */}
      {user && myEntry && !rivalEntry && !showRivalPicker && leaderboard && leaderboard.length > 1 && (
        <Button
          variant="outline"
          className="w-full gap-2 h-10 border-dashed"
          onClick={() => setShowRivalPicker(true)}
        >
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
                <button onClick={() => setShowRivalPicker(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {leaderboard.filter((e) => e.userId !== user?.id).map((entry) => (
                <button
                  key={entry.userId}
                  onClick={() => { setRival.mutate(entry.userId); setShowRivalPicker(false); }}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold overflow-hidden">
                    {entry.avatar_url ? (
                      <img src={entry.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : entry.name[0]?.toUpperCase() || "?"}
                  </div>
                  <span className="text-sm font-medium flex-1">{entry.name}</span>
                  <span className="text-xs text-muted-foreground">{entry.points} pt</span>
                </button>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Daily Winner Banner */}
      {dailyWinner && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
        >
          <Card className="border-0 shadow-glow-gold overflow-hidden">
            <div className="bg-gradient-to-r from-secondary via-secondary to-warning p-[1px]" />
            <CardContent className="p-4 flex items-center gap-3">
              <motion.div animate={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 0.5, delay: 0.5 }}>
                <Crown className="h-8 w-8 text-secondary" />
              </motion.div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium">🥇 Dagwinnaar</p>
                <p className="font-bold font-display text-sm">
                  {dailyWinner.name}
                  {dailyWinner.userId === user?.id && <span className="text-primary ml-1">(jij!)</span>}
                </p>
              </div>
              <motion.div className="text-right" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: "spring", stiffness: 400 }}>
                <span className="text-xl font-bold font-display text-secondary">+{dailyWinner.todayPoints}</span>
                <p className="text-[10px] text-muted-foreground">punten vandaag</p>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="leaderboard" className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="leaderboard" className="text-xs">🏆 Rang</TabsTrigger>
          <TabsTrigger value="badges" className="text-xs">🎖️ Badges</TabsTrigger>
          <TabsTrigger value="insights" className="text-xs">🧠 Insights</TabsTrigger>
          <TabsTrigger value="members" className="text-xs">👥 Leden</TabsTrigger>
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
                    key={entry.userId}
                    layout
                    layoutId={entry.userId}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, layout: { type: "spring", stiffness: 300, damping: 30 } }}
                  >
                    <Card className={cn(
                      "border-0 transition-all duration-300",
                      isMe ? "shadow-glow-primary ring-1 ring-primary/20" : "shadow-elevation-1",
                      isRival && "ring-1 ring-destructive/20",
                      getRankStyle(i),
                    )}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "text-lg font-bold font-display w-8 text-center shrink-0",
                            i === 0 && "text-secondary",
                            i === 1 && "text-muted-foreground",
                            i === 2 && "text-warning",
                            i > 2 && "text-muted-foreground",
                          )}>
                            {getRankBadge(i)}
                          </span>

                          <div className={cn(
                            "h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden shrink-0",
                            i === 0 ? "ring-2 ring-secondary/40 bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
                          )}>
                            {entry.avatar_url ? (
                              <img src={entry.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : entry.name[0]?.toUpperCase() || "?"}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {entry.name}
                              {isMe && <span className="text-primary ml-1">(jij)</span>}
                              {isRival && <span className="text-destructive ml-1">⚔️</span>}
                              {entry.role === "admin" && <span className="ml-1">👑</span>}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              {i > 0 && pointsAbove > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <TrendingUp className="h-2.5 w-2.5" />
                                  {pointsAbove} achter #{i}
                                </span>
                              )}
                              {i < leaderboard.length - 1 && pointsBelow > 0 && (
                                <span className="flex items-center gap-0.5">
                                  +{pointsBelow} voor #{i + 2}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={cn(
                              "font-bold text-lg font-display",
                              i === 0 ? "text-secondary" : "text-primary"
                            )}>
                              {entry.points}
                            </span>
                            <span className="text-xs text-muted-foreground ml-0.5">pt</span>
                            {entry.todayPoints > 0 && (
                              <motion.div
                                className="flex items-center justify-end gap-0.5 text-xs font-semibold text-success"
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + i * 0.05 }}
                              >
                                <TrendingUp className="h-3 w-3" />
                                +{entry.todayPoints}
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
                    {member.profile?.avatar_url ? (
                      <img src={member.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (member.profile?.name || "?")[0].toUpperCase()}
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
