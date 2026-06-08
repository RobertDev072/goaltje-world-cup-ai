import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sunrise, Trophy, ArrowRight, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatNLDateTime } from "@/lib/timezone";

interface EarlyBirdStatus {
  is_admin: boolean;
  total_needed: number;
  predicted_count: number;
  first_kickoff: string | null;
  before_kickoff: boolean;
  earned_in_pools: number;
  earned: boolean;
}

/**
 * Early Bird voortgang. Toont:
 *   - Niets als de gebruiker admin is (admin doet niet mee)
 *   - Niets na de eerste kickoff als 'ie het niet verdiend heeft
 *   - "Verdiend!" badge zodra 'ie de bonus heeft
 *   - Voortgang anders (X/N wedstrijden + deadline)
 */
export function EarlyBirdStatus() {
  const { data } = useQuery({
    queryKey: ["my-early-bird-status"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_early_bird_status");
      if (error) throw error;
      return data as EarlyBirdStatus;
    },
    staleTime: 60_000,
    retry: 0,
  });

  if (!data) return null;
  if (data.is_admin) return null;

  // Verdiend → trotse badge
  if (data.earned) {
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 p-3 flex items-center gap-3 text-white">
            <Sunrise className="h-5 w-5" />
            <div className="flex-1">
              <p className="font-display font-bold text-sm">Early Bird verdiend! ⭐</p>
              <p className="text-[11px] opacity-95">
                +10 bonus in {data.earned_in_pools} poule{data.earned_in_pools === 1 ? "" : "s"}.
              </p>
            </div>
            <Trophy className="h-5 w-5" />
          </div>
        </Card>
      </motion.div>
    );
  }

  // Geen voortgang en kickoff voorbij → niets tonen
  if (!data.before_kickoff && data.predicted_count === 0) return null;

  // Voortgang
  const pct = Math.min(100, Math.round((data.predicted_count / Math.max(data.total_needed, 1)) * 100));
  const remaining = Math.max(0, data.total_needed - data.predicted_count);

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <Link to="/app/matches">
        <Card className="border-0 shadow-md overflow-hidden">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Sunrise className="h-4 w-4 text-amber-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-sm">Early Bird bonus — +10 punten</p>
                <p className="text-[10px] text-muted-foreground">
                  Vul alle groepswedstrijden in vóór de eerste kickoff
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {data.predicted_count}/{data.total_needed}
              </Badge>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  pct >= 100 ? "bg-emerald-500" : "bg-gradient-to-r from-amber-400 to-orange-500",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              {data.before_kickoff && data.first_kickoff ? (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Sluit {formatNLDateTime(data.first_kickoff)}
                </span>
              ) : (
                <span className="text-destructive">⚠️ Deadline verlopen</span>
              )}
              <span className="flex items-center gap-1 text-primary">
                Nog {remaining} <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
