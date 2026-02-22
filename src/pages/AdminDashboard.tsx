import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Trophy, Target, Activity, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { formatNLDateTime } from "@/lib/timezone";

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

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Check admin role
  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (error) return false;
      return data === true;
    },
    enabled: !!user,
  });

  // Get admin stats
  const { data: stats, isLoading: statsLoading, dataUpdatedAt } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_stats");
      if (error) throw error;
      return data as any;
    },
    enabled: isAdmin === true,
    refetchInterval: 60000, // refresh every minute
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

  const trend = (current: number, previous: number) => {
    if (current > previous) return "up" as const;
    if (current < previous) return "down" as const;
    return "neutral" as const;
  };

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

      {statsLoading || !stats ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* Accounts */}
          <div>
            <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">👤 Accounts</h2>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Totaal accounts" value={stats.total_users} icon={Users} />
              <StatCard label="Vandaag" value={stats.users_today} icon={Users} sub={`7d: ${stats.users_7d} · 30d: ${stats.users_30d}`} />
            </div>
          </div>

          {/* Active Users */}
          <div>
            <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">🔵 Actieve gebruikers</h2>
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Vandaag" value={stats.logins_today} icon={Activity} />
              <StatCard label="7 dagen" value={stats.logins_7d} icon={Activity} />
              <StatCard label="30 dagen" value={stats.logins_30d} icon={Activity} />
            </div>
          </div>

          {/* Pools */}
          <div>
            <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">🏆 Poules</h2>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Totaal poules" value={stats.total_pools} icon={Trophy} />
              <StatCard label="Gem. leden/poule" value={stats.avg_members_per_pool} icon={Users} sub={`Vandaag: ${stats.pools_today} · 7d: ${stats.pools_7d}`} />
            </div>
          </div>

          {/* Predictions */}
          <div>
            <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">🎯 Voorspellingen</h2>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Totaal predictions" value={stats.total_predictions} icon={Target} />
              <StatCard label="Vandaag" value={stats.predictions_today} icon={Target} sub={`7d: ${stats.predictions_7d} · 30d: ${stats.predictions_30d}`} />
              <StatCard label="Actieve predictors (7d)" value={stats.predictors_7d} icon={Activity} />
              <StatCard label="Actieve predictors (30d)" value={stats.predictors_30d} icon={Activity} />
            </div>
          </div>

          {/* Top Pools */}
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

          {/* Newest Pools */}
          {stats.newest_pools && stats.newest_pools.length > 0 && (
            <div>
              <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">🆕 Nieuwste Poules</h2>
              <Card className="border-0 shadow-md">
                <CardContent className="p-0">
                  {stats.newest_pools.map((pool: any, i: number) => (
                    <div key={i} className={`flex items-center justify-between p-3 ${i < stats.newest_pools.length - 1 ? "border-b border-border" : ""}`}>
                      <span className="text-sm font-medium">{pool.name}</span>
                      <span className="text-xs text-muted-foreground">{formatNLDateTime(pool.created_at)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
