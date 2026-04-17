import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Search, Trash2, Crown, RefreshCw, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { formatNLDateTime } from "@/lib/timezone";
import { toast } from "@/hooks/use-toast";

const PAGE_SIZE = 50;

export default function AdminUsers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(0);

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      return data === true;
    },
    enabled: !!user,
  });

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ["admin-users-full"],
    queryFn: async () => {
      // Try with email, fall back without if column doesn't exist yet
      let profiles: any[] = [];
      const { data: p1, error: e1 } = await supabase
        .from("profiles")
        .select("user_id, name, email, avatar_url, created_at")
        .order("created_at", { ascending: false });
      if (e1) {
        const { data: p2, error: e2 } = await supabase
          .from("profiles")
          .select("user_id, name, avatar_url, created_at")
          .order("created_at", { ascending: false });
        if (e2) throw e2;
        profiles = (p2 || []).map((p: any) => ({ ...p, email: null }));
      } else {
        profiles = p1 || [];
      }
      if (profiles.length === 0) return [];

      const ids = profiles.map((p: any) => p.user_id);

      // Try with ip_address, fall back without
      let sessions: any[] = [];
      const { data: s1, error: se1 } = await supabase
        .from("user_sessions")
        .select("user_id, login_at_utc, device_info, ip_address")
        .in("user_id", ids);
      if (se1) {
        const { data: s2 } = await supabase
          .from("user_sessions")
          .select("user_id, login_at_utc, device_info")
          .in("user_id", ids);
        sessions = (s2 || []).map((s: any) => ({ ...s, ip_address: null }));
      } else {
        sessions = s1 || [];
      }

      const { data: memberships } = await supabase
        .from("pool_members")
        .select("user_id, pool_id")
        .in("user_id", ids);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      const sessionMap = new Map<string, any>();
      sessions.forEach((s: any) => {
        const e = sessionMap.get(s.user_id) || { count: 0, last_at: null, device: null, ip: null };
        e.count += 1;
        if (!e.last_at || s.login_at_utc > e.last_at) {
          e.last_at = s.login_at_utc;
          e.device = s.device_info || null;
          e.ip = s.ip_address || null;
        }
        sessionMap.set(s.user_id, e);
      });

      const poolMap = new Map<string, number>();
      (memberships || []).forEach((m: any) => {
        poolMap.set(m.user_id, (poolMap.get(m.user_id) || 0) + 1);
      });

      const adminIds = new Set((roles || []).filter((r: any) => r.role === "admin").map((r: any) => r.user_id));

      return profiles.map((p: any) => {
        const s = sessionMap.get(p.user_id) || { count: 0, last_at: null, device: null, ip: null };
        const lastLogin = s.last_at ? new Date(s.last_at) : null;
        const registeredAt = p.created_at ? new Date(p.created_at) : null;
        const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
        const isActive = (lastLogin && (Date.now() - lastLogin.getTime()) <= SEVEN_DAYS)
          || (registeredAt && (Date.now() - registeredAt.getTime()) <= SEVEN_DAYS);
        return {
          id: p.user_id,
          name: p.name || "—",
          email: p.email || "—",
          created_at: p.created_at,
          login_count: s.count,
          last_login_at: s.last_at,
          last_device: s.device,
          last_ip: s.ip,
          pool_count: poolMap.get(p.user_id) || 0,
          is_active: isActive,
          is_admin: adminIds.has(p.user_id),
        };
      });
    },
    enabled: isAdmin === true,
    staleTime: 60_000,
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "delete", user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast({ title: "Gebruiker verwijderd" });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    if (!users) return [];
    let list = users;
    if (filter === "active") list = list.filter((u: any) => u.is_active);
    if (filter === "inactive") list = list.filter((u: any) => !u.is_active);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((u: any) =>
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.id?.toLowerCase().includes(q) ||
      u.last_ip?.toLowerCase().includes(q)
    );
    return list;
  }, [users, search, filter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (!isAdmin) return null;

  const activeCount = users?.filter((u: any) => u.is_active).length ?? 0;

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-8 space-y-4 lg:max-w-5xl lg:px-8 lg:pt-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/app/admin" className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold font-display flex items-center gap-2">
            <Users className="h-5 w-5" /> Gebruikers
          </h1>
          {users && (
            <p className="text-xs text-muted-foreground">
              {users.length} totaal · {activeCount} actief (7d)
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-8 w-8 p-0">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Filter + zoek */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek op naam, e-mail, IP of ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(0); }}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {f === "all" ? "Alle" : f === "active" ? "✓ Actief" : "Inactief"}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground self-center">{filtered.length} resultaten</span>
        </div>
      </div>

      {/* Lijst */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : paginated.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">Geen gebruikers gevonden.</CardContent>
        </Card>
      ) : (
        <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
          {paginated.map((u: any) => {
            const isSelf = user?.id === u.id;
            return (
              <Card key={u.id} className={`border-0 shadow-sm overflow-hidden ${u.is_admin ? "border-l-4 border-l-amber-400" : ""}`}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      {/* Naam + admin badge */}
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm truncate">{u.name}</p>
                        {u.is_admin && <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                        {isSelf && <span className="text-[10px] text-primary">(jij)</span>}
                      </div>
                      {/* Email */}
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      {/* Status badges */}
                      <div className="flex items-center gap-2 flex-wrap pt-0.5">
                        <Badge
                          variant={u.is_active ? "secondary" : "outline"}
                          className={`text-[10px] px-1.5 py-0 ${u.is_active ? "bg-green-500/20 text-green-700 border-green-300" : ""}`}
                        >
                          {u.is_active ? "✓ Actief" : "Inactief"}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{u.login_count}x ingelogd</span>
                        <span className="text-[10px] text-muted-foreground">{u.pool_count} pools</span>
                      </div>
                      {/* Laatste login */}
                      <p className="text-[10px] text-muted-foreground">
                        Laatste login: {u.last_login_at ? formatNLDateTime(u.last_login_at) : "nog nooit"}
                      </p>
                      {/* Aangemaakt */}
                      <p className="text-[10px] text-muted-foreground">
                        Aangemeld: {formatNLDateTime(u.created_at)}
                      </p>
                      {/* IP + device */}
                      {u.last_ip && (
                        <p className="text-[10px] text-muted-foreground">IP: {u.last_ip}</p>
                      )}
                      {u.last_device && (
                        <p className="text-[10px] text-muted-foreground truncate">{u.last_device}</p>
                      )}
                    </div>
                    {/* Verwijder knop */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive" size="sm" className="shrink-0 h-8 w-8 p-0"
                          disabled={deleteUser.isPending || isSelf}
                          title={isSelf ? "Je kunt jezelf niet verwijderen" : "Verwijderen"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Gebruiker verwijderen?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Dit verwijdert <strong>{u.name}</strong> ({u.email}) en alle bijbehorende data permanent.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuleren</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteUser.mutate(u.id)}>Verwijderen</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Paginering */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            Pagina {page + 1} van {totalPages}
          </span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
