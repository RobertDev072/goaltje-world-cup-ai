import { useEffect, useState, useMemo } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Users, Trophy, Target, Activity, TrendingUp, TrendingDown, Clock, CheckCircle2, Search, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { formatNLDateTime, formatNLDate } from "@/lib/timezone";
import { toast } from "@/hooks/use-toast";
import { getErrorLogs } from "@/lib/errorLogger";

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

type MatchFilter = "today" | "live" | "scheduled" | "finished" | "postponed" | "cancelled" | "all";

function AdminMatchEditor() {
  const queryClient = useQueryClient();
  const [editingMatch, setEditingMatch] = useState<any | null>(null);
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [matchStatus, setMatchStatus] = useState("scheduled");
  const [filter, setFilter] = useState<MatchFilter>("today");
  const [searchQuery, setSearchQuery] = useState("");

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

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
    queryClient.invalidateQueries({ queryKey: ["matches"] });
    queryClient.invalidateQueries({ queryKey: ["upcoming-matches"] });
    queryClient.invalidateQueries({ queryKey: ["my-predictions"] });
    queryClient.invalidateQueries({ queryKey: ["home-predictions"] });
    queryClient.invalidateQueries({ queryKey: ["my-pool-predictions"] });
    queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    queryClient.invalidateQueries({ queryKey: ["remaining-matches"] });
    queryClient.invalidateQueries({ queryKey: ["pool"] });
    queryClient.invalidateQueries({ queryKey: ["pool-members"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const openEditor = (m: any) => {
    setEditingMatch(m);
    setHomeScore(m.home_score != null ? String(m.home_score) : "");
    setAwayScore(m.away_score != null ? String(m.away_score) : "");
    setMatchStatus(m.status);
  };

  const updateMatch = useMutation({
    mutationFn: async (matchId: string) => {
      const hasHome = homeScore !== "";
      const hasAway = awayScore !== "";
      
      if (matchStatus === "finished" && (!hasHome || !hasAway)) {
        throw new Error("Vul beide scores in als de status 'Gespeeld' is.");
      }
      
      let finalStatus = matchStatus;
      if (hasHome && hasAway && matchStatus === "scheduled") {
        finalStatus = "finished";
      }

      const updateData: Record<string, any> = { 
        status: finalStatus, 
        last_updated: new Date().toISOString(),
        needs_recalc: true,
      };
      
      updateData.home_score = hasHome ? parseInt(homeScore) : null;
      updateData.away_score = hasAway ? parseInt(awayScore) : null;
      
      const { error } = await supabase.from("matches").update(updateData).eq("id", matchId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "✅ Opgeslagen", description: "Score opgeslagen & punten automatisch herberekend!" });
      setEditingMatch(null);
      invalidateAll();
    },
    onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" }),
  });

  const resetMatch = useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await supabase.from("matches").update({
        home_score: null,
        away_score: null,
        status: "scheduled",
        last_updated: new Date().toISOString(),
        needs_recalc: true,
      }).eq("id", matchId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "🔄 Gereset", description: "Wedstrijd teruggezet naar gepland. Punten op 0 gezet." });
      setEditingMatch(null);
      invalidateAll();
    },
    onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" }),
  });

  const filteredMatches = matches?.filter((m: any) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const homeMatch = m.home_team?.name?.toLowerCase().includes(q) || m.home_team?.short_name?.toLowerCase().includes(q);
      const awayMatch = m.away_team?.name?.toLowerCase().includes(q) || m.away_team?.short_name?.toLowerCase().includes(q);
      if (!homeMatch && !awayMatch) return false;
    }
    const kickoff = new Date(m.kickoff_utc);
    const today = new Date();
    const isToday = kickoff.toDateString() === today.toDateString();
    switch (filter) {
      case "today": return isToday;
      case "live": return m.status === "live";
      case "scheduled": return m.status === "scheduled";
      case "finished": return m.status === "finished";
      case "postponed": return m.status === "postponed";
      case "cancelled": return ["cancelled", "void"].includes(m.status);
      case "all": return true;
      default: return true;
    }
  }) || [];

  const filterButtons: { key: MatchFilter; label: string; count?: number }[] = [
    { key: "today", label: "📅 Vandaag", count: matches?.filter((m: any) => new Date(m.kickoff_utc).toDateString() === new Date().toDateString()).length },
    { key: "scheduled", label: "🕐 Gepland", count: matches?.filter((m: any) => m.status === "scheduled").length },
    { key: "live", label: "🔴 Live", count: matches?.filter((m: any) => m.status === "live").length },
    { key: "finished", label: "✅ Gespeeld", count: matches?.filter((m: any) => m.status === "finished").length },
    { key: "all", label: "Alles", count: matches?.length },
  ];

  const statusLabel = (s: string) => 
    s === "scheduled" ? "Gepland" : s === "live" ? "Live" : s === "finished" ? "Gespeeld" : 
    s === "postponed" ? "Uitgesteld" : s === "cancelled" ? "Afgelast" : s === "void" ? "Ongeldig" : s;

  if (isLoading) return <Skeleton className="h-40 rounded-xl" />;

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Zoek team..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {filterButtons.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0 ${
              filter === f.key ? "gradient-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"
            }`}
          >
            {f.label} {f.count != null && f.count > 0 ? `(${f.count})` : ""}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        {filteredMatches.length} wedstrijd{filteredMatches.length !== 1 ? "en" : ""} gevonden
      </p>

      {/* Match list — clean, no inline editing */}
      {filteredMatches.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Geen wedstrijden gevonden.
          </CardContent>
        </Card>
      ) : (
        filteredMatches.map((m: any) => (
          <Card
            key={m.id}
            className={`border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${m.status === "live" ? "ring-2 ring-destructive/30" : ""}`}
            onClick={() => openEditor(m)}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="flex-shrink-0">{m.home_team?.flag_url || "🏳️"}</span>
                    <span className="font-medium truncate">{m.home_team?.short_name || m.home_team?.name || "TBD"}</span>
                    <span className="text-muted-foreground mx-1 font-bold flex-shrink-0">
                      {m.home_score != null && m.away_score != null ? `${m.home_score} - ${m.away_score}` : "vs"}
                    </span>
                    <span className="flex-shrink-0">{m.away_team?.flag_url || "🏳️"}</span>
                    <span className="font-medium truncate">{m.away_team?.short_name || m.away_team?.name || "TBD"}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{formatNLDate(m.kickoff_utc)}</span>
                    <Badge
                      variant={["live","cancelled","void"].includes(m.status) ? "destructive" : m.status === "finished" ? "secondary" : "outline"}
                      className="text-[9px] px-1.5 py-0"
                    >
                      {statusLabel(m.status)}
                    </Badge>
                    {m.status === "finished" && <CheckCircle2 className="h-3 w-3 text-primary" />}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">✏️</span>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Score Editor Dialog */}
      <Dialog open={!!editingMatch} onOpenChange={(open) => !open && setEditingMatch(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center font-display">
              Score invoeren
            </DialogTitle>
            <DialogDescription className="text-center">
              {editingMatch?.home_team?.name || "Thuis"} vs {editingMatch?.away_team?.name || "Uit"}
              <br />
              <span className="text-[10px]">{editingMatch && formatNLDateTime(editingMatch.kickoff_utc)}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Score inputs */}
            <div className="flex gap-3 items-center justify-center">
              <div className="text-center">
                <span className="text-xs text-muted-foreground block mb-1 font-medium">
                  {editingMatch?.home_team?.flag_url} {editingMatch?.home_team?.short_name || "Home"}
                </span>
                <Input
                  type="number"
                  min={0}
                  max={20}
                  placeholder="-"
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                  className="h-16 w-20 text-center text-2xl font-bold font-display"
                />
              </div>
              <span className="text-2xl font-bold text-muted-foreground mt-5">-</span>
              <div className="text-center">
                <span className="text-xs text-muted-foreground block mb-1 font-medium">
                  {editingMatch?.away_team?.flag_url} {editingMatch?.away_team?.short_name || "Away"}
                </span>
                <Input
                  type="number"
                  min={0}
                  max={20}
                  placeholder="-"
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                  className="h-16 w-20 text-center text-2xl font-bold font-display"
                />
              </div>
            </div>

            {/* Status selector */}
            <Select value={matchStatus} onValueChange={setMatchStatus}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">🕐 Gepland</SelectItem>
                <SelectItem value="live">🔴 Live</SelectItem>
                <SelectItem value="finished">✅ Gespeeld</SelectItem>
                <SelectItem value="postponed">⏸️ Uitgesteld</SelectItem>
                <SelectItem value="cancelled">❌ Afgelast</SelectItem>
                <SelectItem value="void">🚫 Ongeldig</SelectItem>
              </SelectContent>
            </Select>

            {/* Auto-finish hint */}
            {homeScore !== "" && awayScore !== "" && matchStatus === "scheduled" && (
              <p className="text-[10px] text-primary text-center">
                💡 Status wordt automatisch op "Gespeeld" gezet bij opslaan
              </p>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                className="flex-1 gradient-primary text-primary-foreground h-11 font-semibold"
                onClick={() => editingMatch && updateMatch.mutate(editingMatch.id)}
                disabled={updateMatch.isPending || resetMatch.isPending}
              >
                {updateMatch.isPending ? "Opslaan..." : "💾 Opslaan"}
              </Button>
            </div>

            {editingMatch && (editingMatch.home_score != null || editingMatch.status !== "scheduled") && (
              <Button
                variant="outline"
                size="sm"
                className="w-full h-9 border-destructive/30 text-destructive hover:bg-destructive/10 text-xs"
                onClick={() => {
                  if (confirm("Weet je zeker dat je wilt resetten? Punten worden op 0 gezet.")) {
                    resetMatch.mutate(editingMatch.id);
                  }
                }}
                disabled={resetMatch.isPending || updateMatch.isPending}
              >
                {resetMatch.isPending ? "Resetten..." : "🔄 Reset naar gepland"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"stats" | "matches" | "debug">("matches");

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

  const errorLogs = useMemo(() => getErrorLogs(), [tab]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!roleLoading && isAdmin === false) navigate("/app");
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
    { key: "matches" as const, label: "⚽ Scores" },
    { key: "stats" as const, label: "📊 Stats" },
    { key: "debug" as const, label: "🐛 Debug" },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-5 pb-8">
      <Link to="/app/profile" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
        <ArrowLeft className="h-4 w-4" /> Terug
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Admin Dashboard</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Clock className="h-3 w-3" />
            {dataUpdatedAt ? formatNLDateTime(new Date(dataUpdatedAt).toISOString()) : "..."}
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

      {/* Matches Tab - Primary */}
      {tab === "matches" && (
        <div className="space-y-3">
          <Card className="border-0 shadow-sm bg-muted/50">
            <CardContent className="p-3 text-xs text-muted-foreground space-y-1">
              <p>⚽ <strong>Scoring:</strong> Exact = 6 pt | Doelverschil = 4 pt | Resultaat = 3 pt</p>
              <p>📋 <strong>Workflow:</strong> Zoek de wedstrijd → vul de score in → klik opslaan.</p>
              <p>🔄 Punten worden <strong>automatisch</strong> herberekend voor alle gebruikers.</p>
              <p>✏️ <strong>Correctie:</strong> Pas score aan en klik opnieuw op opslaan. Voorspellingen blijven intact.</p>
              <p>⏸️ Statussen: Gepland, Live, Gespeeld, Uitgesteld, Afgelast, Ongeldig</p>
            </CardContent>
          </Card>
          <AdminMatchEditor />
        </div>
      )}

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

      {/* Debug Tab */}
      {tab === "debug" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Totaal poules" value={stats?.total_pools || "..."} icon={Trophy} />
            <StatCard label="Totaal predictions" value={stats?.total_predictions || "..."} icon={Target} />
          </div>
          <div>
            <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">🐛 Client Error Logs</h2>
            {errorLogs.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center text-sm text-muted-foreground">
                  Geen errors vastgelegd ✅
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
                {errorLogs.map((log, i) => (
                  <Card key={i} className={`border-0 shadow-sm ${log.type === "error" ? "border-l-2 border-l-destructive" : log.type === "slow_query" ? "border-l-2 border-l-warning" : "border-l-2 border-l-primary"}`}>
                    <CardContent className="p-2.5">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant={log.type === "error" ? "destructive" : "outline"} className="text-[9px] px-1.5 py-0">
                          {log.type}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString("nl-NL")}</span>
                      </div>
                      <p className="text-xs font-medium truncate">{log.message}</p>
                      {log.details && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{log.details}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
