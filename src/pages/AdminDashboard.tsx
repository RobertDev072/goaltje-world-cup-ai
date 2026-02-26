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
import { ArrowLeft, Users, Trophy, Target, Activity, TrendingUp, TrendingDown, Clock, CheckCircle2, Search } from "lucide-react";
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

type MatchFilter = "today" | "live" | "scheduled" | "finished" | "postponed" | "cancelled" | "all";

function AdminMatchEditor() {
  const queryClient = useQueryClient();
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
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
    // Invalidate every query key used across the entire app
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

  const updateMatch = useMutation({
    mutationFn: async (matchId: string) => {
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
      toast({ title: "✅ Opgeslagen", description: "Score opgeslagen & punten herberekend!" });
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
      }).eq("id", matchId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "🔄 Gereset", description: "Wedstrijd teruggezet naar gepland. Alle punten voor deze wedstrijd zijn op 0 gezet." });
      setEditingMatch(null);
      invalidateAll();
    },
    onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" }),
  });

  const filteredMatches = matches?.filter((m: any) => {
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const homeMatch = m.home_team?.name?.toLowerCase().includes(q) || m.home_team?.short_name?.toLowerCase().includes(q);
      const awayMatch = m.away_team?.name?.toLowerCase().includes(q) || m.away_team?.short_name?.toLowerCase().includes(q);
      if (!homeMatch && !awayMatch) return false;
    }

    // Status filter
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
    { key: "postponed", label: "⏸️ Uitgesteld", count: matches?.filter((m: any) => m.status === "postponed").length },
    { key: "cancelled", label: "❌ Afgelast", count: matches?.filter((m: any) => ["cancelled", "void"].includes(m.status)).length },
    { key: "all", label: "Alles", count: matches?.length },
  ];

  if (isLoading) return <Skeleton className="h-40 rounded-xl" />;

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Zoek team..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {filterButtons.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0 ${
              filter === f.key
                ? "gradient-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {f.label} {f.count != null && f.count > 0 ? `(${f.count})` : ""}
          </button>
        ))}
      </div>

      {/* Match count */}
      <p className="text-xs text-muted-foreground">
        {filteredMatches.length} wedstrijd{filteredMatches.length !== 1 ? "en" : ""} gevonden
      </p>

      {/* Match list */}
      {filteredMatches.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Geen wedstrijden gevonden voor dit filter.
          </CardContent>
        </Card>
      ) : (
        filteredMatches.map((m: any) => (
          <Card key={m.id} className={`border-0 shadow-sm ${m.status === "live" ? "ring-2 ring-destructive/30" : ""}`}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="flex-shrink-0">{m.home_team?.flag_url || "🏳️"}</span>
                    <span className="font-medium truncate">{m.home_team?.short_name || m.home_team?.name || "TBD"}</span>
                    <span className="text-muted-foreground mx-1 font-bold flex-shrink-0">
                      {m.home_score != null ? `${m.home_score} - ${m.away_score}` : "vs"}
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
                      {m.status === "scheduled" ? "Gepland" : m.status === "live" ? "Live" : m.status === "finished" ? "Gespeeld" : m.status === "postponed" ? "Uitgesteld" : m.status === "cancelled" ? "Afgelast" : m.status === "void" ? "Ongeldig" : m.status}
                    </Badge>
                    {m.status === "finished" && <CheckCircle2 className="h-3 w-3 text-primary" />}
                  </div>
                </div>
                <Button
                  variant={editingMatch === m.id ? "default" : "ghost"}
                  size="sm"
                  className="text-xs flex-shrink-0"
                  onClick={() => {
                    setEditingMatch(editingMatch === m.id ? null : m.id);
                    setHomeScore(m.home_score?.toString() || "");
                    setAwayScore(m.away_score?.toString() || "");
                    setMatchStatus(m.status);
                  }}
                >
                  ✏️ Score
                </Button>
              </div>

              {editingMatch === m.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="mt-3 space-y-3 border-t pt-3"
                >
                  <div className="text-xs text-muted-foreground text-center">
                    {m.home_team?.name || "Thuis"} vs {m.away_team?.name || "Uit"}
                  </div>
                  <div className="flex gap-2 items-center justify-center">
                    <div className="text-center">
                      <span className="text-[10px] text-muted-foreground block mb-1">{m.home_team?.short_name || "Home"}</span>
                      <Input
                        type="number"
                        min={0}
                        max={20}
                        placeholder="0"
                        value={homeScore}
                        onChange={(e) => setHomeScore(e.target.value)}
                        className="h-12 w-16 text-center text-lg font-bold"
                      />
                    </div>
                    <span className="text-xl font-bold text-muted-foreground mt-4">-</span>
                    <div className="text-center">
                      <span className="text-[10px] text-muted-foreground block mb-1">{m.away_team?.short_name || "Away"}</span>
                      <Input
                        type="number"
                        min={0}
                        max={20}
                        placeholder="0"
                        value={awayScore}
                        onChange={(e) => setAwayScore(e.target.value)}
                        className="h-12 w-16 text-center text-lg font-bold"
                      />
                    </div>
                  </div>
                  <Select value={matchStatus} onValueChange={setMatchStatus}>
                    <SelectTrigger className="h-9">
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
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 gradient-primary text-primary-foreground h-10"
                      onClick={() => updateMatch.mutate(m.id)}
                      disabled={updateMatch.isPending || resetMatch.isPending}
                    >
                      {updateMatch.isPending ? "Opslaan..." : "💾 Opslaan & Herberekenen"}
                    </Button>
                    {(m.home_score != null || m.status !== "scheduled") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 border-destructive/30 text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm("Weet je zeker dat je deze wedstrijd wilt resetten? Alle punten worden op 0 gezet.")) {
                            resetMatch.mutate(m.id);
                          }
                        }}
                        disabled={resetMatch.isPending || updateMatch.isPending}
                      >
                        {resetMatch.isPending ? "..." : "🔄 Reset"}
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"stats" | "matches">("matches");

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
    { key: "matches" as const, label: "⚽ Scores invoeren" },
    { key: "stats" as const, label: "📊 Stats" },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-5 pb-8">
      <Link to="/profile" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
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
    </div>
  );
}
