import { useParams, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Trophy, Search, Swords } from "lucide-react";
import { motion } from "framer-motion";
import { VirtualizedLeaderboard, UserBadge } from "@/components/VirtualizedLeaderboard";
import { TiebreakerInfo } from "@/components/TiebreakerInfo";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";

type FilterMode = "neighborhood" | "top10" | "top50" | "all" | "streaks";

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

export default function PoolRanking() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("neighborhood");

  const { data: pool } = useQuery({
    queryKey: ["pool", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("pools").select("id, name").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
    staleTime: staleTimes.pools,
  });

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: queryKeys.leaderboard(id || ""),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_pool_leaderboard", { _pool_id: id! });
      if (error) throw error;
      const entries = (data as unknown as LeaderboardEntry[]) || [];
      const { data: bonuses } = await supabase
        .from("pool_members").select("user_id, early_bird_bonus").eq("pool_id", id!).gt("early_bird_bonus", 0);
      if (bonuses && bonuses.length > 0) {
        const bonusMap = new Map(bonuses.map((b: any) => [b.user_id, b.early_bird_bonus || 0]));
        for (const entry of entries) {
          const bonus = bonusMap.get(entry.userId) || 0;
          if (bonus > 0) { entry.points += bonus; }
        }
        entries.sort((a, b) => b.points - a.points || b.exactCount - a.exactCount);
      }
      return entries;
    },
    enabled: !!id,
    staleTime: staleTimes.leaderboard,
  });

  const { data: recentMatches } = useQuery({
    queryKey: ["pool-recent-matches", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("id, kickoff_utc, home_score, away_score, stage, home_team:teams!matches_home_team_id_fkey(short_name, flag_url), away_team:teams!matches_away_team_id_fkey(short_name, flag_url)")
        .eq("status", "finished")
        .order("kickoff_utc", { ascending: false })
        .limit(8);
      return data || [];
    },
    enabled: !!id,
    staleTime: staleTimes.matches,
  });

  // Badges per user (streak + profiel-emoji)
  const { data: badgesRaw } = useQuery({
    queryKey: queryKeys.poolLeaderboardBadges(id || ""),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_pool_leaderboard_badges", { _pool_id: id! });
      if (error) throw error;
      return (data as unknown as Array<UserBadge & { userId: string }>) || [];
    },
    enabled: !!id,
    staleTime: staleTimes.leaderboard,
  });

  const badgesByUser = useMemo(() => {
    if (!badgesRaw) return null;
    const map = new Map<string, UserBadge>();
    badgesRaw.forEach((b) => map.set(b.userId, { streak: b.streak, profileType: b.profileType, profileEmoji: b.profileEmoji }));
    return map;
  }, [badgesRaw]);

  const myEntry = useMemo(() => leaderboard?.find(e => e.userId === user?.id), [leaderboard, user]);
  const myPosition = useMemo(() => {
    if (!leaderboard || !user) return null;
    const idx = leaderboard.findIndex(e => e.userId === user.id);
    return idx >= 0 ? idx + 1 : null;
  }, [leaderboard, user]);

  // Rivaal: dichtstbijzijnde speler in punten (boven of onder jou), skip als je nr 1 bent en geen #2 exists
  const rival = useMemo(() => {
    if (!leaderboard || !myEntry || !myPosition) return null;
    const idx = myPosition - 1;
    const above = idx > 0 ? leaderboard[idx - 1] : null;
    const below = idx < leaderboard.length - 1 ? leaderboard[idx + 1] : null;
    if (!above && !below) return null;
    if (!above) return below;
    if (!below) return above;
    const deltaAbove = above.points - myEntry.points;
    const deltaBelow = myEntry.points - below.points;
    return deltaAbove <= deltaBelow ? above : below;
  }, [leaderboard, myEntry, myPosition]);

  // Gefilterde lijst
  const filteredLeaderboard = useMemo(() => {
    if (!leaderboard) return [];
    const q = searchQuery.trim().toLowerCase();
    let entries = leaderboard;

    // Tekst-zoek heeft voorrang over filter-mode
    if (q.length > 0) {
      return entries.filter(e => e.name.toLowerCase().includes(q));
    }

    if (filterMode === "top10") return entries.slice(0, 10);
    if (filterMode === "top50") return entries.slice(0, 50);
    if (filterMode === "streaks") {
      if (!badgesByUser) return entries;
      return entries.filter(e => (badgesByUser.get(e.userId)?.streak ?? 0) >= 2);
    }
    if (filterMode === "neighborhood" && myPosition) {
      const idx = myPosition - 1;
      const start = Math.max(0, idx - 5);
      const end = Math.min(entries.length, idx + 6);
      return entries.slice(start, end);
    }
    return entries;
  }, [leaderboard, searchQuery, filterMode, myPosition, badgesByUser]);

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/app/pool/${id}`)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold font-display truncate">🏆 Ranglijst</h1>
          {pool && <p className="text-xs text-muted-foreground truncate">{pool.name}</p>}
        </div>
        {leaderboard && (
          <span className="text-xs text-muted-foreground">{leaderboard.length} deelnemers</span>
        )}
      </div>

      {/* Mijn positie */}
      {myEntry && myPosition && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 shadow-glow-primary overflow-hidden">
            <div className="bg-gradient-to-r from-primary/30 to-transparent h-0.5" />
            <CardContent className="p-3 flex items-center gap-3">
              <span className="text-2xl font-bold font-display text-primary w-10 text-center">#{myPosition}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{myEntry.name} <span className="text-primary text-xs">(jij)</span></p>
                <p className="text-xs text-muted-foreground">{myPosition === 1 ? "🥇 Leider!" : `${leaderboard![myPosition - 2]?.points - myEntry.points} pt achter #${myPosition - 1}`}</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold font-display text-primary">{myEntry.points}</span>
                <span className="text-xs text-muted-foreground ml-0.5">pt</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Recente wedstrijden */}
      {recentMatches && recentMatches.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recente uitslagen</h2>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {recentMatches.map((m: any) => (
              <div key={m.id} className="flex-shrink-0 bg-muted/60 rounded-xl px-3 py-2 text-center min-w-[110px]">
                <div className="flex items-center gap-1.5 justify-center">
                  <span className="text-sm">{m.home_team?.flag_url}</span>
                  <span className="font-bold text-sm">{m.home_score}</span>
                  <span className="text-xs text-muted-foreground">–</span>
                  <span className="font-bold text-sm">{m.away_score}</span>
                  <span className="text-sm">{m.away_team?.flag_url}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  {m.home_team?.short_name} vs {m.away_team?.short_name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zoek + filter — zichtbaar vanaf 3 leden */}
      {leaderboard && leaderboard.length >= 3 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-muted/60 rounded-xl px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Zoek deelnemer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none flex-1 text-sm"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {(["neighborhood", "top10", "top50", "all", "streaks"] as FilterMode[]).map((mode) => {
              const labels: Record<FilterMode, string> = {
                neighborhood: myPosition ? "Mijn buurt (±5)" : "Mijn buurt",
                top10: "Top 10",
                top50: "Top 50",
                all: `Alles (${leaderboard.length})`,
                streaks: "🔥 Streaks",
              };
              const active = filterMode === mode && searchQuery.length === 0;
              return (
                <button
                  key={mode}
                  onClick={() => { setFilterMode(mode); setSearchQuery(""); }}
                  className={cn(
                    "text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {labels[mode]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Ranglijst */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Klassement
            {filteredLeaderboard.length !== leaderboard?.length && leaderboard && (
              <span className="ml-2 text-[10px] normal-case text-muted-foreground/70">
                ({filteredLeaderboard.length} van {leaderboard.length})
              </span>
            )}
          </h2>
          <TiebreakerInfo />
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        )}

        {!isLoading && leaderboard && leaderboard.length > 0 && filteredLeaderboard.length > 0 && (
          <VirtualizedLeaderboard
            leaderboard={filteredLeaderboard}
            currentUserId={user?.id}
            rivalUserId={rival?.userId}
            badgesByUser={badgesByUser}
          />
        )}

        {!isLoading && leaderboard && leaderboard.length > 0 && filteredLeaderboard.length === 0 && (
          <Card className="border-0 shadow-elevation-1">
            <CardContent className="p-6 text-center text-muted-foreground text-sm">
              Geen resultaten voor "{searchQuery}" of filter
            </CardContent>
          </Card>
        )}

        {!isLoading && (!leaderboard || leaderboard.length === 0) && (
          <Card className="border-0 shadow-elevation-1">
            <CardContent className="p-6 text-center text-muted-foreground text-sm">
              Nog geen deelnemers. Nodig vrienden uit! ⚽
            </CardContent>
          </Card>
        )}
      </div>

      {/* Rivaal kaart — dichtstbijzijnde speler in punten */}
      {rival && myEntry && searchQuery.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-0 shadow-elevation-2 overflow-hidden">
            <div className="gradient-navy px-4 py-2 flex items-center gap-2 text-white">
              <Swords className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold">Jouw rivaal</span>
            </div>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center font-bold text-destructive shrink-0">
                {rival.avatar_url
                  ? <img src={rival.avatar_url} alt="" className="h-full w-full object-cover rounded-full" />
                  : rival.name[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{rival.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {Math.abs(rival.points - myEntry.points)} pt{" "}
                  {rival.points > myEntry.points ? "boven" : "onder"} jou
                </p>
              </div>
              <span className="text-sm font-bold text-muted-foreground tabular-nums shrink-0">
                {rival.points}pt
              </span>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
