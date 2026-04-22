import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { PoolSelector } from "@/components/PoolSelector";
import { MatchCard } from "@/components/MatchCard";
import { GoalCelebration, useGoalCelebration } from "@/components/GoalCelebration";
import { useRealtimeMatches, useRealtimePredictions } from "@/hooks/useRealtimeMatches";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import { motion } from "framer-motion";
import { PredictionReminderBanner } from "@/components/PredictionReminderBanner";
import { getPredictionState, isMissingToday } from "@/lib/predictionStatus";
import { Calendar, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

type Tab = "aankomend" | "uitslagen";

function getWeekLabel(date: Date): string {
  const now = new Date();
  const startOfWeek = (d: Date) => {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.getFullYear(), d.getMonth(), diff);
  };
  const thisMonday = startOfWeek(now);
  const matchMonday = startOfWeek(date);
  const diffWeeks = Math.round(
    (thisMonday.getTime() - matchMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  if (diffWeeks === 0) return "Deze week";
  if (diffWeeks === 1) return "Vorige week";
  return `${diffWeeks} weken geleden`;
}

function getDateLabel(date: Date): string {
  return date.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Amsterdam",
  });
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Matches() {
  const { user } = useAuth();
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("aankomend");
  const [visibleResults, setVisibleResults] = useState(20);
  const { showGoal, triggerGoal, hideGoal } = useGoalCelebration();

  useRealtimeMatches((_matchId, _team) => triggerGoal());
  useRealtimePredictions();

  const { data: matches, isLoading } = useQuery({
    queryKey: queryKeys.allMatches(),
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select(
          "id, kickoff_utc, status, stage, group, venue, home_score, away_score, prediction_deadline_utc, external_id, home_team:teams!matches_home_team_id_fkey(id, name, short_name, flag_url), away_team:teams!matches_away_team_id_fkey(id, name, short_name, flag_url)"
        )
        .order("kickoff_utc", { ascending: true });
      return data || [];
    },
    staleTime: staleTimes.matches,
  });

  const { data: pools } = useQuery({
    queryKey: queryKeys.myPools(user?.id || ""),
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("pool_members")
        .select("pool_id, pools(id, name)")
        .eq("user_id", user.id);
      return data?.map((row: any) => row.pools).filter(Boolean) || [];
    },
    enabled: !!user,
    staleTime: staleTimes.pools,
  });

  const activePoolId = selectedPoolId || pools?.[0]?.id || "";

  const matchIds = matches?.map((m: any) => m.id) || [];
  const { data: myPredictions } = useQuery({
    queryKey: queryKeys.matchPredictions(user?.id || "", activePoolId),
    queryFn: async () => {
      if (!user || !activePoolId) return [];
      const { data } = await supabase
        .from("predictions")
        .select("match_id, home_pred, away_pred, points_awarded, pool_id")
        .eq("user_id", user.id)
        .eq("pool_id", activePoolId);
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

  const missingTodayMatches = useMemo(
    () =>
      (matches || []).filter((match: any) =>
        isMissingToday(match, predictionMap.get(match.id))
      ),
    [matches, predictionMap]
  );

  const missedMatches = useMemo(
    () =>
      (matches || []).filter(
        (match: any) =>
          getPredictionState(match, predictionMap.get(match.id)) === "missed"
      ),
    [matches, predictionMap]
  );

  // Split: aankomend (live + scheduled), uitslagen (finished)
  const aankomendMatches = useMemo(
    () => (matches || []).filter((m: any) => m.status !== "finished"),
    [matches]
  );

  const finishedMatches = useMemo(
    () =>
      (matches || [])
        .filter((m: any) => m.status === "finished")
        .sort(
          (a: any, b: any) =>
            new Date(b.kickoff_utc).getTime() -
            new Date(a.kickoff_utc).getTime()
        ),
    [matches]
  );

  // Group finished matches by week, then by day
  const groupedUitslagen = useMemo(() => {
    const weekMap = new Map<string, Map<string, any[]>>();
    finishedMatches.slice(0, visibleResults).forEach((m: any) => {
      const d = new Date(m.kickoff_utc);
      const weekLabel = getWeekLabel(d);
      const dayLabel = capitalize(getDateLabel(d));
      if (!weekMap.has(weekLabel)) weekMap.set(weekLabel, new Map());
      const dayMap = weekMap.get(weekLabel)!;
      if (!dayMap.has(dayLabel)) dayMap.set(dayLabel, []);
      dayMap.get(dayLabel)!.push(m);
    });
    return weekMap;
  }, [finishedMatches, visibleResults]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    {
      key: "aankomend",
      label: "Schema",
      icon: <Calendar className="h-4 w-4" />,
      count: aankomendMatches.length,
    },
    {
      key: "uitslagen",
      label: "Uitslagen",
      icon: <Trophy className="h-4 w-4" />,
      count: finishedMatches.length,
    },
  ];

  // MatchSections-like rendering for aankomend tab
  const now = new Date();
  const isSameDay = (d1: Date, d2: Date) =>
    d1.toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam" }) ===
    d2.toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam" });

  const { todayMatches, upcomingMatches } = useMemo(() => {
    const today: any[] = [];
    const upcoming: any[] = [];
    aankomendMatches.forEach((m: any) => {
      const kickoff = new Date(m.kickoff_utc);
      if (m.status === "live" || isSameDay(kickoff, now)) {
        today.push(m);
      } else {
        upcoming.push(m);
      }
    });
    return { todayMatches: today, upcomingMatches: upcoming };
  }, [aankomendMatches]);

  // Group upcoming by date
  const groupedUpcoming = useMemo(() => {
    const dayMap = new Map<string, any[]>();
    upcomingMatches.forEach((m: any) => {
      const label = capitalize(getDateLabel(new Date(m.kickoff_utc)));
      if (!dayMap.has(label)) dayMap.set(label, []);
      dayMap.get(label)!.push(m);
    });
    return dayMap;
  }, [upcomingMatches]);

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-4 space-y-4">
      <GoalCelebration visible={showGoal} onComplete={hideGoal} />

      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold font-display">Wedstrijden</h1>
      </motion.div>

      {/* Pool Selector + Rang knop */}
      {user && (
        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <PoolSelector value={selectedPoolId} onChange={setSelectedPoolId} />
          </div>
          {activePoolId && (
            <Link to={`/app/pool/${activePoolId}/ranking`}>
              <button className="flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap">
                <Trophy className="h-4 w-4" />
                Rang
              </button>
            </Link>
          )}
        </div>
      )}

      {user && activePoolId && (
        <PredictionReminderBanner
          missingTodayMatches={missingTodayMatches}
          missedMatches={missedMatches}
        />
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.key
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.icon}
            {tab.label}
            <span
              className={cn(
                "text-[10px] font-mono px-1.5 py-0.5 rounded-full",
                activeTab === tab.key
                  ? "bg-primary/10 text-primary"
                  : "bg-muted-foreground/10 text-muted-foreground"
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {/* ── AANKOMEND TAB ── */}
          {activeTab === "aankomend" && (
            <motion.div
              key="aankomend"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* Today / Live */}
              {todayMatches.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <h3 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                      🔵 Vandaag ({todayMatches.length})
                    </h3>
                  </div>
                  {todayMatches.map((match: any, i: number) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      prediction={predictionMap.get(match.id)}
                      index={i}
                      poolTopScore={poolTopScores?.[match.id] ?? null}
                    />
                  ))}
                </div>
              )}

              {/* Upcoming grouped by date */}
              {groupedUpcoming.size > 0 ? (
                Array.from(groupedUpcoming.entries()).map(([dayLabel, dayMatches]) => (
                  <div key={dayLabel} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-secondary" />
                      <h3 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                        🟡 {dayLabel}
                      </h3>
                    </div>
                    {dayMatches.map((match: any, i: number) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        prediction={predictionMap.get(match.id)}
                        index={i}
                        poolTopScore={poolTopScores?.[match.id] ?? null}
                      />
                    ))}
                  </div>
                ))
              ) : todayMatches.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  Geen aankomende wedstrijden
                </div>
              ) : null}
            </motion.div>
          )}

          {/* ── UITSLAGEN TAB ── */}
          {activeTab === "uitslagen" && (
            <motion.div
              key="uitslagen"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {finishedMatches.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  Nog geen wedstrijden gespeeld
                </div>
              ) : (
                <>
                  {Array.from(groupedUitslagen.entries()).map(([weekLabel, dayMap]) => (
                    <div key={weekLabel} className="space-y-4">
                      {/* Week header */}
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-2">
                          {weekLabel}
                        </span>
                        <div className="h-px flex-1 bg-border" />
                      </div>

                      {/* Days within this week */}
                      {Array.from(dayMap.entries()).map(([dayLabel, dayMatches]) => (
                        <div key={dayLabel} className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground/70 pl-1">
                            {dayLabel}
                          </p>
                          {dayMatches.map((match: any, i: number) => (
                            <MatchCard
                              key={match.id}
                              match={match}
                              prediction={predictionMap.get(match.id)}
                              index={i}
                              compact
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}

                  {/* Load more */}
                  {visibleResults < finishedMatches.length && (
                    <button
                      onClick={() => setVisibleResults((v) => v + 20)}
                      className="w-full py-2.5 rounded-xl border border-dashed text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Meer laden ({finishedMatches.length - visibleResults} over)
                    </button>
                  )}
                </>
              )}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
