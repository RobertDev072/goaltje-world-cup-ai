import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys, staleTimes } from "@/lib/queryKeys";

interface TeamBiasProps {
  userId: string;
}

interface BiasEntry {
  teamId: string;
  shortName: string | null;
  teamName: string;
  delta: number;
  matchCount: number;
}

interface BiasData {
  overestimated: BiasEntry[];
  underestimated: BiasEntry[];
}

export function TeamBias({ userId }: TeamBiasProps) {
  const { data } = useQuery({
    queryKey: queryKeys.userTeamBias(userId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_team_bias", { _user_id: userId });
      if (error) throw error;
      return data as unknown as BiasData;
    },
    enabled: !!userId,
    staleTime: staleTimes.stats,
  });

  if (!data) return null;
  const { overestimated, underestimated } = data;
  if (overestimated.length === 0 && underestimated.length === 0) return null;

  return (
    <Card className="border-0 shadow-elevation-2">
      <CardContent className="p-4 space-y-3">
        <h2 className="text-xs font-semibold flex items-center gap-1.5">
          <Scale className="h-3.5 w-3.5" /> Team-bias
        </h2>
        <p className="text-[11px] text-muted-foreground">
          Vergelijkt jouw voorspelde goals met de werkelijke goals per team.
        </p>

        <div className="space-y-1.5">
          {overestimated.map((t) => (
            <div key={t.teamId} className="flex items-center gap-2 text-xs">
              <span className="flex-1 truncate font-medium">{t.teamName}</span>
              <span className="text-[10px] text-muted-foreground">({t.matchCount}×)</span>
              <span className="text-[10px] bg-destructive/10 text-destructive rounded-full px-2 py-0.5 font-medium tabular-nums">
                +{t.delta} overschat
              </span>
            </div>
          ))}
          {underestimated.map((t) => (
            <div key={t.teamId} className="flex items-center gap-2 text-xs">
              <span className="flex-1 truncate font-medium">{t.teamName}</span>
              <span className="text-[10px] text-muted-foreground">({t.matchCount}×)</span>
              <span className="text-[10px] bg-success/10 text-success rounded-full px-2 py-0.5 font-medium tabular-nums">
                {t.delta} onderschat
              </span>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground pt-2 border-t border-border/60">
          💡 Delta = jouw voorspelde goals minus werkelijke goals, per team. Alleen teams met ≥2 afgeronde matches.
        </p>
      </CardContent>
    </Card>
  );
}
