import { useParams, Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatNLDateTime } from "@/lib/timezone";
import { calculatePoints, DEFAULT_RULES } from "@/lib/scoring";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Lock, Check, X } from "lucide-react";
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
  const [homePred, setHomePred] = useState<string>("");
  const [awayPred, setAwayPred] = useState<string>("");

  // Set defaults when pools/predictions load
  const activePool = selectedPoolId || (myPools && myPools.length > 0 ? myPools[0].id : "");
  const existingPred = predictions?.find((p: any) => p.pool_id === activePool);

  const isLocked = useMemo(() => {
    if (!match) return true;
    return new Date() >= new Date(match.kickoff_utc);
  }, [match]);

  const displayHomePred = existingPred ? String(existingPred.home_pred ?? "") : homePred;
  const displayAwayPred = existingPred ? String(existingPred.away_pred ?? "") : awayPred;

  const savePrediction = useMutation({
    mutationFn: async () => {
      if (!user || !activePool) throw new Error("Niet ingelogd of geen poule geselecteerd");
      if (isLocked) throw new Error("Wedstrijd is al begonnen!");
      const hp = parseInt(homePred || displayHomePred);
      const ap = parseInt(awayPred || displayAwayPred);
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
      queryClient.invalidateQueries({ queryKey: ["my-predictions", id] });
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
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-4 pb-8">
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
              {match.status === "live" && <Badge variant="destructive" className="live-pulse">🔴 LIVE</Badge>}
              {match.status === "finished" && <Badge variant="secondary">Gespeeld</Badge>}
              {match.status === "scheduled" && <Badge variant="outline">Gepland</Badge>}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <p className="text-3xl mb-1">{match.home_team?.flag_url || "🏳️"}</p>
                <p className="font-semibold text-sm">{match.home_team?.name || "TBD"}</p>
              </div>
              <div className="text-center px-4">
                {match.status !== "scheduled" ? (
                  <p className="text-4xl font-bold font-display">
                    {match.home_score ?? 0} - {match.away_score ?? 0}
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
      {user && myPools && myPools.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-base">Jouw voorspelling</h3>
                {isLocked && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Lock className="h-3 w-3" /> Locked
                  </Badge>
                )}
              </div>

              {/* Pool selector */}
              {myPools.length > 1 && (
                <Select value={activePool} onValueChange={setSelectedPoolId}>
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
              <div className="flex items-center gap-3">
                <div className="flex-1 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{match.home_team?.short_name || "HOME"}</p>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    className="h-14 text-center text-2xl font-bold font-display"
                    value={existingPred ? (homePred || String(existingPred.home_pred ?? "")) : homePred}
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
                    value={existingPred ? (awayPred || String(existingPred.away_pred ?? "")) : awayPred}
                    onChange={(e) => setAwayPred(e.target.value)}
                    disabled={isLocked}
                    placeholder="-"
                  />
                </div>
              </div>

              {!isLocked && (
                <Button
                  className="w-full h-12 gradient-primary text-primary-foreground font-semibold"
                  onClick={() => savePrediction.mutate()}
                  disabled={savePrediction.isPending}
                >
                  {savePrediction.isPending ? "Opslaan..." : existingPred ? "Bijwerken" : "Opslaan"}
                </Button>
              )}

              {/* Points result */}
              {match.status === "finished" && existingPred && (
                <div className={`rounded-xl p-3 text-center ${
                  (pointsAwarded ?? 0) > 0 ? "bg-primary/10" : "bg-muted"
                }`}>
                  <p className="text-xs text-muted-foreground">Jouw voorspelling: {existingPred.home_pred} - {existingPred.away_pred}</p>
                  <p className="text-lg font-bold font-display mt-1">
                    {(pointsAwarded ?? 0) > 0 ? (
                      <span className="text-primary flex items-center justify-center gap-1">
                        <Check className="h-5 w-5" /> +{pointsAwarded} punten
                      </span>
                    ) : (
                      <span className="text-muted-foreground flex items-center justify-center gap-1">
                        <X className="h-5 w-5" /> 0 punten
                      </span>
                    )}
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
    </div>
  );
}
