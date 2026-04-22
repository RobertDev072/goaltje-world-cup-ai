import { useParams, Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatNLDateTime } from "@/lib/timezone";
import { calculatePoints, explainPoints, DEFAULT_RULES, STATUS_CONFIG, type MatchStatus, isPredictionAllowed, isMatchCounted, type ScoringRules } from "@/lib/scoring";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Lock, Check, Swords, Trophy } from "lucide-react";
import { CountdownTimer } from "@/components/CountdownTimer";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { trackFirstPrediction } from "@/lib/analytics";
import { ExactScoreConfetti, useExactScoreConfetti } from "@/components/ExactScoreConfetti";
import { PoolConsensus } from "@/components/PoolConsensus";
import { MatchTrackrecord } from "@/components/MatchTrackrecord";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import { getPredictionState } from "@/lib/predictionStatus";


export default function MatchDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saveLabel, setSaveLabel] = useState<"default" | "saving" | "saved">("default");
  const [selectedPoolId, setSelectedPoolId] = useState<string>("");
  const [homePred, setHomePred] = useState<string | null>(null);
  const [awayPred, setAwayPred] = useState<string | null>(null);

  const { data: match, isLoading } = useQuery({
    queryKey: queryKeys.matchDetail(id!),
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("id, kickoff_utc, status, stage, group, venue, home_score, away_score, prediction_deadline_utc, home_team:teams!matches_home_team_id_fkey(id, name, short_name, flag_url), away_team:teams!matches_away_team_id_fkey(id, name, short_name, flag_url)")
        .eq("id", id!)
        .single();
      return data;
    },
    enabled: !!id,
    staleTime: staleTimes.matches,
  });

  const { data: events } = useQuery({
    queryKey: ["match-events", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("match_events")
        .select("id, minute, type, player_name, team:teams(short_name)")
        .eq("match_id", id!)
        .order("minute", { ascending: true });
      return data || [];
    },
    enabled: !!id,
    staleTime: staleTimes.matches,
  });

  // Get user's pools
  const { data: myPools } = useQuery({
    queryKey: queryKeys.myPools(user?.id || ""),
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("pool_members")
        .select("pool_id, pools(id, name, scoring_rules_json)")
        .eq("user_id", user.id);
      return data?.map((m: any) => m.pools).filter(Boolean) || [];
    },
    enabled: !!user,
    staleTime: staleTimes.pools,
  });

  // Derive activePool early so we can use it in the query key
  const activePool = selectedPoolId || (myPools && myPools.length > 0 ? myPools[0].id : "");

  // Derive scoring rules from the active pool (falls back to defaults)
  const poolRules: ScoringRules = useMemo(() => {
    const activePoolData = myPools?.find((p: any) => p.id === activePool);
    const custom = activePoolData?.scoring_rules_json as Partial<ScoringRules> | null;
    if (!custom) return DEFAULT_RULES;
    return { ...DEFAULT_RULES, ...custom };
  }, [myPools, activePool]);

  // Get prediction for this match for the ACTIVE pool only
  const { data: prediction } = useQuery({
    queryKey: queryKeys.myPredictions(id!, user?.id || "", activePool),
    queryFn: async () => {
      if (!user || !activePool) return null;
      const { data } = await supabase
        .from("predictions")
        .select("id, match_id, pool_id, user_id, home_pred, away_pred, points_awarded")
        .eq("match_id", id!)
        .eq("user_id", user.id)
        .eq("pool_id", activePool)
        .maybeSingle();
      return data || null;
    },
    enabled: !!user && !!id && !!activePool,
    staleTime: staleTimes.predictions,
  });

  const existingPred = prediction;

  const isLocked = useMemo(() => {
    if (!match) return true;
    return !isPredictionAllowed(match.status, match.prediction_deadline_utc);
  }, [match]);

  const showPredictionForm = useMemo(() => {
    if (!match) return false;
    return !['live', 'finished', 'cancelled', 'void'].includes(match.status);
  }, [match]);

  const displayHomePred = homePred !== null ? homePred : (existingPred?.home_pred != null ? String(existingPred.home_pred) : "");
  const displayAwayPred = awayPred !== null ? awayPred : (existingPred?.away_pred != null ? String(existingPred.away_pred) : "");
  const predictionState = match ? getPredictionState(match, existingPred) : "open";

  const savePrediction = useMutation({
    mutationFn: async () => {
      if (!user || !activePool) throw new Error("Niet ingelogd of geen poule geselecteerd");
      if (isLocked) throw new Error("Wedstrijd is al begonnen!");
      const hp = parseInt(displayHomePred);
      const ap = parseInt(displayAwayPred);
      if (isNaN(hp) || isNaN(ap) || hp < 0 || ap < 0) throw new Error("Vul geldige scores in");

      if (existingPred) {
        const { error } = await supabase
          .from("predictions")
          .update({ home_pred: hp, away_pred: ap, updated_at: new Date().toISOString() })
          .eq("id", existingPred.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("predictions")
          .insert({
            pool_id: activePool,
            user_id: user.id,
            match_id: id!,
            home_pred: hp,
            away_pred: ap,
          });
        if (error) {
          if (error.code === "23505") throw new Error("Voorspelling bestaat al voor deze poule");
          throw error;
        }
      }
      return { hp, ap };
    },
    onMutate: async () => {
      setSaveLabel("saving");
      const hp = parseInt(displayHomePred);
      const ap = parseInt(displayAwayPred);
      if (isNaN(hp) || isNaN(ap)) return {};

      const userId = user?.id || "";
      const myPredKey = queryKeys.myPredictions(id!, userId, activePool);

      // Cancel outgoing refetches
      await Promise.all([
        queryClient.cancelQueries({ queryKey: myPredKey }),
        queryClient.cancelQueries({ queryKey: queryKeys.allHomePredictions() }),
        queryClient.cancelQueries({ queryKey: queryKeys.allMatchPredictions() }),
      ]);

      // Snapshot for rollback
      const prevMyPred = queryClient.getQueryData(myPredKey);

      // 1. Optimistic update for this pool's prediction
      queryClient.setQueryData(myPredKey, (old: any) => {
        if (old) return { ...old, home_pred: hp, away_pred: ap };
        return { match_id: id, pool_id: activePool, user_id: userId, home_pred: hp, away_pred: ap, points_awarded: null };
      });

      const predUpdate = { match_id: id, pool_id: activePool, user_id: userId, home_pred: hp, away_pred: ap, points_awarded: null };

      // 2. Update ALL home-predictions caches
      queryClient.setQueriesData({ queryKey: queryKeys.allHomePredictions() }, (old: any[] | undefined) => {
        if (!old) return old;
        const idx = old.findIndex((p: any) => p.match_id === id && p.pool_id === activePool);
        if (idx >= 0) {
          const copy = [...old];
          copy[idx] = { ...copy[idx], home_pred: hp, away_pred: ap };
          return copy;
        }
        return [...old, predUpdate];
      });

      // 3. Update ALL match-predictions caches
      queryClient.setQueriesData({ queryKey: queryKeys.allMatchPredictions() }, (old: any[] | undefined) => {
        if (!old) return old;
        const idx = old.findIndex((p: any) => p.match_id === id && p.pool_id === activePool);
        if (idx >= 0) {
          const copy = [...old];
          copy[idx] = { ...copy[idx], home_pred: hp, away_pred: ap };
          return copy;
        }
        return [...old, predUpdate];
      });

      return { prevMyPred, myPredKey };
    },
    onSuccess: (_data, _vars, context: any) => {
      if (!existingPred) trackFirstPrediction();
      setSaveLabel("saved");
      setTimeout(() => setSaveLabel("default"), 1200);
      toast({ title: "Opgeslagen ✓", description: "Je voorspelling is bijgewerkt." });

      // Background sync — targeted invalidation only
      if (context?.myPredKey) {
        queryClient.invalidateQueries({ queryKey: context.myPredKey });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.allHomePredictions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.allMatchPredictions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard(activePool) });
    },
    onError: (err: any, _vars, context: any) => {
      setSaveLabel("default");
      // Rollback
      if (context?.myPredKey && context?.prevMyPred !== undefined) {
        queryClient.setQueryData(context.myPredKey, context.prevMyPred);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.allHomePredictions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.allMatchPredictions() });
      toast({ title: "Fout", description: err.message, variant: "destructive" });
    },
  });

  // Calculate points if match is finished
  const pointsAwarded = useMemo(() => {
    if (!match || match.status !== "finished" || !existingPred) return null;
    return calculatePoints(
      existingPred.home_pred,
      existingPred.away_pred,
      match.home_score,
      match.away_score,
      poolRules,
    );
  }, [match, existingPred]);

  const showConfetti = useExactScoreConfetti(pointsAwarded, id);

  const buttonLabel = saveLabel === "saving" ? "Opslaan…" : saveLabel === "saved" ? "Opgeslagen ✓" : existingPred ? "Bijwerken" : "Opslaan";

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-6 text-center">
        <p className="text-muted-foreground">Wedstrijd niet gevonden</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-4 space-y-4">
      <ExactScoreConfetti trigger={showConfetti} />
      <Link to="/app/matches" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
        <ArrowLeft className="h-4 w-4" /> Terug
      </Link>

      {/* Score Card */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="border-0 shadow-xl overflow-hidden">
          <div className="gradient-primary p-1" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-muted-foreground">
                {match.stage === "group" ? `Groep ${match.group}` : match.stage}
              </span>
              {(() => {
                const si = STATUS_CONFIG[(match.status as MatchStatus) || 'scheduled'];
                const variant = match.status === 'live' ? 'destructive' as const : match.status === 'finished' ? 'secondary' as const : 'outline' as const;
                return (
                  <Badge variant={variant} className={match.status === 'live' ? 'live-pulse' : ''}>
                    {si.emoji} {si.label}
                  </Badge>
                );
              })()}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <p className="text-3xl mb-1">{match.home_team?.flag_url || "🏳️"}</p>
                <p className="font-semibold text-sm">{match.home_team?.name || "TBD"}</p>
              </div>
              <div className="text-center px-4">
                {match.home_score != null && match.away_score != null ? (
                  <p className="text-4xl font-bold font-display">
                    {match.home_score} - {match.away_score}
                  </p>
                ) : (
                  <p className="text-xl font-bold text-primary">VS</p>
                )}
              </div>
              <div className="text-center flex-1">
                <p className="text-3xl mb-1">{match.away_team?.flag_url || "🏳️"}</p>
                <p className="font-semibold text-sm">{match.away_team?.name || "TBD"}</p>
              </div>
            </div>

            <div className="text-center mt-4 space-y-1">
              <p className="text-xs text-muted-foreground">{formatNLDateTime(match.kickoff_utc)}</p>
              {match.venue && <p className="text-xs text-muted-foreground">📍 {match.venue}</p>}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Pool consensus — stemverdeling + top 3 uitslagen (verborgen bij <2 voorspellingen) */}
      {user && activePool && match.id && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <PoolConsensus
            poolId={activePool}
            matchId={match.id}
            homeShort={match.home_team?.short_name}
            awayShort={match.away_team?.short_name}
            userPrediction={existingPred ? { home_pred: existingPred.home_pred, away_pred: existingPred.away_pred } : null}
          />
        </motion.div>
      )}

      {/* No pools message */}
      {user && myPools && myPools.length === 0 && showPredictionForm && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-0 shadow-md bg-muted/30">
            <CardContent className="p-5 text-center space-y-3">
              <p className="text-sm text-muted-foreground">Je bent nog geen lid van een poule.</p>
              <Button asChild size="sm" variant="default">
                <a href="/app/pool">Poule aanmaken of joinen</a>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Prediction Section */}
      {user && myPools && myPools.length > 0 && (showPredictionForm || (isMatchCounted(match.status) && existingPred)) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-base">
                  {showPredictionForm ? "Jouw voorspelling" : "Jouw resultaat"}
                </h3>
                {isLocked && showPredictionForm && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Lock className="h-3 w-3" /> Gesloten
                  </Badge>
                )}
              </div>

              {/* Deadline countdown */}
              {showPredictionForm && !isLocked && match?.prediction_deadline_utc && (
                <CountdownTimer kickoffUtc={match.prediction_deadline_utc} />
              )}
              {/* Pool selector */}
              {myPools.length > 1 && (
                <Select value={activePool} onValueChange={(v) => { setSelectedPoolId(v); setHomePred(null); setAwayPred(null); }}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Kies poule" />
                  </SelectTrigger>
                  <SelectContent>
                    {myPools.map((pool: any) => (
                      <SelectItem key={pool.id} value={pool.id}>{pool.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {myPools.length === 1 && (
                <p className="text-xs text-muted-foreground">Poule: {myPools[0].name}</p>
              )}

              {/* Score inputs */}
              {showPredictionForm && (
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 text-center">
                      <p className="text-xs text-muted-foreground mb-1">{match.home_team?.short_name || "HOME"}</p>
                      <Input
                        type="number"
                        min={0}
                        max={20}
                        className="h-14 text-center text-2xl font-bold font-display"
                        value={displayHomePred}
                        onChange={(e) => setHomePred(e.target.value)}
                        disabled={isLocked}
                        placeholder="-"
                      />
                    </div>
                    <span className="text-xl font-bold text-muted-foreground mt-5">-</span>
                    <div className="flex-1 text-center">
                      <p className="text-xs text-muted-foreground mb-1">{match.away_team?.short_name || "AWAY"}</p>
                      <Input
                        type="number"
                        min={0}
                        max={20}
                        className="h-14 text-center text-2xl font-bold font-display"
                        value={displayAwayPred}
                        onChange={(e) => setAwayPred(e.target.value)}
                        disabled={isLocked}
                        placeholder="-"
                      />
                    </div>
                  </div>
                </>
              )}

              {showPredictionForm && !isLocked && (
                <Button
                  className={`w-full h-12 font-semibold transition-all ${
                    saveLabel === "saved"
                      ? "bg-emerald-600 text-white hover:bg-emerald-600"
                      : "gradient-primary text-primary-foreground"
                  }`}
                  onClick={() => savePrediction.mutate()}
                  disabled={savePrediction.isPending || saveLabel === "saved"}
                >
                  {saveLabel === "saved" && <Check className="h-4 w-4 mr-1.5" />}
                  {buttonLabel}
                </Button>
              )}

              {showPredictionForm && isLocked && (
                <div className="rounded-xl p-3 text-center bg-muted">
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Lock className="h-3 w-3" /> Voorspellingen zijn gesloten: deadline verstreken
                  </p>
                </div>
              )}

              {predictionState === "missed" && (
                <div className="rounded-xl p-3 text-center bg-destructive/10">
                  <p className="text-sm font-semibold text-destructive">Niet ingevuld</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Je had voor deze wedstrijd geen voorspelling opgeslagen. Deze telt daarom als 0 punten.
                  </p>
                </div>
              )}

              {/* Points result with explanation */}
              {isMatchCounted(match.status) && existingPred && (() => {
                const explanation = explainPoints(
                  existingPred.home_pred, existingPred.away_pred,
                  match.home_score, match.away_score
                );
                return (
                  <div className={`rounded-xl p-3 text-center ${explanation.points > 0 ? "bg-primary/10" : "bg-muted"}`}>
                    <p className="text-xs text-muted-foreground">Jouw voorspelling: {existingPred.home_pred} - {existingPred.away_pred}</p>
                    <p className="text-lg font-bold font-display mt-1">
                      {explanation.points > 0 ? "🎯" : "❌"} {explanation.points} punten
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{explanation.reason}</p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Match Events Timeline */}
      {events && events.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-5">
              <h3 className="font-display font-semibold text-base mb-3 flex items-center gap-2">
                <Swords className="h-4 w-4 text-primary" /> Wedstrijdverloop
              </h3>
              <div className="space-y-2">
                {events.map((event: any) => (
                  <div key={event.id} className="flex items-center gap-3 text-sm">
                    <span className="text-xs font-mono w-8 text-muted-foreground text-right shrink-0">
                      {event.minute}'
                    </span>
                    <span className="text-base">
                      {event.type === "goal" ? "⚽" : event.type === "yellow_card" ? "🟨" : event.type === "red_card" ? "🟥" : event.type === "substitution" ? "🔄" : "📋"}
                    </span>
                    <span className="truncate">
                      {event.player_name || event.type}
                      {event.team && (
                        <span className="text-muted-foreground ml-1">({event.team.short_name})</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Scoring Rules */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="border-0 shadow-md bg-muted/30">
          <CardContent className="p-4">
            <h4 className="font-display font-semibold text-xs mb-2 text-muted-foreground">Puntentelling</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-primary/10 rounded-lg p-2">
                <p className="text-lg font-bold font-display text-primary">{poolRules.exact}</p>
                <p className="text-[10px] text-muted-foreground">Exact</p>
              </div>
              <div className="bg-secondary/10 rounded-lg p-2">
                <p className="text-lg font-bold font-display text-secondary">{poolRules.goal_diff}</p>
                <p className="text-[10px] text-muted-foreground">Doelsaldo</p>
              </div>
              <div className="bg-accent/10 rounded-lg p-2">
                <p className="text-lg font-bold font-display text-accent">{poolRules.result}</p>
                <p className="text-[10px] text-muted-foreground">Uitslag</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Persoonlijk trackrecord (verbergt als gebruiker nog geen relevante historie heeft) */}
      {user && match.id && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <MatchTrackrecord
            userId={user.id}
            matchId={match.id}
            homeTeamName={match.home_team?.name}
            awayTeamName={match.away_team?.name}
          />
        </motion.div>
      )}

      {/* Ranglijst link */}
      {activePool && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Link to={`/app/pool/${activePool}/ranking`}>
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Trophy className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">Bekijk ranglijst</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {myPools?.find((p: any) => p.id === activePool)?.name || "Jouw poule"}
                  </p>
                </div>
                <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180 shrink-0" />
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      )}
    </div>
  );
}
