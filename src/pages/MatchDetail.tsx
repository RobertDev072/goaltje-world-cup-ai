import { useParams, Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatNLDateTime } from "@/lib/timezone";
import { calculatePoints, explainPoints, DEFAULT_RULES, STATUS_CONFIG, type MatchStatus, isPredictionAllowed, isMatchCounted } from "@/lib/scoring";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Lock, Check, X, TrendingUp, Swords, Newspaper, Zap, Users, History, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { trackFirstPrediction } from "@/lib/analytics";

export default function MatchDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: match, isLoading } = useQuery({
    queryKey: ["match", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
        .eq("id", id!)
        .single();
      return data;
    },
    enabled: !!id,
  });

  const { data: events } = useQuery({
    queryKey: ["match-events", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("match_events")
        .select("*, team:teams(*)")
        .eq("match_id", id!)
        .order("minute", { ascending: true });
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch H2H & form stats from API-Football
  const { data: matchStats, isLoading: statsLoading } = useQuery({
    queryKey: ["match-stats", match?.home_team?.name, match?.away_team?.name],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("match-stats", {
        body: {
          homeTeamName: match!.home_team!.name,
          awayTeamName: match!.away_team!.name,
        },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!match?.home_team?.name && !!match?.away_team?.name,
    staleTime: 1000 * 60 * 60, // cache 1 hour
    retry: 1,
  });

  // Fetch match news/insights via AI
  const { data: matchNews, isLoading: newsLoading } = useQuery({
    queryKey: ["match-news", match?.home_team?.name, match?.away_team?.name],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("match-news", {
        body: {
          homeTeam: match!.home_team!.name,
          awayTeam: match!.away_team!.name,
          matchDate: match!.kickoff_utc,
          stage: match!.stage,
          group: match!.group,
        },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!match?.home_team?.name && !!match?.away_team?.name,
    staleTime: 1000 * 60 * 60 * 4, // cache 4 hours
    retry: 1,
  });

  // Get user's pools
  const { data: myPools } = useQuery({
    queryKey: ["my-pools", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("pool_members")
        .select("pool_id, pools(id, name, scoring_rules_json)")
        .eq("user_id", user.id);
      return data?.map((m: any) => m.pools).filter(Boolean) || [];
    },
    enabled: !!user,
  });

  // Get predictions for this match across all pools
  const { data: predictions } = useQuery({
    queryKey: ["my-predictions", id, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("predictions")
        .select("*")
        .eq("match_id", id!)
        .eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user && !!id,
  });

  const [selectedPoolId, setSelectedPoolId] = useState<string>("");
  const [homePred, setHomePred] = useState<string | null>(null);
  const [awayPred, setAwayPred] = useState<string | null>(null);

  // Set defaults when pools/predictions load
  const activePool = selectedPoolId || (myPools && myPools.length > 0 ? myPools[0].id : "");
  const existingPred = predictions?.find((p: any) => p.pool_id === activePool);

  const isLocked = useMemo(() => {
    if (!match) return true;
    return !isPredictionAllowed(match.status, (match as any).prediction_deadline_utc);
  }, [match]);

  // Show prediction form only when scheduled (not live/finished/cancelled etc.)
  const showPredictionForm = useMemo(() => {
    if (!match) return false;
    return !['live', 'finished', 'cancelled', 'void'].includes(match.status);
  }, [match]);

  // Compute display values: user edits take priority, otherwise show existing prediction
  const displayHomePred = homePred !== null ? homePred : (existingPred?.home_pred != null ? String(existingPred.home_pred) : "");
  const displayAwayPred = awayPred !== null ? awayPred : (existingPred?.away_pred != null ? String(existingPred.away_pred) : "");

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
    },
    onSuccess: () => {
      if (!existingPred) trackFirstPrediction();
      toast({ title: "Voorspelling opgeslagen! ✅" });
      // Invalidate all prediction-related queries so Home + other screens update
      queryClient.invalidateQueries({ queryKey: ["my-predictions"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-matches"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
    onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" }),
  });

  // Calculate points if match is finished
  const pointsAwarded = useMemo(() => {
    if (!match || match.status !== "finished" || !existingPred) return null;
    return calculatePoints(
      existingPred.home_pred,
      existingPred.away_pred,
      match.home_score,
      match.away_score,
    );
  }, [match, existingPred]);

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
      <Link to="/matches" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
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

              {/* Score inputs - only show when form is active */}
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
                  className="w-full h-12 gradient-primary text-primary-foreground font-semibold"
                  onClick={() => savePrediction.mutate()}
                  disabled={savePrediction.isPending}
                >
                  {savePrediction.isPending ? "Opslaan..." : existingPred ? "Bijwerken" : "Opslaan"}
                </Button>
              )}

              {showPredictionForm && isLocked && (
                <div className="rounded-xl p-3 text-center bg-muted">
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Lock className="h-3 w-3" /> Voorspellingen zijn gesloten: deadline verstreken
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
                      {explanation.points > 0 ? (
                        <span className="text-primary flex items-center justify-center gap-1">
                          <Check className="h-5 w-5" /> +{explanation.points} punten
                        </span>
                      ) : (
                        <span className="text-muted-foreground flex items-center justify-center gap-1">
                          <X className="h-5 w-5" /> 0 punten
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">{explanation.reason}</p>
                  </div>
                );
              })()}

              {/* Cancelled/void notice */}
              {(match.status === 'cancelled' || match.status === 'void') && (
                <div className="rounded-xl p-3 text-center bg-destructive/10">
                  <p className="text-xs text-destructive font-medium">
                    {STATUS_CONFIG[(match.status as MatchStatus)].emoji} Deze wedstrijd is {STATUS_CONFIG[(match.status as MatchStatus)].label.toLowerCase()} en telt niet mee voor het klassement.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Not logged in prompt */}
      {!user && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-5 text-center space-y-3">
            <p className="text-muted-foreground text-sm">Log in om voorspellingen te doen</p>
            <Link to="/auth">
              <Button className="gradient-primary text-primary-foreground">Inloggen</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Events */}
      {events && events.length > 0 && (
        <div>
          <h2 className="font-display font-semibold text-lg mb-3">Wedstrijdevents</h2>
          <div className="space-y-2">
            {events.map((event: any) => (
              <Card key={event.id} className="border-0 shadow-sm">
                <CardContent className="p-3 flex items-center gap-3">
                  <span className="text-sm font-bold text-primary w-8">{event.minute}'</span>
                  <span className="text-sm">
                    {event.type === "goal" && "⚽"}
                    {event.type === "yellow_card" && "🟨"}
                    {event.type === "red_card" && "🟥"}
                    {event.type === "substitution" && "🔄"}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{event.player_name || "Onbekend"}</p>
                    <p className="text-xs text-muted-foreground">{event.team?.name}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Match Stats Section */}
      {statsLoading && (
        <div className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      )}

      {matchStats && !matchStats.error && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-4">
          
          {/* H2H Summary */}
          {matchStats.h2h && matchStats.h2h.total > 0 && (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Swords className="h-5 w-5 text-primary" />
                  <h3 className="font-display font-semibold text-base">Head-to-Head</h3>
                  <Badge variant="outline" className="ml-auto text-xs">{matchStats.h2h.total} wedstrijden</Badge>
                </div>

                {/* Win bars */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{match?.home_team?.name}</span>
                    <span className="text-xs text-muted-foreground">{matchStats.h2h.homeWins}W</span>
                  </div>
                  <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                    {matchStats.h2h.homeWins > 0 && (
                      <div className="bg-primary h-full transition-all" style={{ width: `${(matchStats.h2h.homeWins / matchStats.h2h.total) * 100}%` }} />
                    )}
                    {matchStats.h2h.draws > 0 && (
                      <div className="bg-muted-foreground/40 h-full transition-all" style={{ width: `${(matchStats.h2h.draws / matchStats.h2h.total) * 100}%` }} />
                    )}
                    {matchStats.h2h.awayWins > 0 && (
                      <div className="bg-accent h-full transition-all" style={{ width: `${(matchStats.h2h.awayWins / matchStats.h2h.total) * 100}%` }} />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{match?.away_team?.name}</span>
                    <span className="text-xs text-muted-foreground">{matchStats.h2h.awayWins}W</span>
                  </div>
                  <p className="text-center text-xs text-muted-foreground">{matchStats.h2h.draws} gelijk</p>
                </div>

                {/* Recent H2H matches */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Laatste ontmoetingen</p>
                  {matchStats.h2h.matches.map((m: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-muted/50 rounded-lg px-3 py-2">
                      <span className="text-muted-foreground w-20 truncate">{new Date(m.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                      <span className="font-medium flex-1 text-right truncate">{m.home}</span>
                      <span className="font-bold text-primary mx-2">{m.homeGoals} - {m.awayGoals}</span>
                      <span className="font-medium flex-1 truncate">{m.away}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Form */}
          {(matchStats.homeForm?.length > 0 || matchStats.awayForm?.length > 0) && (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h3 className="font-display font-semibold text-base">Recente vorm</h3>
                </div>

                {/* Home team form */}
                {matchStats.homeForm?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">{match?.home_team?.name}</p>
                    <div className="flex gap-1.5">
                      {matchStats.homeForm.map((f: any, i: number) => (
                        <span
                          key={i}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                            f.result === 'W' ? 'bg-emerald-500' : f.result === 'L' ? 'bg-red-500' : 'bg-muted-foreground/60'
                          }`}
                          title={`${f.score} vs ${f.opponent}`}
                        >
                          {f.result}
                        </span>
                      ))}
                    </div>
                    <div className="space-y-1">
                      {matchStats.homeForm.map((f: any, i: number) => (
                        <p key={i} className="text-[11px] text-muted-foreground">
                          {f.score} vs {f.opponent} <span className="opacity-60">· {f.league}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Away team form */}
                {matchStats.awayForm?.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-sm font-semibold">{match?.away_team?.name}</p>
                    <div className="flex gap-1.5">
                      {matchStats.awayForm.map((f: any, i: number) => (
                        <span
                          key={i}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                            f.result === 'W' ? 'bg-emerald-500' : f.result === 'L' ? 'bg-red-500' : 'bg-muted-foreground/60'
                          }`}
                          title={`${f.score} vs ${f.opponent}`}
                        >
                          {f.result}
                        </span>
                      ))}
                    </div>
                    <div className="space-y-1">
                      {matchStats.awayForm.map((f: any, i: number) => (
                        <p key={i} className="text-[11px] text-muted-foreground">
                          {f.score} vs {f.opponent} <span className="opacity-60">· {f.league}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* Match News Section */}
      {newsLoading && (
        <div className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      )}

      {matchNews?.items && matchNews.items.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-3">
          <div className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            <h2 className="font-display font-semibold text-lg">Wedstrijd Nieuws</h2>
          </div>

          {matchNews.items.map((item: any, i: number) => {
            const categoryIcon = {
              vorm: <Zap className="h-4 w-4" />,
              historie: <History className="h-4 w-4" />,
              spelers: <Users className="h-4 w-4" />,
              tactiek: <ShieldCheck className="h-4 w-4" />,
            }[item.category] || <Newspaper className="h-4 w-4" />;

            const categoryColor = {
              vorm: 'bg-emerald-500/10 text-emerald-700',
              historie: 'bg-amber-500/10 text-amber-700',
              spelers: 'bg-blue-500/10 text-blue-700',
              tactiek: 'bg-purple-500/10 text-purple-700',
            }[item.category] || 'bg-muted text-muted-foreground';

            return (
              <Card key={i} className="border-0 shadow-md overflow-hidden">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg shrink-0 ${categoryColor}`}>
                      {categoryIcon}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] capitalize">{item.category}</Badge>
                      </div>
                      <h3 className="font-semibold text-sm leading-tight">{item.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.summary}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <p className="text-[10px] text-muted-foreground text-center opacity-60">
            📰 Gegenereerd door AI op basis van beschikbare data
          </p>
        </motion.div>
      )}
    </div>
  );
}
