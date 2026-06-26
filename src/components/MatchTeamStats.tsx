import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import { formatNLDate } from "@/lib/timezone";

interface FormEntry {
  result: "W" | "D" | "L";
  gf: number;
  ga: number;
  opp: string | null;
  opp_flag: string | null;
  kickoff: string;
  stage: string;
}

interface TeamStats {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  clean_sheets: number;
  form: FormEntry[];
}

interface H2H {
  kickoff: string;
  stage: string;
  home_short: string | null;
  away_short: string | null;
  home_score: number;
  away_score: number;
}

interface StatsResponse {
  home: TeamStats | null;
  away: TeamStats | null;
  h2h: H2H[];
}

interface MatchTeamStatsProps {
  matchId: string;
  homeName?: string;
  awayName?: string;
  homeFlag?: string;
  awayFlag?: string;
}

const RESULT_STYLE: Record<string, string> = {
  W: "bg-emerald-500 text-white",
  D: "bg-muted-foreground/40 text-white",
  L: "bg-destructive/80 text-white",
};

function FormDots({ form }: { form: FormEntry[] }) {
  if (!form?.length) return <span className="text-[10px] text-muted-foreground">—</span>;
  return (
    <div className="flex gap-1 justify-center">
      {form.map((f, i) => (
        <span
          key={i}
          title={`${f.result} ${f.gf}-${f.ga} vs ${f.opp ?? "?"} (${formatNLDate(f.kickoff)})`}
          className={cn(
            "h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center",
            RESULT_STYLE[f.result] ?? "bg-muted",
          )}
        >
          {f.result}
        </span>
      ))}
    </div>
  );
}

function StatRow({ label, home, away, highlight }: { label: string; home: React.ReactNode; away: React.ReactNode; highlight?: "home" | "away" | null }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-1.5">
      <span className={cn("text-sm font-semibold text-center tabular-nums", highlight === "home" && "text-primary")}>{home}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground text-center min-w-[84px]">{label}</span>
      <span className={cn("text-sm font-semibold text-center tabular-nums", highlight === "away" && "text-primary")}>{away}</span>
    </div>
  );
}

export function MatchTeamStats({ matchId, homeName, awayName, homeFlag, awayFlag }: MatchTeamStatsProps) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.matchTeamStats(matchId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_match_team_stats", { _match_id: matchId });
      if (error) throw error;
      return data as unknown as StatsResponse;
    },
    staleTime: staleTimes.stats,
  });

  if (isLoading) return <Skeleton className="h-44 rounded-xl" />;

  const home = data?.home;
  const away = data?.away;
  // Verbergen als er nog niks te tonen valt (teams onbekend of nog niet gespeeld)
  if (!home && !away) return null;
  if ((home?.played ?? 0) === 0 && (away?.played ?? 0) === 0) return null;

  const cmp = (h?: number, a?: number): "home" | "away" | null => {
    if (h == null || a == null || h === a) return null;
    return h > a ? "home" : "away";
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
      <Card className="border-0 shadow-lg">
        <CardContent className="p-5">
          <h3 className="font-display font-semibold text-base mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Statistieken dit toernooi
          </h3>

          {/* Team-koppen */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mb-1">
            <div className="text-center">
              <div className="text-2xl">{homeFlag || "🏳️"}</div>
              <div className="text-xs font-medium truncate">{homeName || "?"}</div>
            </div>
            <span className="text-[10px] text-muted-foreground">vs</span>
            <div className="text-center">
              <div className="text-2xl">{awayFlag || "🏳️"}</div>
              <div className="text-xs font-medium truncate">{awayName || "?"}</div>
            </div>
          </div>

          <div className="divide-y divide-border/60">
            <StatRow label="Gespeeld" home={home?.played ?? "—"} away={away?.played ?? "—"} />
            <StatRow
              label="W / G / V"
              home={home ? `${home.won}-${home.drawn}-${home.lost}` : "—"}
              away={away ? `${away.won}-${away.drawn}-${away.lost}` : "—"}
              highlight={cmp(home?.won, away?.won)}
            />
            <StatRow
              label="Doelpunten"
              home={home ? `${home.gf}` : "—"}
              away={away ? `${away.gf}` : "—"}
              highlight={cmp(home?.gf, away?.gf)}
            />
            <StatRow
              label="Tegen"
              home={home ? `${home.ga}` : "—"}
              away={away ? `${away.ga}` : "—"}
              highlight={cmp(away?.ga, home?.ga)}
            />
            <StatRow
              label="Doelsaldo"
              home={home ? (home.gd > 0 ? `+${home.gd}` : `${home.gd}`) : "—"}
              away={away ? (away.gd > 0 ? `+${away.gd}` : `${away.gd}`) : "—"}
              highlight={cmp(home?.gd, away?.gd)}
            />
            <StatRow
              label="Clean sheets"
              home={home?.clean_sheets ?? "—"}
              away={away?.clean_sheets ?? "—"}
              highlight={cmp(home?.clean_sheets, away?.clean_sheets)}
            />
            <StatRow
              label="Vorm"
              home={home ? <FormDots form={home.form} /> : "—"}
              away={away ? <FormDots form={away.form} /> : "—"}
            />
          </div>

          {/* Onderlinge duels */}
          {data?.h2h && data.h2h.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border/60">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <Swords className="h-3.5 w-3.5" /> Eerder dit toernooi
              </h4>
              <div className="space-y-1">
                {data.h2h.map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{formatNLDate(m.kickoff)}</span>
                    <span className="font-medium tabular-nums">
                      {m.home_short} {m.home_score}–{m.away_score} {m.away_short}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground text-center mt-3">
            Berekend uit alle gespeelde WK-wedstrijden.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
