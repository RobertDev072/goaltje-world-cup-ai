import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { PredictorProfile } from "@/components/PredictorProfile";
import { WeekSummary } from "@/components/WeekSummary";
import { UserAnalytics } from "@/components/UserAnalytics";
import { TeamBias } from "@/components/TeamBias";
import { PoolTrends } from "@/components/PoolTrends";
import { PoolRecapFeed } from "@/components/PoolRecapFeed";
import { DailyPoolRecap } from "@/components/DailyPoolRecap";
import { queryKeys, staleTimes } from "@/lib/queryKeys";

export default function Insights() {
  const { user } = useAuth();
  const [selectedPoolId, setSelectedPoolId] = useState("");

  const { data: pools } = useQuery({
    queryKey: queryKeys.myPools(user?.id || ""),
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("pool_members")
        .select("pool_id, pools(id, name)")
        .eq("user_id", user.id);
      return data?.map((m: any) => m.pools).filter(Boolean) || [];
    },
    enabled: !!user,
    staleTime: staleTimes.pools,
  });

  const activePoolId = selectedPoolId || pools?.[0]?.id || "";
  const activePool = pools?.find((p: any) => p.id === activePoolId);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-12 text-center space-y-4">
        <p className="text-muted-foreground">Log in om je inzichten te bekijken.</p>
        <Link to="/login">
          <Button className="bg-primary text-primary-foreground">Inloggen</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-6 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-secondary" />
          Inzichten
        </h1>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Alles wat jouw data over jou zegt
          {activePool && ` · ${activePool.name}`}
        </p>
      </div>

      {/* Pool-selector bij meerdere pools */}
      {pools && pools.length > 1 && (
        <Select value={activePoolId} onValueChange={setSelectedPoolId}>
          <SelectTrigger className="h-10 text-sm">
            <SelectValue placeholder="Kies poule" />
          </SelectTrigger>
          <SelectContent>
            {pools.map((pool: any) => (
              <SelectItem key={pool.id} value={pool.id}>
                {pool.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Voorspeller-profiel hero */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <PredictorProfile userId={user.id} />
      </motion.div>

      {/* Deze week */}
      {activePoolId && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <WeekSummary userId={user.id} poolId={activePoolId} />
        </motion.div>
      )}

      {/* Daily recap */}
      {activePoolId && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <DailyPoolRecap poolId={activePoolId} poolName={activePool?.name} />
        </motion.div>
      )}

      {/* Rang-evolutie + per-fase accuratesse */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <UserAnalytics
          userId={user.id}
          poolId={activePoolId || null}
          poolName={activePool?.name ?? null}
        />
      </motion.div>

      {/* Team-bias */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <TeamBias userId={user.id} />
      </motion.div>

      {/* Pool trends */}
      {activePoolId && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <PoolTrends poolId={activePoolId} poolName={activePool?.name} />
        </motion.div>
      )}

      {/* Recap feed */}
      {activePoolId && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <PoolRecapFeed poolId={activePoolId} />
        </motion.div>
      )}

      {/* Uitleg-blok onderaan */}
      <Card className="border-0 shadow-elevation-1 bg-muted/30">
        <CardContent className="p-4 space-y-2 text-xs text-muted-foreground">
          <p className="font-display font-bold text-sm text-foreground flex items-center gap-1.5">
            🧠 Hoe leert Goaltje zichzelf?
          </p>
          <p>
            Alle inzichten op deze pagina zijn <strong>auto-gegenereerd</strong> uit je eigen voorspellingen en afgeronde wedstrijden.
          </p>
          <p>
            Geen AI, geen externe data, geen extra kosten. Elke dag dat jij uitslagen invoert, lichten hier nieuwe inzichten op.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
