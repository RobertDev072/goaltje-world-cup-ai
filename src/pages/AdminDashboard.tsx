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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Users, Trophy, Target, Activity, Clock, CheckCircle2,
  Search, AlertCircle, Download, RefreshCw, UserCheck, Trash2,
  AlertTriangle, FileJson, BarChart2, MessageSquare,
  Gift, Settings, Crown, LogOut, Copy, RotateCcw, Plus, Edit2, ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatNLDateTime, formatNLDate } from "@/lib/timezone";
import { toast } from "@/hooks/use-toast";
import { getErrorLogs } from "@/lib/errorLogger";

interface AdminStats {
  total_users: number;
  users_today: number;
  users_7d: number;
  users_30d: number;
  logins_today: number;
  logins_7d: number;
  logins_30d: number;
  total_pools: number;
  avg_members_per_pool: number;
  pools_today: number;
  pools_7d: number;
  total_predictions: number;
  predictions_today: number;
  predictions_7d: number;
  predictions_30d: number;
  predictors_7d: number;
  predictors_30d: number;
  top_pools: { name: string; member_count: number }[];
}

// ============================================================
// Backup functionality
// ============================================================
const BACKUP_TABLES = [
  "profiles", "matches", "teams", "pools",
  "pool_members", "predictions",
  "bonus_questions", "bonus_predictions", "pool_messages",
];

async function createBackup() {
  const backup: { version: string; created_at: string; tables: Record<string, any[]> } = {
    version: "goaltje-backup-v1",
    created_at: new Date().toISOString(),
    tables: {},
  };

  for (const table of BACKUP_TABLES) {
    const allRows: any[] = [];
    let from = 0;
    const batchSize = 1000;
    while (true) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .range(from, from + batchSize - 1);
      if (error) throw new Error(`Fout bij ${table}: ${error.message}`);
      if (!data || data.length === 0) break;
      allRows.push(...data);
      if (data.length < batchSize) break;
      from += batchSize;
    }
    backup.tables[table] = allRows;
  }

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `goaltje-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function restoreBackup(file: File) {
  const text = await file.text();
  const backup = JSON.parse(text);
  if (backup.version !== "goaltje-backup-v1") {
    throw new Error("Ongeldig backup bestand");
  }
  const restoreOrder = [
    "profiles", "teams", "matches", "pools",
    "pool_members", "predictions",
    "bonus_questions", "bonus_predictions", "pool_messages",
  ];
  for (const table of restoreOrder) {
    const rows = backup.tables[table];
    if (!rows || rows.length === 0) continue;
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      const { error } = await supabase
        .from(table)
        .upsert(batch, { onConflict: "id" });
      if (error) throw new Error(`Restore fout ${table}: ${error.message}`);
    }
  }
}

// ============================================================
// Admin Match Editor (Score entry)
// ============================================================
type MatchFilter = "today" | "live" | "scheduled" | "finished" | "all";

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
      toast({ title: "Opgeslagen", description: "Score opgeslagen & punten herberekend." });
      setEditingMatch(null);
      invalidateAll();
    },
    onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" }),
  });

  const resetMatch = useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await supabase.from("matches").update({
        home_score: null, away_score: null, status: "scheduled",
        last_updated: new Date().toISOString(), needs_recalc: true,
      }).eq("id", matchId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Gereset", description: "Wedstrijd teruggezet naar gepland." });
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
      case "all": return true;
      default: return true;
    }
  }) || [];

  const filterButtons: { key: MatchFilter; label: string; count?: number }[] = [
    { key: "today", label: "Vandaag", count: matches?.filter((m: any) => new Date(m.kickoff_utc).toDateString() === new Date().toDateString()).length },
    { key: "scheduled", label: "Gepland", count: matches?.filter((m: any) => m.status === "scheduled").length },
    { key: "live", label: "Live", count: matches?.filter((m: any) => m.status === "live").length },
    { key: "finished", label: "Gespeeld", count: matches?.filter((m: any) => m.status === "finished").length },
    { key: "all", label: "Alles", count: matches?.length },
  ];

  const statusLabel = (s: string) =>
    s === "scheduled" ? "Gepland" : s === "live" ? "Live" : s === "finished" ? "Gespeeld" :
    s === "postponed" ? "Uitgesteld" : s === "cancelled" ? "Afgelast" : s === "void" ? "Ongeldig" : s;

  if (isLoading) return <Skeleton className="h-40 rounded-xl" />;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Zoek team..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
      </div>

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
        {filteredMatches.length} wedstrijd{filteredMatches.length !== 1 ? "en" : ""}
      </p>

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
                      variant={["live", "cancelled", "void"].includes(m.status) ? "destructive" : m.status === "finished" ? "secondary" : "outline"}
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

      <Dialog open={!!editingMatch} onOpenChange={(open) => !open && setEditingMatch(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center font-display">Score invoeren</DialogTitle>
            <DialogDescription className="text-center">
              {editingMatch?.home_team?.name || "Thuis"} vs {editingMatch?.away_team?.name || "Uit"}
              <br />
              <span className="text-[10px]">{editingMatch && formatNLDateTime(editingMatch.kickoff_utc)}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex gap-3 items-center justify-center">
              <div className="text-center">
                <span className="text-xs text-muted-foreground block mb-1 font-medium">
                  {editingMatch?.home_team?.flag_url} {editingMatch?.home_team?.short_name || "Home"}
                </span>
                <Input type="number" min={0} max={20} placeholder="-" value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)} className="h-16 w-20 text-center text-2xl font-bold font-display" />
              </div>
              <span className="text-2xl font-bold text-muted-foreground mt-5">-</span>
              <div className="text-center">
                <span className="text-xs text-muted-foreground block mb-1 font-medium">
                  {editingMatch?.away_team?.flag_url} {editingMatch?.away_team?.short_name || "Away"}
                </span>
                <Input type="number" min={0} max={20} placeholder="-" value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)} className="h-16 w-20 text-center text-2xl font-bold font-display" />
              </div>
            </div>

            <Select value={matchStatus} onValueChange={setMatchStatus}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Gepland</SelectItem>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="finished">Gespeeld</SelectItem>
                <SelectItem value="postponed">Uitgesteld</SelectItem>
                <SelectItem value="cancelled">Afgelast</SelectItem>
                <SelectItem value="void">Ongeldig</SelectItem>
              </SelectContent>
            </Select>

            {homeScore !== "" && awayScore !== "" && matchStatus === "scheduled" && (
              <p className="text-[10px] text-primary text-center">
                Status wordt automatisch op "Gespeeld" gezet bij opslaan
              </p>
            )}

            <Button className="w-full gradient-primary text-primary-foreground h-11 font-semibold"
              onClick={() => editingMatch && updateMatch.mutate(editingMatch.id)}
              disabled={updateMatch.isPending || resetMatch.isPending}
            >
              {updateMatch.isPending ? "Opslaan..." : "Opslaan"}
            </Button>

            {editingMatch && (editingMatch.home_score != null || editingMatch.status !== "scheduled") && (
              <Button variant="outline" size="sm"
                className="w-full h-9 border-destructive/30 text-destructive hover:bg-destructive/10 text-xs"
                onClick={() => { if (confirm("Weet je zeker? Punten worden op 0 gezet.")) resetMatch.mutate(editingMatch.id); }}
                disabled={resetMatch.isPending || updateMatch.isPending}
              >
                {resetMatch.isPending ? "Resetten..." : "Reset naar gepland"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Confirmed Action Button (with AlertDialog)
// ============================================================
function ConfirmedAction({ label, description, icon: Icon, onConfirm, isPending, variant = "default" }: {
  label: string;
  description: string;
  icon: any;
  onConfirm: () => void;
  isPending: boolean;
  variant?: "default" | "warning";
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          className={`h-auto py-3 px-4 flex items-center gap-3 w-full justify-start ${
            variant === "warning" ? "border-amber-200 hover:bg-amber-50" : ""
          }`}
          disabled={isPending}
        >
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
            variant === "warning" ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
          }`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium">{isPending ? "Bezig..." : label}</p>
            <p className="text-[10px] text-muted-foreground">{description}</p>
          </div>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{label}</AlertDialogTitle>
          <AlertDialogDescription>{description} Weet je het zeker?</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuleren</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Bevestigen</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============================================================
