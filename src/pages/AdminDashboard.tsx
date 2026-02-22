import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Users, Trophy, Target, Activity, TrendingUp, TrendingDown, Clock, RefreshCw, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { formatNLDateTime, formatNLDate } from "@/lib/timezone";
import { toast } from "@/hooks/use-toast";

function StatCard({ label, value, icon: Icon, sub, trend }: {
  label: string;
  value: string | number;
  icon: any;
  sub?: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card className="border-0 shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold font-display mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
        {trend && trend !== "neutral" && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trend === "up" ? "text-primary" : "text-destructive"}`}>
            {trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{trend === "up" ? "Stijgend" : "Dalend"}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AdminMatchEditor() {
  const queryClient = useQueryClient();
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [matchStatus, setMatchStatus] = useState("scheduled");

  const { data: matches, isLoading } = useQuery({
    queryKey: ["admin-matches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("*, home_team:teams!matches_home_team_id_fkey(name, flag_url, short_name), away_team:teams!matches_away_team_id_fkey(name, flag_url, short_name)")
        .order("kickoff_utc", { ascending: true });
      return data || [];
    },
  });

  const updateMatch = useMutation({
    mutationFn: async (matchId: string) => {
      // Auto-set status to "finished" if both scores are filled and status is still "scheduled"
      let finalStatus = matchStatus;
      if (homeScore !== "" && awayScore !== "" && matchStatus === "scheduled") {
        finalStatus = "finished";
      }
      const updateData: any = { status: finalStatus, last_updated: new Date().toISOString() };
      if (homeScore !== "") updateData.home_score = parseInt(homeScore);
      if (awayScore !== "") updateData.away_score = parseInt(awayScore);
      const { error } = await supabase.from("matches").update(updateData).eq("id", matchId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Wedstrijd bijgewerkt ✅" });
      setEditingMatch(null);
      queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
    },
    onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" }),
  });

  if (isLoading) return <Skeleton className="h-40 rounded-xl" />;

  return (
    <div className="space-y-2">
      {matches?.map((m: any) => (
        <Card key={m.id} className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 text-sm">
                  <span>{m.home_team?.flag_url || "🏳️"}</span>
                  <span className="font-medium truncate">{m.home_team?.short_name || "TBD"}</span>
                  <span className="text-muted-foreground mx-1">
                    {m.home_score != null ? `${m.home_score} - ${m.away_score}` : "vs"}
                  </span>
                  <span>{m.away_team?.flag_url || "🏳️"}</span>
                  <span className="font-medium truncate">{m.away_team?.short_name || "TBD"}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">{formatNLDate(m.kickoff_utc)}</span>
                  <Badge variant={m.status === "live" ? "destructive" : m.status === "finished" ? "secondary" : "outline"} className="text-[9px] px-1.5 py-0">
                    {m.status}
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setEditingMatch(editingMatch === m.id ? null : m.id);
                  setHomeScore(m.home_score?.toString() || "");
                  setAwayScore(m.away_score?.toString() || "");
                  setMatchStatus(m.status);
                }}
              >
                ✏️
              </Button>
            </div>
            {editingMatch === m.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="mt-3 space-y-2 border-t pt-3"
              >
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    min={0}
                    placeholder="Home"
                    value={homeScore}
                    onChange={(e) => setHomeScore(e.target.value)}
                    className="h-9 w-20 text-center"
                  />
                  <span className="text-sm font-bold">-</span>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Away"
                    value={awayScore}
                    onChange={(e) => setAwayScore(e.target.value)}
                    className="h-9 w-20 text-center"
                  />
                  <Select value={matchStatus} onValueChange={setMatchStatus}>
                    <SelectTrigger className="h-9 w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Gepland</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="finished">Gespeeld</SelectItem>
                      <SelectItem value="cancelled">Afgelast</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  className="w-full gradient-primary text-primary-foreground"
                  onClick={() => updateMatch.mutate(m.id)}
                  disabled={updateMatch.isPending}
                >
                  {updateMatch.isPending ? "Opslaan..." : "Opslaan + Punten herberekenen"}
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"stats" | "matches" | "api">("stats");

  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (error) return false;
      return data === true;
    },
    enabled: !!user,
  });

  const { data: stats, isLoading: statsLoading, dataUpdatedAt } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_stats");
      if (error) throw error;
      return data as any;
    },
    enabled: isAdmin === true,
    refetchInterval: 60000,
  });

  // API usage
  const { data: apiUsage } = useQuery({
    queryKey: ["api-usage"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase.from("api_usage").select("*").eq("usage_date", today).maybeSingle();
      return data;
    },
    enabled: isAdmin === true && tab === "api",
  });

  const syncMutation = useMutation({
    mutationFn: async (action: string) => {
      const { data, error } = await supabase.functions.invoke("fetch-scores", {
        body: { action },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Sync voltooid ✅", description: JSON.stringify(data, null, 2).slice(0, 100) });
    },
    onError: (err: any) => toast({ title: "Sync fout", description: err.message, variant: "destructive" }),
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!roleLoading && isAdmin === false) navigate("/");
  }, [roleLoading, isAdmin, navigate]);

  if (authLoading || roleLoading || !isAdmin) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "stats" as const, label: "📊 Stats" },
    { key: "matches" as const, label: "⚽ Scores" },
    { key: "api" as const, label: "🔌 API" },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-5 pb-8">
      <Link to="/profile" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
        <ArrowLeft className="h-4 w-4" /> Terug
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Developer Dashboard</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Clock className="h-3 w-3" />
            Laatst bijgewerkt: {dataUpdatedAt ? formatNLDateTime(new Date(dataUpdatedAt).toISOString()) : "..."}
          </p>
        </div>
        <Badge className="gradient-primary text-primary-foreground">Admin</Badge>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              tab === t.key ? "gradient-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Stats Tab */}
      {tab === "stats" && (
        <>
          {statsLoading || !stats ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
          ) : (
            <>
              <div>
                <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">👤 Accounts</h2>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Totaal accounts" value={stats.total_users} icon={Users} />
                  <StatCard label="Vandaag" value={stats.users_today} icon={Users} sub={`7d: ${stats.users_7d} · 30d: ${stats.users_30d}`} />
                </div>
              </div>
              <div>
                <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">🔵 Actieve gebruikers</h2>
                <div className="grid grid-cols-3 gap-3">
                  <StatCard label="Vandaag" value={stats.logins_today} icon={Activity} />
                  <StatCard label="7 dagen" value={stats.logins_7d} icon={Activity} />
                  <StatCard label="30 dagen" value={stats.logins_30d} icon={Activity} />
                </div>
              </div>
              <div>
                <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">🏆 Poules</h2>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Totaal poules" value={stats.total_pools} icon={Trophy} />
                  <StatCard label="Gem. leden/poule" value={stats.avg_members_per_pool} icon={Users} sub={`Vandaag: ${stats.pools_today} · 7d: ${stats.pools_7d}`} />
                </div>
              </div>
              <div>
                <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">🎯 Voorspellingen</h2>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Totaal predictions" value={stats.total_predictions} icon={Target} />
                  <StatCard label="Vandaag" value={stats.predictions_today} icon={Target} sub={`7d: ${stats.predictions_7d} · 30d: ${stats.predictions_30d}`} />
                  <StatCard label="Actieve predictors (7d)" value={stats.predictors_7d} icon={Activity} />
                  <StatCard label="Actieve predictors (30d)" value={stats.predictors_30d} icon={Activity} />
                </div>
              </div>
              {stats.top_pools && stats.top_pools.length > 0 && (
                <div>
                  <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">📊 Top 10 Poules</h2>
                  <Card className="border-0 shadow-md">
                    <CardContent className="p-0">
                      {stats.top_pools.map((pool: any, i: number) => (
                        <div key={i} className={`flex items-center justify-between p-3 ${i < stats.top_pools.length - 1 ? "border-b border-border" : ""}`}>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-muted-foreground w-6">{i + 1}</span>
                            <span className="text-sm font-medium">{pool.name}</span>
                          </div>
                          <Badge variant="secondary">{pool.member_count} leden</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Matches Tab - Score Editor */}
      {tab === "matches" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Klik ✏️ om score + status bij te werken. Punten worden automatisch herberekend.
          </p>
          <AdminMatchEditor />
        </div>
      )}

      {/* API Tab */}
      {tab === "api" && (
        <div className="space-y-4">
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-display font-semibold">API-Football Gebruik</h3>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Vandaag</span>
                <span className="text-lg font-bold">{apiUsage?.request_count ?? 0} / 90</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className="gradient-primary h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(((apiUsage?.request_count ?? 0) / 90) * 100, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-16 flex-col gap-1"
              onClick={() => syncMutation.mutate("sync-fixtures")}
              disabled={syncMutation.isPending}
            >
              <RefreshCw className={`h-5 w-5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
              <span className="text-xs">Sync Fixtures</span>
            </Button>
            <Button
              variant="outline"
              className="h-16 flex-col gap-1"
              onClick={() => syncMutation.mutate("sync-live")}
              disabled={syncMutation.isPending}
            >
              <Zap className="h-5 w-5" />
              <span className="text-xs">Sync Live</span>
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground">
            ⚠️ Elke sync gebruikt 1 API call. Max 90/dag (buffer van 10). Cache: fixtures 12u, live on-demand.
          </p>
        </div>
      )}
    </div>
  );
}
