import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";

interface MatchTrackrecordProps {
  userId: string;
  matchId: string;
  homeTeamName?: string | null;
  awayTeamName?: string | null;
}

interface TrackrecordData {
  stage: string;
  stageCorrect: number;
  stageTotal: number;
  stagePct: number | null;
  homeTeamCorrect: number;
  homeTeamTotal: number;
  awayTeamCorrect: number;
  awayTeamTotal: number;
}

const STAGE_LABEL: Record<string, string> = {
  group: "groepsfase-matches",
  round_of_32: "matches in laatste 32",
  round_of_16: "matches in laatste 16",
  quarter_final: "kwartfinales",
  semi_final: "halve finales",
  third_place: "3e/4e-plaatswedstrijden",
  final: "finales",
};

function accuracyBar(pct: number): string {
  if (pct >= 60) return "bg-success";
  if (pct >= 40) return "bg-primary";
  if (pct >= 25) return "bg-warning";
  return "bg-destructive";
}

function accuracyText(pct: number): string {
  if (pct >= 60) return "text-success";
  if (pct >= 40) return "text-primary";
  if (pct >= 25) return "text-warning";
  return "text-destructive";
}

export function MatchTrackrecord({ userId, matchId, homeTeamName, awayTeamName }: MatchTrackrecordProps) {
  const { data } = useQuery({
    queryKey: queryKeys.userMatchTrackrecord(userId, matchId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_match_trackrecord", {
        _user_id: userId,
        _match_id: matchId,
      });
      if (error) throw error;
      return data as unknown as TrackrecordData | null;
    },
    enabled: !!userId && !!matchId,
    staleTime: staleTimes.stats,
  });

  if (!data) return null;

  const hasStage = data.stageTotal > 0;
  const hasHome = data.homeTeamTotal > 0;
  const hasAway = data.awayTeamTotal > 0;
  if (!hasStage && !hasHome && !hasAway) return null;

  const stageLabel = STAGE_LABEL[data.stage] ?? data.stage;
  const homePct = hasHome ? Math.round((data.homeTeamCorrect / data.homeTeamTotal) * 100) : 0;
  const awayPct = hasAway ? Math.round((data.awayTeamCorrect / data.awayTeamTotal) * 100) : 0;

  return (
    <Card className="border-0 shadow-elevation-2 overflow-hidden">
      <div className="gradient-navy px-4 py-2 text-white">
        <span className="text-xs font-semibold">📊 Jouw trackrecord</span>
      </div>
      <CardContent className="p-4 space-y-2.5">
        {hasStage && data.stagePct !== null && (
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-muted-foreground">Bij {stageLabel}</span>
              <span className={cn("font-bold tabular-nums", accuracyText(data.stagePct))}>
                {data.stageCorrect}/{data.stageTotal} · {data.stagePct}%
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className={cn("h-full", accuracyBar(data.stagePct))} style={{ width: `${data.stagePct}%` }} />
            </div>
          </div>
        )}

        {hasHome && (
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-muted-foreground">Matches met {homeTeamName ?? "thuis"}</span>
              <span className={cn("font-bold tabular-nums", accuracyText(homePct))}>
                {data.homeTeamCorrect}/{data.homeTeamTotal} · {homePct}%
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className={cn("h-full", accuracyBar(homePct))} style={{ width: `${homePct}%` }} />
            </div>
          </div>
        )}

        {hasAway && (
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-muted-foreground">Matches met {awayTeamName ?? "uit"}</span>
              <span className={cn("font-bold tabular-nums", accuracyText(awayPct))}>
                {data.awayTeamCorrect}/{data.awayTeamTotal} · {awayPct}%
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className={cn("h-full", accuracyBar(awayPct))} style={{ width: `${awayPct}%` }} />
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/60">
          💡 Gebaseerd op jouw vorige voorspellingen bij vergelijkbare matches.
        </p>
      </CardContent>
    </Card>
  );
}