// Main Admin Dashboard
// ============================================================
export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  type TabKey = "overview" | "scores" | "stats" | "poules" | "beheer" | "analytics" | "bonus" | "berichten" | "systeem" | "ranglijst";
  const [tab, setTab] = useState<TabKey>("overview");
  const [expandedPool, setExpandedPool] = useState<string | null>(null);
  const [editingPool, setEditingPool] = useState<any | null>(null);
  const [poolMembersExpanded, setPoolMembersExpanded] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [poolSearch, setPoolSearch] = useState("");
  const [analyticsMatchId, setAnalyticsMatchId] = useState<string>("");
  const [bonusAnswers, setBonusAnswers] = useState<Record<string, string>>({});
  const [msgPoolFilter, setMsgPoolFilter] = useState<string>("all");
  // Pool bewerken state
  const [editPoolName, setEditPoolName] = useState("");
  const [editPoolPrivacy, setEditPoolPrivacy] = useState("private");
  const [editPoolPrize, setEditPoolPrize] = useState("");
  const [editPoolExact, setEditPoolExact] = useState("6");
  const [editPoolGoalDiff, setEditPoolGoalDiff] = useState("4");
  const [editPoolResult, setEditPoolResult] = useState("3");

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
      return data as unknown as AdminStats;
    },
    enabled: isAdmin === true,
    refetchInterval: 60000,
  });

  const { data: pools } = useQuery({
    queryKey: ["admin-pools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pools")
        .select("id, name")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin === true,
    staleTime: 60_000,
  });

  const { data: allPools, isLoading: allPoolsLoading } = useQuery({
    queryKey: ["admin-all-pools"],
    queryFn: async () => {
      // Haal alle pools op (geen FK-joins die kunnen falen)
      const { data: poolsData, error: poolsError } = await supabase
        .from("pools")
        .select("id, name, created_at, privacy, invite_code, created_by, prize_text, scoring_rules_json")
        .order("created_at", { ascending: false });
      if (poolsError) throw poolsError;
      if (!poolsData || poolsData.length === 0) return [];

      // Haal aanmaker-namen op via profiles.user_id
      const creatorIds = [...new Set(poolsData.map((p: any) => p.created_by).filter(Boolean))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", creatorIds);
      const profileMap = new Map((profilesData || []).map((p: any) => [p.user_id, p.name]));

      // Haal ledenaantallen op per poule
      const { data: membersData } = await supabase
        .from("pool_members")
        .select("pool_id");
      const countMap = new Map<string, number>();
      (membersData || []).forEach((m: any) => {
        countMap.set(m.pool_id, (countMap.get(m.pool_id) || 0) + 1);
      });

      return poolsData.map((pool: any) => ({
        ...pool,
        profiles: { name: profileMap.get(pool.created_by) || null },
        pool_members: [{ count: countMap.get(pool.id) || 0 }],
      }));
    },
    enabled: isAdmin === true,
    staleTime: 60_000,
  });

  const { data: expandedPoolMembers, isLoading: expandedPoolMembersLoading } = useQuery({
    queryKey: ["admin-pool-members", expandedPool],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pool_members")
        .select("user_id, role, joined_at, profiles(name, avatar_url)")
        .eq("pool_id", expandedPool!);
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin === true && !!expandedPool,
    staleTime: 60_000,
  });

  const { data: adminUsers, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url, created_at")
        .order("created_at", { ascending: false });
      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) return [];

      const ids = profiles.map((p: any) => p.user_id);

      const { data: sessions } = await supabase
        .from("user_sessions")
        .select("user_id, login_at_utc, device_info, ip_address")
        .in("user_id", ids);

      const { data: memberships } = await supabase
        .from("pool_members")
        .select("user_id, pool_id")
        .in("user_id", ids);

      const sessionMap = new Map<string, { login_count: number; last_login_at: string | null; last_device: string | null; last_ip: string | null }>();
      (sessions || []).forEach((s: any) => {
        const e = sessionMap.get(s.user_id) || { login_count: 0, last_login_at: null, last_device: null, last_ip: null };
        e.login_count += 1;
        if (!e.last_login_at || s.login_at_utc > e.last_login_at) {
          e.last_login_at = s.login_at_utc;
          e.last_device = s.device_info || null;
          e.last_ip = s.ip_address || null;
        }
        sessionMap.set(s.user_id, e);
      });

      const poolCountMap = new Map<string, number>();
      (memberships || []).forEach((m: any) => {
        poolCountMap.set(m.user_id, (poolCountMap.get(m.user_id) || 0) + 1);
      });

      return profiles.map((p: any) => {
        const sess = sessionMap.get(p.user_id) || { login_count: 0, last_login_at: null, last_device: null, last_ip: null };
        const lastLogin = sess.last_login_at ? new Date(sess.last_login_at) : null;
        const registeredAt = p.created_at ? new Date(p.created_at) : null;
        const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
        return {
          id: p.user_id,
          name: p.name,
          avatar_url: p.avatar_url,
          created_at: p.created_at,
          login_count: sess.login_count,
          last_login_at: sess.last_login_at,
          last_device: sess.last_device,
          last_ip: sess.last_ip,
          pool_count: poolCountMap.get(p.user_id) || 0,
          is_active: (lastLogin && (Date.now() - lastLogin.getTime()) <= SEVEN_DAYS)
            || (registeredAt && (Date.now() - registeredAt.getTime()) <= SEVEN_DAYS),
        };
      });
    },
    enabled: isAdmin === true,
    staleTime: 60_000,
  });

  // Warnings: matches today without results
  const { data: warnings } = useQuery({
    queryKey: ["admin-warnings"],
    queryFn: async () => {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const { data: todayMatches } = await supabase
        .from("matches")
        .select("id, status")
        .gte("kickoff_utc", `${todayStr}T00:00:00Z`)
        .lte("kickoff_utc", `${todayStr}T23:59:59Z`);

      const needsResult = (todayMatches || []).filter(
        (m: any) => m.status === "scheduled" && new Date(m.kickoff_utc) < new Date()
      ).length;

      return { needsResult };
    },
    enabled: isAdmin === true,
    staleTime: 30_000,
  });

  const { data: globalRanking, isLoading: rankingLoading } = useQuery({
    queryKey: ["admin-global-ranking"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_global_ranking", { limit_count: 10 });
      if (error) throw error;
      return (data || []).map((row: any) => ({
        rank: Number(row.rank),
        user_id: row.user_id,
        total: Number(row.total_points),
        name: row.name || "Onbekend",
        avatar_url: row.avatar_url || null,
      }));
    },
    enabled: isAdmin === true,
    staleTime: 120_000,
  });

  // Alle wedstrijden voor analytics dropdown
  const { data: allMatchesForAnalytics } = useQuery({
    queryKey: ["admin-all-matches-analytics"],
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("id, kickoff_utc, status, home_score, away_score, home_team:teams!matches_home_team_id_fkey(short_name, flag_url), away_team:teams!matches_away_team_id_fkey(short_name, flag_url)")
        .order("kickoff_utc", { ascending: false });
      return data || [];
    },
    enabled: isAdmin === true && tab === "analytics",
    staleTime: 120_000,
  });

  // Voorspellingsverdeling per wedstrijd
  const { data: predDistribution, isLoading: distLoading } = useQuery({
    queryKey: ["admin-pred-dist", analyticsMatchId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_match_prediction_distribution", { p_match_id: analyticsMatchId });
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin === true && !!analyticsMatchId,
    staleTime: 60_000,
  });

  // Pool leden + punten (bij expand)
  const { data: poolMemberStats, isLoading: poolMemberStatsLoading } = useQuery({
    queryKey: ["admin-pool-member-stats", poolMembersExpanded],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_pool_leaderboard_admin", { p_pool_id: poolMembersExpanded });
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin === true && !!poolMembersExpanded,
    staleTime: 60_000,
  });

  // Bonus vragen
  const { data: bonusQuestions, isLoading: bonusLoading, refetch: refetchBonus } = useQuery({
    queryKey: ["admin-bonus-questions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bonus_questions")
        .select("*")
        .order("closes_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin === true && tab === "bonus",
    staleTime: 60_000,
  });

  // Berichten (alle poules)
  const { data: allMessages, isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
    queryKey: ["admin-all-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pool_messages")
        .select("id, message, created_at, user_id, pool_id, profiles(name), pools(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin === true && tab === "berichten",
    staleTime: 30_000,
  });

  // User roles (voor promote/demote)
  const { data: userRoles, refetch: refetchRoles } = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin === true && tab === "beheer",
    staleTime: 60_000,
  });

  const adminUserIds = useMemo(() => new Set((userRoles || []).filter((r: any) => r.role === "admin").map((r: any) => r.user_id)), [userRoles]);

  const errorLogs = useMemo(() => getErrorLogs(), [tab]);

  // Admin actions
  const recalcAll = useMutation({
    mutationFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("recalc-all");
        if (error) throw new Error(error.message || "Recalc mislukt");
        return data;
      } catch (e: any) {
        throw new Error(e?.message || "Onbekende fout bij herberekening");
      }
    },
    onSuccess: (data: any) => {
      const count = data?.matches_processed ?? "?";
      toast({ title: "Punten herberekend", description: `${count} wedstrijd(en) verwerkt.` });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" }),
  });

  const checkEarlyBird = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("check_early_bird");
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      const count = data?.[0]?.users_awarded ?? data?.users_awarded ?? 0;
      toast({ title: "Early Bird check", description: `${count} gebruiker(s) bonus toegekend.` });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
    onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" }),
  });

  const backupMutation = useMutation({
    mutationFn: createBackup,
    onSuccess: () => toast({ title: "Backup gedownload" }),
    onError: (err: any) => toast({ title: "Backup fout", description: err.message, variant: "destructive" }),
  });

  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (!restoreFile) throw new Error("Geen bestand geselecteerd");
      await restoreBackup(restoreFile);
    },
    onSuccess: () => {
      toast({ title: "Restore voltooid", description: "Data hersteld uit backup." });
      setRestoreFile(null);
      queryClient.invalidateQueries();
    },
    onError: (err: any) => toast({ title: "Restore fout", description: err.message, variant: "destructive" }),
  });

  const deletePool = useMutation({
    mutationFn: async (poolId: string) => {
      const { error } = await supabase.rpc("admin_delete_pool", { p_pool_id: poolId });
      if (error) throw error;
      return poolId;
    },
    onSuccess: () => {
      toast({ title: "Pool verwijderd" });
      queryClient.invalidateQueries({ queryKey: ["admin-pools"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" }),
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "delete", user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return userId;
    },
    onSuccess: () => {
      toast({ title: "Gebruiker verwijderd" });
      refetchUsers();
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" }),
  });

  // Poule bewerken opslaan
  const updatePool = useMutation({
    mutationFn: async (poolId: string) => {
      const { error } = await supabase.from("pools").update({
        name: editPoolName,
        privacy: editPoolPrivacy,
        prize_text: editPoolPrize || null,
        scoring_rules_json: {
          exact: Number(editPoolExact),
          goal_diff: Number(editPoolGoalDiff),
          result: Number(editPoolResult),
        },
      }).eq("id", poolId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Poule bijgewerkt" });
      setEditingPool(null);
      queryClient.invalidateQueries({ queryKey: ["admin-all-pools"] });
    },
    onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" }),
  });

  // Lid verwijderen uit poule
  const kickMember = useMutation({
    mutationFn: async ({ poolId, userId }: { poolId: string; userId: string }) => {
      const { error } = await supabase.from("pool_members").delete().eq("pool_id", poolId).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Lid verwijderd" });
      queryClient.invalidateQueries({ queryKey: ["admin-pool-member-stats", poolMembersExpanded] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-pools"] });
    },
    onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" }),
  });

  // Invite code resetten
  const resetInviteCode = useMutation({
    mutationFn: async (poolId: string) => {
      const { data, error } = await supabase.rpc("admin_reset_invite_code", { p_pool_id: poolId });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (newCode) => {
      toast({ title: "Invite code gereset", description: `Nieuwe code: ${newCode}` });
      queryClient.invalidateQueries({ queryKey: ["admin-all-pools"] });
    },
    onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" }),
  });

  // Gebruiker promoveren naar admin
  const promoteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("user_roles").upsert({ user_id: userId, role: "admin" });
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Admin-rol toegekend" }); refetchRoles(); },
    onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" }),
  });

  // Gebruiker degraderen
  const demoteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Admin-rol verwijderd" }); refetchRoles(); },
    onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" }),
  });

  // Concept-uitslagen (draft systeem)
  const { data: resultDrafts, isLoading: draftsLoading, refetch: refetchDrafts } = useQuery({
    queryKey: ["admin-result-drafts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_result_drafts")
        .select("id, match_id, home_score, away_score, source, note, created_at, status, matches(kickoff_utc, home_team:teams!matches_home_team_id_fkey(name, short_name, flag_url), away_team:teams!matches_away_team_id_fkey(name, short_name, flag_url))")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin === true,
    staleTime: 30_000,
  });

  const confirmDraft = useMutation({
    mutationFn: async (draft: any) => {
      const { error: matchErr } = await supabase.from("matches").update({
        home_score: draft.home_score,
        away_score: draft.away_score,
        status: "finished",
        needs_recalc: true,
      }).eq("id", draft.match_id);
      if (matchErr) throw matchErr;
      const { error: draftErr } = await supabase.from("match_result_drafts")
        .update({ status: "confirmed" })
        .eq("id", draft.id);
      if (draftErr) throw draftErr;
    },
    onSuccess: () => {
      toast({ title: "Uitslag bevestigd", description: "Punten worden automatisch herberekend." });
      refetchDrafts();
      queryClient.invalidateQueries({ queryKey: ["admin-warnings"] });
    },
    onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" }),
  });

  const rejectDraft = useMutation({
    mutationFn: async (draftId: string) => {
      const { error } = await supabase.from("match_result_drafts")
        .update({ status: "rejected" })
        .eq("id", draftId);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Concept afgewezen" }); refetchDrafts(); },
    onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" }),
  });

  // Bonus punten toekennen
  const awardBonus = useMutation({
    mutationFn: async ({ questionId, answer }: { questionId: string; answer: string }) => {
      const { data, error } = await supabase.rpc("admin_award_bonus_points", {
        p_question_id: questionId,
        p_correct_answer: answer,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      toast({ title: "Bonuspunten toegekend", description: `${count} voorspelling(en) beloond.` });
      refetchBonus();
    },
    onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" }),
  });

  // Bericht verwijderen
  const deleteMessage = useMutation({
    mutationFn: async (msgId: string) => {
      const { error } = await supabase.from("pool_messages").delete().eq("id", msgId);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Bericht verwijderd" }); refetchMessages(); },
    onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" }),
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!roleLoading && isAdmin === false) navigate("/app");
  }, [roleLoading, isAdmin, navigate]);

  // useMemo hooks moeten VOOR de conditional return staan (Rules of Hooks)
  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    const list = adminUsers || [];
    if (!q) return list;
    return list.filter((u: any) =>
      u.name?.toLowerCase().includes(q) ||
      u.id?.toLowerCase().includes(q) ||
      u.last_ip?.toLowerCase().includes(q)
    );
  }, [adminUsers, userSearch]);

  const filteredPools = useMemo(() => {
    const q = poolSearch.trim().toLowerCase();
    const list = pools || [];
    if (!q) return list;
    return list.filter((p: any) => p.name?.toLowerCase().includes(q) || p.id?.toLowerCase().includes(q));
  }, [pools, poolSearch]);

  const filteredAllPools = useMemo(() => {
    const q = poolSearch.trim().toLowerCase();
    const list = allPools || [];
    if (!q) return list;
    return list.filter((p: any) =>
      p.name?.toLowerCase().includes(q) ||
      p.id?.toLowerCase().includes(q) ||
      p.profiles?.name?.toLowerCase().includes(q)
    );
  }, [allPools, poolSearch]);

  const topLogins = useMemo(() => {
    return [...(adminUsers || [])]
      .sort((a: any, b: any) => (b.login_count || 0) - (a.login_count || 0))
      .slice(0, 5);
  }, [adminUsers]);

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

  const tabs: { key: TabKey; label: string; icon?: any }[] = [
    { key: "overview",   label: "Overzicht" },
    { key: "scores",     label: resultDrafts && resultDrafts.length > 0 ? `Wedstrijden (${resultDrafts.length})` : "Wedstrijden" },
    { key: "poules",     label: "Poules" },
    { key: "beheer",     label: "Gebruikers" },
    { key: "analytics",  label: "Analytics" },
    { key: "bonus",      label: "Bonus" },
    { key: "berichten",  label: "Berichten" },
    { key: "ranglijst",  label: "Ranglijst" },
    { key: "stats",      label: "Stats" },
    { key: "systeem",    label: "Systeem" },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-5 pb-8">
      <Link to="/app/profile" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
        <ArrowLeft className="h-4 w-4" /> Terug
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Admin</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Clock className="h-3 w-3" />
            {dataUpdatedAt ? formatNLDateTime(new Date(dataUpdatedAt).toISOString()) : "..."}
          </p>
        </div>
        <Badge className="gradient-primary text-primary-foreground">Admin</Badge>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
              tab === t.key ? "gradient-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ==================== OVERVIEW TAB ==================== */}
      {tab === "overview" && (
        <div className="space-y-5">
          {/* System Status */}
          <div className="grid grid-cols-3 gap-2">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3 text-center">
                <Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-bold font-display">{stats?.total_users ?? "..."}</p>
                <p className="text-[10px] text-muted-foreground">Gebruikers</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3 text-center">
                <Trophy className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-bold font-display">{stats?.total_pools ?? "..."}</p>
                <p className="text-[10px] text-muted-foreground">Poules</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3 text-center">
                <Target className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-bold font-display">{stats?.predictions_today ?? "..."}</p>
                <p className="text-[10px] text-muted-foreground">Vandaag</p>
              </CardContent>
            </Card>
          </div>

          {/* Warnings */}
          {warnings && warnings.needsResult > 0 && (
            <Card className="border-0 shadow-sm border-l-4 border-l-amber-500">
              <CardContent className="p-3 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{warnings.needsResult} wedstrijd(en) vandaag nog geen resultaat</p>
                  <button onClick={() => setTab("scores")} className="text-xs text-primary font-medium mt-0.5">
                    Resultaten invullen →
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error alerts */}
          {errorLogs.filter(l => l.type === "error").length > 0 && (
            <Card className="border-0 shadow-sm border-l-4 border-l-destructive">
              <CardContent className="p-3 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                <div>
                  <p className="text-sm font-medium">{errorLogs.filter(l => l.type === "error").length} client error(s)</p>
                  <p className="text-[10px] text-muted-foreground">
                    Laatste: {errorLogs.filter(l => l.type === "error")[0]?.message?.slice(0, 60)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Links */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Snelle navigatie</h2>
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: "scores", icon: CheckCircle2, label: "Resultaten", sub: "Scores invoeren" },
                { key: "poules", icon: Trophy, label: "Poules", sub: "Alle poules" },
                { key: "beheer", icon: Users, label: "Gebruikers", sub: "Accounts beheren" },
                { key: "systeem", icon: Settings, label: "Systeem", sub: "Tools & backup" },
              ] as const).map(({ key, icon: Icon, label, sub }) => (
                <Button
                  key={key}
                  variant="outline"
                  className="h-auto py-3 px-3 flex items-center gap-2 justify-start"
                  onClick={() => setTab(key)}
                >
                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-medium">{label}</p>
                    <p className="text-[10px] text-muted-foreground">{sub}</p>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== SCORES TAB ==================== */}
      {tab === "scores" && (
        <div className="space-y-3">
          <Card className="border-0 shadow-sm bg-muted/50">
            <CardContent className="p-3 text-xs text-muted-foreground space-y-1">
              <p><strong>Scoring:</strong> Exact = 6 pt | Doelverschil = 4 pt | Resultaat = 3 pt</p>
              <p><strong>Workflow:</strong> Zoek wedstrijd → vul score in → opslaan. Punten worden automatisch herberekend.</p>
            </CardContent>
          </Card>

          {/* Concept-uitslagen van het dagelijks script */}
          {(draftsLoading || (resultDrafts && resultDrafts.length > 0)) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Concept-uitslagen
                  {resultDrafts && resultDrafts.length > 0 && (
                    <Badge className="bg-amber-500/20 text-amber-700 border-amber-300 text-[10px] px-1.5 py-0">
                      {resultDrafts.length}
                    </Badge>
                  )}
                </p>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => refetchDrafts()}>
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
              {draftsLoading ? (
                <div className="space-y-2">
                  {[1, 2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
                </div>
              ) : (
                (resultDrafts || []).map((draft: any) => {
                  const home = draft.matches?.home_team;
                  const away = draft.matches?.away_team;
                  const kickoff = draft.matches?.kickoff_utc;
                  return (
                    <Card key={draft.id} className="border-0 shadow-sm border-l-4 border-l-amber-400 overflow-hidden">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <p className="text-sm font-semibold">
                              {home?.short_name ?? "?"} {draft.home_score} – {draft.away_score} {away?.short_name ?? "?"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {home?.name ?? "?"} vs {away?.name ?? "?"}
                            </p>
                            {kickoff && (
                              <p className="text-[10px] text-muted-foreground">{formatNLDateTime(kickoff)}</p>
                            )}
                            {draft.note && (
                              <p className="text-[10px] text-muted-foreground italic">{draft.note}</p>
                            )}
                            <p className="text-[10px] text-muted-foreground">
                              Ingediend: {formatNLDateTime(draft.created_at)} · bron: {draft.source}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => confirmDraft.mutate(draft)}
                              disabled={confirmDraft.isPending || rejectDraft.isPending}
                            >
                              Bevestigen
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs border-red-300 text-red-600 hover:bg-red-50"
                              onClick={() => rejectDraft.mutate(draft.id)}
                              disabled={confirmDraft.isPending || rejectDraft.isPending}
                            >
                              Afwijzen
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          <AdminMatchEditor />
        </div>
      )}

      {/* ==================== STATS TAB ==================== */}
      {tab === "stats" && (
        <div className="space-y-4">
          {statsLoading || !stats ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Accounts</p>
                    <p className="text-xl font-bold font-display">{stats.total_users}</p>
                    <p className="text-[10px] text-muted-foreground">Vandaag: {stats.users_today} | 7d: {stats.users_7d}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Actief (7d)</p>
                    <p className="text-xl font-bold font-display">{stats.logins_7d}</p>
                    <p className="text-[10px] text-muted-foreground">Vandaag: {stats.logins_today} | 30d: {stats.logins_30d}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Poules</p>
                    <p className="text-xl font-bold font-display">{stats.total_pools}</p>
                    <p className="text-[10px] text-muted-foreground">Gem: {stats.avg_members_per_pool} leden</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Voorspellingen</p>
                    <p className="text-xl font-bold font-display">{stats.total_predictions}</p>
                    <p className="text-[10px] text-muted-foreground">Vandaag: {stats.predictions_today} | 7d: {stats.predictions_7d}</p>
                  </CardContent>
                </Card>
              </div>

              {stats.top_pools && stats.top_pools.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground mb-2">Top Poules</h2>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-0">
                      {stats.top_pools.map((pool, i) => (
                        <div key={i} className={`flex items-center justify-between p-3 ${i < stats.top_pools.length - 1 ? "border-b border-border/50" : ""}`}>
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

              {/* Error Logs */}
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground mb-2">Client Errors</h2>
                {errorLogs.length === 0 ? (
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center text-sm text-muted-foreground">
                      Geen errors
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
                    {errorLogs.slice(0, 20).map((log, i) => (
                      <Card key={i} className={`border-0 shadow-sm ${log.type === "error" ? "border-l-2 border-l-destructive" : "border-l-2 border-l-muted"}`}>
                        <CardContent className="p-2.5">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Badge variant={log.type === "error" ? "destructive" : "outline"} className="text-[9px] px-1.5 py-0">
                              {log.type}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString("nl-NL")}</span>
                          </div>
                          <p className="text-xs font-medium truncate">{log.message}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ==================== POULES TAB ==================== */}
      {tab === "poules" && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek poule of aanmaker..."
              value={poolSearch}
              onChange={(e) => setPoolSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {filteredAllPools.length} van {allPools?.length ?? 0} poule{(allPools?.length ?? 0) !== 1 ? "s" : ""}
          </p>
          {allPoolsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : filteredAllPools.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center text-sm text-muted-foreground">
                Geen poules gevonden.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredAllPools.map((p: any) => {
                const memberCount = p.pool_members?.[0]?.count ?? 0;
                const isExpanded = expandedPool === p.id;
                return (
                  <Card key={p.id} className="border-0 shadow-sm">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium truncate">{p.name}</p>
                            <Badge variant={p.privacy === "public" ? "secondary" : "outline"} className="text-[9px] px-1.5 py-0 shrink-0">
                              {p.privacy === "public" ? "Publiek" : "Privé"}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Aangemaakt: {formatNLDate(p.created_at)} · {memberCount} {memberCount === 1 ? "lid" : "leden"}
                            {p.profiles?.name && <span className="ml-1">· door {p.profiles.name}</span>}
                          </p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2"
                            onClick={() => {
                              setEditingPool(p);
                              setEditPoolName(p.name);
                              setEditPoolPrivacy(p.privacy || "private");
                              setEditPoolPrize(p.prize_text || "");
                              const rules = p.scoring_rules_json || {};
                              setEditPoolExact(String(rules.exact ?? 6));
                              setEditPoolGoalDiff(String(rules.goal_diff ?? 4));
                              setEditPoolResult(String(rules.result ?? 3));
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2"
                            onClick={() => setPoolMembersExpanded(poolMembersExpanded === p.id ? null : p.id)}
                          >
                            {poolMembersExpanded === p.id ? "Inklappen" : "Leden"}
                          </Button>
                        </div>
                      </div>

                      {/* Pool bewerken dialog */}
                      <Dialog open={editingPool?.id === p.id} onOpenChange={(open) => !open && setEditingPool(null)}>
                        <DialogContent className="max-w-sm">
                          <DialogHeader>
                            <DialogTitle>Poule bewerken</DialogTitle>
                            <DialogDescription>{p.name}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3 pt-1">
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-muted-foreground">Naam</label>
                              <Input value={editPoolName} onChange={e => setEditPoolName(e.target.value)} className="h-9" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-muted-foreground">Zichtbaarheid</label>
                              <Select value={editPoolPrivacy} onValueChange={setEditPoolPrivacy}>
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="private">Privé</SelectItem>
                                  <SelectItem value="public">Publiek</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-muted-foreground">Prijs omschrijving</label>
                              <Input value={editPoolPrize} onChange={e => setEditPoolPrize(e.target.value)} className="h-9" placeholder="bijv. Fles wijn" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-muted-foreground">Puntentelling</label>
                              <div className="grid grid-cols-3 gap-2">
                                {[
                                  { label: "Exact", value: editPoolExact, set: setEditPoolExact },
                                  { label: "Doelversch.", value: editPoolGoalDiff, set: setEditPoolGoalDiff },
                                  { label: "Uitslag", value: editPoolResult, set: setEditPoolResult },
                                ].map(({ label, value, set }) => (
                                  <div key={label} className="space-y-0.5">
                                    <label className="text-[10px] text-muted-foreground">{label}</label>
                                    <Input type="number" min={0} max={20} value={value} onChange={e => set(e.target.value)} className="h-8 text-center text-sm" />
                                  </div>
                                ))}
                              </div>
                            </div>
                            <Button className="w-full gradient-primary text-primary-foreground"
                              onClick={() => updatePool.mutate(p.id)} disabled={updatePool.isPending}>
                              {updatePool.isPending ? "Opslaan..." : "Opslaan"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {/* Leden met punten */}
                      {poolMembersExpanded === p.id && (
                        <div className="pt-2 border-t border-border/50 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Leden & Punten</p>
                            <button
                              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                              onClick={() => { resetInviteCode.mutate(p.id); }}
                              disabled={resetInviteCode.isPending}
                            >
                              <RotateCcw className="h-3 w-3" /> Reset invite
                            </button>
                          </div>
                          {poolMemberStatsLoading ? (
                            <div className="space-y-1">{[1,2].map(i => <Skeleton key={i} className="h-7 rounded-lg" />)}</div>
                          ) : (poolMemberStats || []).length === 0 ? (
                            <p className="text-xs text-muted-foreground py-1">Geen leden.</p>
                          ) : (
                            (poolMemberStats as any[]).map((m: any, idx: number) => (
                              <div key={m.user_id} className="flex items-center justify-between gap-2 text-xs py-1 border-b border-border/30 last:border-0">
                                <span className="text-muted-foreground w-5 shrink-0">#{idx + 1}</span>
                                <span className="truncate font-medium flex-1">{m.name || m.user_id.slice(0, 8)}</span>
                                <span className="font-bold text-primary shrink-0">{m.total_points} pt</span>
                                <Badge variant={m.role === "admin" ? "default" : "outline"} className="text-[9px] px-1.5 py-0 shrink-0">{m.role}</Badge>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <button className="text-destructive hover:opacity-70 shrink-0 ml-1">
                                      <LogOut className="h-3.5 w-3.5" />
                                    </button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Lid verwijderen?</AlertDialogTitle>
                                      <AlertDialogDescription>{m.name} uit {p.name} verwijderen?</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annuleren</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => kickMember.mutate({ poolId: p.id, userId: m.user_id })}>Verwijderen</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            ))
                          )}
                          <div className="flex gap-1.5 pt-1">
                            <Button variant="outline" size="sm" className="h-7 text-[10px] flex-1"
                              onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/join/${p.invite_code}`); toast({ title: "Link gekopieerd!" }); }}>
                              <Copy className="h-3 w-3 mr-1" /> Invite link
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="h-7 text-[10px]">
                                  <Trash2 className="h-3 w-3 mr-1" /> Verwijder poule
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Poule verwijderen?</AlertDialogTitle>
                                  <AlertDialogDescription>Alle data gaat verloren. Weet je het zeker?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuleren</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deletePool.mutate(p.id)}>Verwijderen</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== RANGLIJST TAB ==================== */}
      {tab === "ranglijst" && (
        <div className="space-y-3">
          <Card className="border-0 shadow-sm bg-muted/50">
            <CardContent className="p-3 text-xs text-muted-foreground">
              Top 10 gebruikers op basis van totale punten over alle poules (één maal per wedstrijd, hoogste score telt).
            </CardContent>
          </Card>
          {rankingLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
            </div>
          ) : (globalRanking || []).length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center text-sm text-muted-foreground">
                Nog geen punten beschikbaar.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {(globalRanking || []).map((entry: any) => {
                const medal = entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : null;
                return (
                  <Card key={entry.user_id} className={`border-0 shadow-sm ${entry.rank <= 3 ? "border-l-4 " + (entry.rank === 1 ? "border-l-yellow-400" : entry.rank === 2 ? "border-l-slate-400" : "border-l-amber-600") : ""}`}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                        {medal || `#${entry.rank}`}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{entry.name}</p>
                        <p className="text-[10px] text-muted-foreground">Rang #{entry.rank}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-base font-bold font-display text-primary">{entry.total}</p>
                        <p className="text-[10px] text-muted-foreground">punten</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== BEHEER TAB ==================== */}
      {tab === "beheer" && (
        <div className="space-y-5">
          {/* Navigatiekaarten naar aparte pagina's */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Beheer</h2>
            <Link to="/app/admin/users">
              <Card className="border-0 shadow-sm hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-semibold text-sm">Gebruikers</p>
                      <p className="text-xs text-muted-foreground">
                        {adminUsers ? `${adminUsers.length} gebruikers · ${adminUsers.filter((u: any) => u.is_active).length} actief` : "Laden..."}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
            <Link to="/app/admin/activity">
              <Card className="border-0 shadow-sm hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-semibold text-sm">Activiteitenlog</p>
                      <p className="text-xs text-muted-foreground">Registraties, logins en nieuwe poules</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Pools</h2>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoek pool..."
                value={poolSearch}
                onChange={(e) => setPoolSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {filteredPools.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center text-sm text-muted-foreground">
                  Geen pools gevonden.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredPools.map((p: any) => (
                  <Card key={p.id} className="border-0 shadow-sm">
                    <CardContent className="p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{p.id}</p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="shrink-0"
                            disabled={deletePool.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Pool verwijderen?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Dit verwijdert de pool en alle bijbehorende data. Weet je het zeker?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuleren</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deletePool.mutate(p.id)}>Verwijderen</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== ANALYTICS TAB ==================== */}
      {tab === "analytics" && (
        <div className="space-y-4">
          <Card className="border-0 shadow-sm bg-muted/50">
            <CardContent className="p-3 text-xs text-muted-foreground">
              Selecteer een wedstrijd om te zien hoe gebruikers hebben voorspeld.
            </CardContent>
          </Card>
          <Select value={analyticsMatchId} onValueChange={setAnalyticsMatchId}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Kies een wedstrijd..." />
            </SelectTrigger>
            <SelectContent>
              {(allMatchesForAnalytics || []).map((m: any) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.home_team?.flag_url} {m.home_team?.short_name} vs {m.away_team?.flag_url} {m.away_team?.short_name}
                  {m.home_score != null ? ` (${m.home_score}-${m.away_score})` : ""} · {formatNLDate(m.kickoff_utc)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {analyticsMatchId && (
            <>
              {distLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>
              ) : (predDistribution || []).length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4 text-center text-sm text-muted-foreground">Nog geen voorspellingen.</CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">
                    {(predDistribution as any[]).reduce((s: number, r: any) => s + Number(r.cnt), 0)} unieke voorspellers
                  </p>
                  {(predDistribution as any[]).map((row: any, i: number) => {
                    const selectedMatch = (allMatchesForAnalytics || []).find((m: any) => m.id === analyticsMatchId);
                    const isExact = selectedMatch?.home_score === row.home_pred && selectedMatch?.away_score === row.away_pred;
                    return (
                      <Card key={i} className={`border-0 shadow-sm ${isExact ? "border-l-4 border-l-primary" : ""}`}>
                        <CardContent className="p-3 flex items-center gap-3">
                          <span className="text-sm font-bold font-display w-16 text-center shrink-0">
                            {row.home_pred} – {row.away_pred}
                          </span>
                          <div className="flex-1">
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div className="h-2 rounded-full gradient-primary" style={{ width: `${row.pct}%` }} />
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0 w-20 text-right">
                            {row.cnt}× ({row.pct}%)
                          </span>
                          {isExact && <Badge className="gradient-primary text-primary-foreground text-[9px] shrink-0">Exact</Badge>}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ==================== BONUS TAB ==================== */}
      {tab === "bonus" && (
        <div className="space-y-4">
          <Card className="border-0 shadow-sm bg-muted/50">
            <CardContent className="p-3 text-xs text-muted-foreground">
              Vul het correcte antwoord in en klik "Toekennen" om bonuspunten automatisch te verdelen.
            </CardContent>
          </Card>
          {bonusLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : (bonusQuestions || []).length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center text-sm text-muted-foreground">Geen bonusvragen gevonden.</CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {(bonusQuestions || []).map((q: any) => {
                const closed = new Date(q.closes_at) < new Date();
                const answered = !!q.correct_answer;
                return (
                  <Card key={q.id} className={`border-0 shadow-sm ${answered ? "border-l-4 border-l-primary" : closed ? "border-l-4 border-l-amber-400" : ""}`}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium flex-1">{q.question}</p>
                        <div className="flex gap-1 shrink-0">
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0">{q.points} pt</Badge>
                          <Badge variant={answered ? "secondary" : closed ? "destructive" : "outline"} className="text-[9px] px-1.5 py-0">
                            {answered ? "Beantwoord" : closed ? "Gesloten" : "Open"}
                          </Badge>
                        </div>
                      </div>
                      {q.correct_answer && (
                        <p className="text-[10px] text-primary font-medium">✓ Antwoord: {q.correct_answer}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">Sluit: {formatNLDateTime(q.closes_at)}</p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Correct antwoord..."
                          value={bonusAnswers[q.id] ?? q.correct_answer ?? ""}
                          onChange={(e) => setBonusAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                          className="h-8 text-xs flex-1"
                        />
                        <Button
                          size="sm" className="h-8 text-xs gradient-primary text-primary-foreground shrink-0"
                          disabled={awardBonus.isPending || !bonusAnswers[q.id]}
                          onClick={() => awardBonus.mutate({ questionId: q.id, answer: bonusAnswers[q.id] })}
                        >
                          Toekennen
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== BERICHTEN TAB ==================== */}
      {tab === "berichten" && (
        <div className="space-y-3">
          <div className="flex gap-2 items-center">
            <Select value={msgPoolFilter} onValueChange={setMsgPoolFilter}>
              <SelectTrigger className="h-9 flex-1 text-xs">
                <SelectValue placeholder="Alle poules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle poules</SelectItem>
                {[...new Map((allMessages || []).map((m: any) => [m.pool_id, m.pools?.name])).entries()].map(([pid, pname]) => (
                  <SelectItem key={pid} value={pid}>{pname || pid}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-9" onClick={() => refetchMessages()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{(allMessages || []).length} recente berichten</p>
          {messagesLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : (
            <div className="space-y-2">
              {(allMessages || [])
                .filter((m: any) => msgPoolFilter === "all" || m.pool_id === msgPoolFilter)
                .map((m: any) => (
                  <Card key={m.id} className="border-0 shadow-sm">
                    <CardContent className="p-3 flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium">{(m.profiles as any)?.name || "?"}</span>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0">{(m.pools as any)?.name}</Badge>
                          <span className="text-[10px] text-muted-foreground">{formatNLDateTime(m.created_at)}</span>
                        </div>
                        <p className="text-sm mt-0.5 break-words">{m.message}</p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="shrink-0 h-7 w-7 p-0 text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Bericht verwijderen?</AlertDialogTitle>
                            <AlertDialogDescription>Dit kan niet ongedaan worden gemaakt.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuleren</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMessage.mutate(m.id)}>Verwijderen</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== SYSTEEM TAB ==================== */}
      {tab === "systeem" && (
        <div className="space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Systeemtools</h2>
            <div className="space-y-2">
              <ConfirmedAction
                label="Punten herberekenen"
                description="Herbereken points_awarded voor alle gebruikers."
                icon={RefreshCw}
                onConfirm={() => recalcAll.mutate()}
                isPending={recalcAll.isPending}
              />
              <ConfirmedAction
                label="Check Early Bird"
                description="Ken +10 bonus toe aan gebruikers die alles ingevuld hebben."
                icon={UserCheck}
                onConfirm={() => checkEarlyBird.mutate()}
                isPending={checkEarlyBird.isPending}
              />
              <Button
                variant="outline"
                className="h-auto py-3 px-4 flex items-center gap-3 w-full justify-start"
                onClick={() => backupMutation.mutate()}
                disabled={backupMutation.isPending}
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Download className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">{backupMutation.isPending ? "Downloaden..." : "Download backup"}</p>
                  <p className="text-[10px] text-muted-foreground">Alle data als JSON downloaden</p>
                </div>
              </Button>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Backup herstellen</h2>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <FileJson className="h-4 w-4 text-muted-foreground" />
                  <input type="file" accept=".json" onChange={(e) => setRestoreFile(e.target.files?.[0] || null)} className="text-xs" />
                </div>
                {restoreFile && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="w-full" disabled={restoreMutation.isPending}>
                        {restoreMutation.isPending ? "Herstellen..." : `Herstel uit ${restoreFile.name}`}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Backup herstellen?</AlertDialogTitle>
                        <AlertDialogDescription>Dit overschrijft bestaande data. Weet je het zeker?</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuleren</AlertDialogCancel>
                        <AlertDialogAction onClick={() => restoreMutation.mutate()}>Herstellen</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Error logs */}
          {errorLogs.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">Client error logs</h2>
              <div className="space-y-1">
                {errorLogs.slice(0, 20).map((log: any, i: number) => (
                  <Card key={i} className="border-0 shadow-sm">
                    <CardContent className="p-2 flex items-center gap-2">
                      <Badge variant={log.type === "error" ? "destructive" : "outline"} className="text-[9px] shrink-0">
                        {log.type}
                      </Badge>
                      <p className="text-xs font-medium truncate">{log.message}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
