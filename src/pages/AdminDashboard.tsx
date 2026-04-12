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
  AlertTriangle, FileJson,
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
  const [tab, setTab] = useState<"overview" | "scores" | "stats" | "beheer">("overview");
  const [defaultPoolId, setDefaultPoolId] = useState<string>("");
  const [defaultsFrom, setDefaultsFrom] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [defaultsTo, setDefaultsTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [userSearch, setUserSearch] = useState("");
  const [poolSearch, setPoolSearch] = useState("");

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

  const { data: adminUsers, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "list", limit: 500, offset: 0 },
      });
      if (error) throw error;
      return (data?.users || []) as any[];
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

  const errorLogs = useMemo(() => getErrorLogs(), [tab]);

  // Admin actions
  const fillDefaults = useMutation({
    mutationFn: async () => {
      if (!defaultPoolId) throw new Error("Kies een pool");
      const fromUtc = `${defaultsFrom}T00:00:00Z`;
      const toUtc = `${defaultsTo}T23:59:59Z`;
      if (new Date(fromUtc) > new Date(toUtc)) {
        throw new Error("Van-datum moet voor de t/m datum liggen");
      }
      const dayDiff = Math.ceil((new Date(toUtc).getTime() - new Date(fromUtc).getTime()) / (1000 * 60 * 60 * 24));
      if (dayDiff > 2) {
        throw new Error("Maximaal 2 dagen bereik toegestaan");
      }
      const { data, error } = await supabase.rpc("fill_default_predictions_for_range", {
        p_pool_id: defaultPoolId,
        p_from: fromUtc,
        p_to: toUtc,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      const count = data?.[0]?.inserted_count ?? data?.inserted_count ?? 0;
      toast({ title: "Standaard 0-0 ingevuld", description: `${count} voorspellingen aangemaakt.` });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" }),
  });

  const recalcAll = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("recalc-all");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Punten herberekend", description: "Alle punten zijn opnieuw berekend." });
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
    { key: "overview" as const, label: "Overzicht" },
    { key: "scores" as const, label: "Resultaten" },
    { key: "stats" as const, label: "Stats" },
    { key: "beheer" as const, label: "Beheer" },
  ];

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    const list = adminUsers || [];
    if (!q) return list;
    return list.filter((u: any) =>
      u.email?.toLowerCase().includes(q) ||
      u.name?.toLowerCase().includes(q) ||
      u.id?.toLowerCase().includes(q)
    );
  }, [adminUsers, userSearch]);

  const filteredPools = useMemo(() => {
    const q = poolSearch.trim().toLowerCase();
    const list = pools || [];
    if (!q) return list;
    return list.filter((p: any) => p.name?.toLowerCase().includes(q) || p.id?.toLowerCase().includes(q));
  }, [pools, poolSearch]);

  const topLogins = useMemo(() => {
    return [...(adminUsers || [])]
      .sort((a: any, b: any) => (b.login_count || 0) - (a.login_count || 0))
      .slice(0, 5);
  }, [adminUsers]);

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

          {/* Quick Actions */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Snelle acties</h2>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="h-auto py-3 px-4 flex items-center gap-3 w-full justify-start"
                onClick={() => setTab("scores")}
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Resultaten invullen</p>
                  <p className="text-[10px] text-muted-foreground">Scores handmatig invoeren</p>
                </div>
              </Button>

              <ConfirmedAction
                label="Punten herberekenen"
                description="Herbereken points_awarded voor alle gebruikers."
                icon={RefreshCw}
                onConfirm={() => recalcAll.mutate()}
                isPending={recalcAll.isPending}
              />

              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Standaard 0-0 invullen</p>
                    <p className="text-[10px] text-muted-foreground">Alleen voor gemiste voorspellingen in een gekozen periode.</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Pool</p>
                    <Select value={defaultPoolId} onValueChange={setDefaultPoolId}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Kies een pool" />
                      </SelectTrigger>
                      <SelectContent>
                        {(pools || []).map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Van</p>
                      <Input type="date" value={defaultsFrom} onChange={(e) => setDefaultsFrom(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Tot</p>
                      <Input type="date" value={defaultsTo} onChange={(e) => setDefaultsTo(e.target.value)} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const today = new Date().toISOString().slice(0, 10);
                        setDefaultsFrom(today);
                        setDefaultsTo(today);
                      }}
                    >
                      Vandaag
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          className="gradient-primary text-primary-foreground"
                          disabled={!defaultPoolId || fillDefaults.isPending}
                        >
                          {fillDefaults.isPending ? "Bezig..." : "0-0 invullen"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Standaard 0-0 invullen</AlertDialogTitle>
                          <AlertDialogDescription>
                            Pool: {pools?.find((p: any) => p.id === defaultPoolId)?.name || "Onbekend"}
                            <br />
                            Periode: {defaultsFrom} t/m {defaultsTo}
                            <br />
                            Weet je het zeker? (max 2 dagen)
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuleren</AlertDialogCancel>
                          <AlertDialogAction onClick={() => fillDefaults.mutate()}>Bevestigen</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>

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

          {/* Restore Backup */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Backup herstellen</h2>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <FileJson className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                    className="text-xs"
                  />
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
                        <AlertDialogDescription>
                          Dit overschrijft bestaande data. Weet je het zeker?
                        </AlertDialogDescription>
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

      {/* ==================== BEHEER TAB ==================== */}
      {tab === "beheer" && (
        <div className="space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Gebruikers</h2>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoek op naam, email of id..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {usersLoading ? (
              <Skeleton className="h-24 rounded-xl" />
            ) : (
              <div className="space-y-2">
                {filteredUsers.length === 0 ? (
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center text-sm text-muted-foreground">
                      Geen gebruikers gevonden.
                    </CardContent>
                  </Card>
                ) : (
                  filteredUsers.map((u: any) => {
                    const lastLogin = u.last_login_at ? new Date(u.last_login_at) : null;
                    const isActive = lastLogin ? (Date.now() - lastLogin.getTime()) <= 7 * 24 * 60 * 60 * 1000 : false;
                    const isSelf = user?.id === u.id;
                    return (
                      <Card key={u.id} className="border-0 shadow-sm">
                        <CardContent className="p-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{u.name || u.email || "Onbekend"}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{u.email || u.id}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={isActive ? "secondary" : "outline"} className="text-[9px] px-1.5 py-0">
                                {isActive ? "Actief (7d)" : "Inactief"}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">Logins: {u.login_count ?? 0}</span>
                              <span className="text-[10px] text-muted-foreground">Pools: {u.pool_count ?? 0}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Laatste login: {u.last_login_at ? formatNLDateTime(u.last_login_at) : "—"}
                            </p>
                            {u.last_device && (
                              <p className="text-[10px] text-muted-foreground truncate">
                                Device: {u.last_device}
                              </p>
                            )}
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="shrink-0"
                                disabled={deleteUser.isPending || isSelf}
                                title={isSelf ? "Je kunt jezelf niet verwijderen" : "Gebruiker verwijderen"}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Gebruiker verwijderen?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Dit verwijdert alle data van deze gebruiker (predictions, pools en berichten).
                                  Weet je het zeker?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuleren</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteUser.mutate(u.id)}>Verwijderen</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            )}

            {topLogins.length > 0 && (
              <Card className="border-0 shadow-sm mt-3">
                <CardContent className="p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Meest ingelogd</p>
                  <div className="space-y-1">
                    {topLogins.map((u: any, i: number) => (
                      <div key={u.id} className="flex items-center justify-between text-xs">
                        <span className="truncate">{i + 1}. {u.name || u.email || "Onbekend"}</span>
                        <span className="text-muted-foreground">{u.login_count ?? 0} logins</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
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
    </div>
  );
}
