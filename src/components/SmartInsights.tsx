import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";
import { cn } from "@/lib/utils";

interface InsightData {
  predictions: Array<{
    home_pred: number | null;
    away_pred: number | null;
    points_awarded: number | null;
    matches?: {
      home_score: number | null;
      away_score: number | null;
      status: string;
      stage: string;
    };
  }>;
}

interface Insight {
  icon: string;
  title: string;
  value: string;
  color: string;
}

export function SmartInsights({ predictions }: InsightData) {
  const finished = predictions.filter(
    (p) => p.matches?.status === "finished" && p.points_awarded != null
  );

  const insights = useMemo((): Insight[] => {
    if (finished.length < 3) return [];

    const correct = finished.filter((p) => (p.points_awarded || 0) > 0);
    const accuracy = Math.round((correct.length / finished.length) * 100);

    const avgGoals =
      finished.reduce((s, p) => s + (p.home_pred || 0) + (p.away_pred || 0), 0) /
      finished.length;

    // Home vs away prediction analysis
    const homeWinPreds = finished.filter(
      (p) => (p.home_pred || 0) > (p.away_pred || 0)
    ).length;
    const homeWinPct = Math.round((homeWinPreds / finished.length) * 100);

    // Group vs knockout
    const groupPreds = finished.filter((p) => p.matches?.stage === "group");
    const koPreds = finished.filter((p) => p.matches?.stage !== "group");
    const groupAcc = groupPreds.length > 0
      ? Math.round(groupPreds.filter((p) => (p.points_awarded || 0) > 0).length / groupPreds.length * 100)
      : null;
    const koAcc = koPreds.length > 0
      ? Math.round(koPreds.filter((p) => (p.points_awarded || 0) > 0).length / koPreds.length * 100)
      : null;

    const result: Insight[] = [
      {
        icon: "🎯",
        title: "Trefzekerheid",
        value: `${accuracy}% van je voorspellingen is goed`,
        color: accuracy >= 50 ? "text-success" : "text-destructive",
      },
      {
        icon: "⚽",
        title: "Goals voorspeld",
        value: `Gemiddeld ${avgGoals.toFixed(1)} goals per wedstrijd`,
        color: "text-primary",
      },
      {
        icon: "🏠",
        title: "Thuisvoorkeur",
        value: homeWinPct > 60
          ? `Je voorspelt ${homeWinPct}% thuiswinst — vrij optimistisch!`
          : homeWinPct < 40
          ? `Je voorspelt slechts ${homeWinPct}% thuiswinst — underdog fan!`
          : `${homeWinPct}% thuiswinst voorspeld — goed gebalanceerd`,
        color: "text-primary",
      },
    ];

    if (groupAcc != null && koAcc != null && groupPreds.length >= 3 && koPreds.length >= 2) {
      const betterAt = groupAcc > koAcc ? "groepsfase" : "knock-out";
      result.push({
        icon: "📊",
        title: "Fase-analyse",
        value: `Sterker in de ${betterAt} (${groupAcc}% groep vs ${koAcc}% KO)`,
        color: "text-accent",
      });
    }

    return result;
  }, [finished]);

  // Points distribution for chart
  const chartData = useMemo(() => {
    if (finished.length < 3) return [];
    const pointCounts: Record<number, number> = {};
    finished.forEach((p) => {
      const pts = p.points_awarded || 0;
      pointCounts[pts] = (pointCounts[pts] || 0) + 1;
    });
    return Object.entries(pointCounts)
      .map(([pts, count]) => ({ points: `${pts} pt`, count, pts: Number(pts) }))
      .sort((a, b) => a.pts - b.pts);
  }, [finished]);

  if (finished.length < 3) {
    return (
      <Card className="border-0 shadow-elevation-1">
        <CardContent className="p-6 text-center text-muted-foreground text-sm">
          🧠 Nog niet genoeg data voor inzichten. Minimaal 3 gespeelde wedstrijden nodig.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Insights cards */}
      {insights.map((insight, i) => (
        <motion.div
          key={insight.title}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08 }}
        >
          <Card className="border-0 shadow-elevation-1">
            <CardContent className="p-3 flex items-start gap-3">
              <span className="text-xl shrink-0">{insight.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-xs text-muted-foreground">{insight.title}</p>
                <p className={cn("text-sm font-medium", insight.color)}>{insight.value}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {/* Points distribution chart */}
      {chartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-elevation-1">
            <CardContent className="p-4">
              <p className="font-display font-semibold text-xs text-muted-foreground mb-3">
                📈 Puntenverdeling
              </p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={chartData}>
                  <XAxis dataKey="points" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.pts > 0 ? "hsl(var(--primary))" : "hsl(var(--muted))"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
