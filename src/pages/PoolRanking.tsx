import { useParams, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { VirtualizedLeaderboard } from "@/components/VirtualizedLeaderboard";
import { TiebreakerInfo } from "@/components/TiebreakerInfo";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";

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

  const myEntry = useMemo(() => leaderboard?.find(e => e.userId === user?.id), [leaderboard, user]);
  const myPosition = useMemo(() => {
    if (!leaderboard || !user) return null;
    const idx = leaderboard.findIndex(e => e.userId === user.id);
    return idx >= 0 ? idx + 1 : null;
  }, [leaderboard, user]);

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

      {/* Ranglijst */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Klassement</h2>
          <TiebreakerInfo />
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        )}

        {!isLoading && leaderboard && leaderboard.length > 0 && (
          <VirtualizedLeaderboard
            leaderboard={leaderboard}
            currentUserId={user?.id}
            rivalUserId={undefined}
          />
        )}

        {!isLoading && (!leaderboard || leaderboard.length === 0) && (
          <Card className="border-0 shadow-elevation-1">
            <CardContent className="p-6 text-center text-muted-foreground text-sm">
              Nog geen deelnemers. Nodig vrienden uit! ⚽
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
