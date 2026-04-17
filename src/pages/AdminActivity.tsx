import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Activity, UserPlus, LogIn, Trophy } from "lucide-react";
import { formatNLDateTime } from "@/lib/timezone";

type LogTab = "registraties" | "logins" | "poules";

export default function AdminActivity() {
  const { user } = useAuth();
  const [tab, setTab] = useState<LogTab>("registraties");

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      return data === true;
    },
    enabled: !!user,
  });

  // Nieuwe registraties
  const { data: newUsers, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-activity-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, name, email, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;

      if (!data || data.length === 0) return [];
      const ids = data.map((p: any) => p.user_id);

      // Heeft de gebruiker een poule aangemaakt?
      const { data: pools } = await supabase
        .from("pools")
        .select("created_by, name, created_at")
        .in("created_by", ids)
        .order("created_at", { ascending: false });

      const poolsByUser = new Map<string, any[]>();
      (pools || []).forEach((p: any) => {
        if (!poolsByUser.has(p.created_by)) poolsByUser.set(p.created_by, []);
        poolsByUser.get(p.created_by)!.push(p);
      });

      // Hoe is de gebruiker ingelogd? (pool_members.joined_at vs profiles.created_at)
      const { data: memberships } = await supabase
        .from("pool_members")
        .select("user_id, pool_id, joined_at, pools(name, invite_code)")
        .in("user_id", ids);

      const joinsByUser = new Map<string, any[]>();
      (memberships || []).forEach((m: any) => {
        if (!joinsByUser.has(m.user_id)) joinsByUser.set(m.user_id, []);
        joinsByUser.get(m.user_id)!.push(m);
      });

      return data.map((p: any) => ({
        ...p,
        pools_created: poolsByUser.get(p.user_id) || [],
        pool_joins: joinsByUser.get(p.user_id) || [],
      }));
    },
    enabled: isAdmin === true && tab === "registraties",
    staleTime: 60_000,
  });

  // Recente logins
  const { data: logins, isLoading: loginsLoading } = useQuery({
    queryKey: ["admin-activity-logins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_sessions")
        .select("id, user_id, login_at_utc, device_info, ip_address")
        .order("login_at_utc", { ascending: false })
        .limit(100);
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const ids = [...new Set(data.map((s: any) => s.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", ids);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return data.map((s: any) => ({
        ...s,
        profile: profileMap.get(s.user_id) || null,
      }));
    },
    enabled: isAdmin === true && tab === "logins",
    staleTime: 30_000,
  });

  // Nieuwe poules
  const { data: newPools, isLoading: poolsLoading } = useQuery({
    queryKey: ["admin-activity-pools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pools")
        .select("id, name, created_at, invite_code, created_by, privacy")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const ids = [...new Set(data.map((p: any) => p.created_by).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", ids);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      // Leden per poule
      const { data: members } = await supabase
        .from("pool_members")
        .select("pool_id")
        .in("pool_id", data.map((p: any) => p.id));
      const memberCount = new Map<string, number>();
      (members || []).forEach((m: any) => {
        memberCount.set(m.pool_id, (memberCount.get(m.pool_id) || 0) + 1);
      });

      return data.map((p: any) => ({
        ...p,
        creator: profileMap.get(p.created_by) || null,
        member_count: memberCount.get(p.id) || 0,
      }));
    },
    enabled: isAdmin === true && tab === "poules",
    staleTime: 60_000,
  });

  if (!isAdmin) return null;

  const TABS: { key: LogTab; label: string; icon: any }[] = [
    { key: "registraties", label: "Registraties", icon: UserPlus },
    { key: "logins",       label: "Logins",        icon: LogIn },
    { key: "poules",       label: "Poules",         icon: Trophy },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-8 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/app/admin" className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold font-display flex items-center gap-2">
          <Activity className="h-5 w-5" /> Activiteitenlog
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-full border whitespace-nowrap transition-colors ${
              tab === key
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* ===== REGISTRATIES ===== */}
      {tab === "registraties" && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Laatste 100 registraties (nieuwste eerst)</p>
          {usersLoading ? (
            [...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
          ) : (newUsers || []).map((u: any) => (
            <Card key={u.user_id} className="border-0 shadow-sm">
              <CardContent className="p-3 space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">{u.name || "—"}</p>
                  {u.pools_created.length > 0 && (
                    <span className="text-[10px] bg-primary/10 text-primary rounded px-1">poule aangemaakt</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{u.email || "—"}</p>
                <p className="text-[10px] text-muted-foreground">
                  Aangemeld: {formatNLDateTime(u.created_at)}
                </p>
                {u.pools_created.length > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    Poule: {u.pools_created.map((p: any) => p.name).join(", ")}
                  </p>
                )}
                {u.pool_joins.length > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    Via uitnodiging: {u.pool_joins.map((j: any) => j.pools?.name || "onbekend").join(", ")}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
          {!usersLoading && (newUsers || []).length === 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">Geen registraties.</CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ===== LOGINS ===== */}
      {tab === "logins" && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Laatste 100 inlogsessies (nieuwste eerst)</p>
          {loginsLoading ? (
            [...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
          ) : (logins || []).map((s: any) => (
            <Card key={s.id} className="border-0 shadow-sm">
              <CardContent className="p-3 space-y-0.5">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{s.profile?.name || "Onbekend"}</p>
                  <p className="text-[10px] text-muted-foreground">{formatNLDateTime(s.login_at_utc)}</p>
                </div>
                <p className="text-xs text-muted-foreground">{s.profile?.email || s.user_id}</p>
                {s.ip_address && (
                  <p className="text-[10px] text-muted-foreground">IP: {s.ip_address}</p>
                )}
                {s.device_info && (
                  <p className="text-[10px] text-muted-foreground truncate">{s.device_info}</p>
                )}
              </CardContent>
            </Card>
          ))}
          {!loginsLoading && (logins || []).length === 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                Geen logindata. Logins worden bijgehouden na de volgende deployment.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ===== NIEUWE POULES ===== */}
      {tab === "poules" && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Laatste 100 poules (nieuwste eerst)</p>
          {poolsLoading ? (
            [...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
          ) : (newPools || []).map((p: any) => (
            <Card key={p.id} className="border-0 shadow-sm">
              <CardContent className="p-3 space-y-0.5">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{p.name}</p>
                  <span className="text-[10px] text-muted-foreground">{p.member_count} leden</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Door: {p.creator?.name || "Onbekend"} {p.creator?.email ? `(${p.creator.email})` : ""}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Aangemaakt: {formatNLDateTime(p.created_at)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Code: {p.invite_code} · {p.privacy === "public" ? "Openbaar" : "Privé"}
                </p>
              </CardContent>
            </Card>
          ))}
          {!poolsLoading && (newPools || []).length === 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">Geen poules gevonden.</CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
