import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Play, Square, RefreshCw, Radio, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Live-test paneel: pollt het Q&B sandbox-endpoint /test/match (cyclet door
 * alle wedstrijdfases) via de wc2026-api-proxy edge function en toont het
 * resultaat zoals een gebruiker een live wedstrijd op de home ziet.
 * Read-only, raakt de DB niet. Telt wel mee in de API-budget — daarom
 * handmatig starten/stoppen, niet automatisch.
 */

interface SandboxMatch {
  _sandbox: boolean;
  id: number;
  round: string;
  home_team: string;
  home_team_code: string;
  away_team: string;
  away_team_code: string;
  stadium: string;
  stadium_city: string;
  status: string;
  phase: string;
  match_minute: number | null;
  home_score: number | null;
  away_score: number | null;
  home_pen: number | null;
  away_pen: number | null;
  next_phase_in_seconds: number | null;
}

const TOKEN_LS_KEY = "wc2026_api_bearer";

const PHASE_LABEL: Record<string, string> = {
  PRE: "Begint zo",
  "1H": "1e helft",
  HT: "Rust",
  "2H": "2e helft",
  ET1: "Verlenging 1",
  ET2: "Verlenging 2",
  PEN: "Penalty's",
  FT_PEN: "Einde (na penalty's)",
  FT: "Afgelopen",
};

export function LiveTestPanel({ enabled }: { enabled: boolean }) {
  const [bearer, setBearer] = useState<string>(() => localStorage.getItem(TOKEN_LS_KEY) || "");
  const [showToken, setShowToken] = useState(false);
  const [polling, setPolling] = useState(false);
  const [match, setMatch] = useState<SandboxMatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<string | null>(null);
  const [callCount, setCallCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOnce = async () => {
    if (!bearer.trim()) { setError("Vul je Bearer-token in"); return; }
    try {
      const { data, error } = await supabase.functions.invoke("wc2026-api-proxy", {
        body: { path: "/test/match", method: "GET", bearer: bearer.trim() },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error("HTTP " + data?.status);
      setMatch(data.body as SandboxMatch);
      setError(null);
      setLastFetch(new Date().toLocaleTimeString("nl-NL"));
      setCallCount((c) => c + 1);
      localStorage.setItem(TOKEN_LS_KEY, bearer.trim());
    } catch (e) {
      setError((e as Error).message);
    }
  };

  // Poll-loop
  useEffect(() => {
    if (!polling) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    fetchOnce();
    timerRef.current = setInterval(fetchOnce, 15_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polling]);

  // Stop polling als de tab verdwijnt
  useEffect(() => {
    if (!enabled && polling) setPolling(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  if (!enabled) return null;

  const isLive = match && ["1H", "2H", "ET1", "ET2", "PEN"].includes(match.phase);
  const score = match ? `${match.home_score ?? 0} - ${match.away_score ?? 0}` : "0 - 0";

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm bg-muted/30">
        <CardContent className="p-3 flex items-start gap-2 text-xs">
          <Radio className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="text-muted-foreground">
            <p className="font-medium text-foreground">Live-test (sandbox)</p>
            <p>Pollt /test/match — een fictieve wedstrijd die elke 160 min door alle
              fases loopt (PRE → 1H → rust → 2H → verlenging → penalty's). Zo zie je
              precies hoe een live wedstrijd er voor gebruikers uitziet. Elke poll
              telt 1 API-call; stop hem als je klaar bent.</p>
          </div>
        </CardContent>
      </Card>

      {/* Token + controls */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-2">
            <Input
              type={showToken ? "text" : "password"}
              value={bearer}
              onChange={(e) => setBearer(e.target.value)}
              placeholder="wc26_..."
              className="h-9 text-xs font-mono"
            />
            <Button variant="outline" size="sm" className="h-9 px-2 shrink-0" onClick={() => setShowToken(!showToken)}>
              {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <div className="flex gap-2">
            {!polling ? (
              <Button className="flex-1 gap-2" onClick={() => setPolling(true)} disabled={!bearer.trim()}>
                <Play className="h-4 w-4" /> Start live-test
              </Button>
            ) : (
              <Button variant="destructive" className="flex-1 gap-2" onClick={() => setPolling(false)}>
                <Square className="h-4 w-4" /> Stop
              </Button>
            )}
            <Button variant="outline" className="gap-2" onClick={fetchOnce} disabled={!bearer.trim()}>
              <RefreshCw className="h-4 w-4" /> Eén keer
            </Button>
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{polling ? "Pollt elke 15s…" : "Gestopt"}</span>
            <span>{callCount} calls · laatste {lastFetch ?? "—"}</span>
          </div>
          {error && <p className="text-xs text-destructive">⚠️ {error}</p>}
        </CardContent>
      </Card>

      {/* Live preview — zoals de gebruiker het ziet */}
      {match && (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground font-medium">Zo ziet de gebruiker het:</p>

          {isLive ? (
            <div
              className="block rounded-2xl p-4 shadow-elevation-3 relative overflow-hidden text-white"
              style={{ background: "linear-gradient(135deg, #B91C1C, #DC2626)" }}
            >
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white text-[#B91C1C] text-[10px] font-black">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B91C1C]" /> LIVE
                </span>
                <span className="text-[11px] font-medium opacity-95">
                  {PHASE_LABEL[match.phase] ?? match.phase}
                  {match.match_minute != null && (
                    <>
                      <span className="opacity-70 mx-1.5">·</span>
                      <span className="font-bold">{match.match_minute}'</span>
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-bold text-sm truncate">{match.home_team_code}</span>
                </div>
                <motion.span
                  className="font-display font-black text-3xl tabular-nums px-3 shrink-0"
                  key={score}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500 }}
                >
                  {score}
                </motion.span>
                <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                  <span className="font-bold text-sm truncate text-right">{match.away_team_code}</span>
                </div>
              </div>
              {match.phase === "PEN" && match.home_pen != null && (
                <p className="text-[11px] text-center mt-2 opacity-95">
                  Penalty's: {match.home_pen} – {match.away_pen}
                </p>
              )}
            </div>
          ) : (
            <Card className="border-0 shadow-md">
              <CardContent className="p-4 text-center space-y-1">
                <Badge variant="outline" className="text-[10px]">
                  {PHASE_LABEL[match.phase] ?? match.phase}
                </Badge>
                <p className="font-display font-bold text-lg">
                  {match.home_team_code} {score} {match.away_team_code}
                </p>
                {match.phase === "FT_PEN" && match.home_pen != null && (
                  <p className="text-xs text-muted-foreground">
                    Beslist na penalty's: {match.home_pen} – {match.away_pen}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Raw debug */}
          <details className="text-[10px]">
            <summary className="cursor-pointer text-muted-foreground">Ruwe data</summary>
            <pre className="bg-muted/60 rounded p-2 mt-1 overflow-auto max-h-48">
              {JSON.stringify(match, null, 2)}
            </pre>
          </details>

          {match.next_phase_in_seconds != null && match.next_phase_in_seconds > 0 && (
            <p className="text-[10px] text-muted-foreground text-center">
              Volgende fase over ~{Math.round(match.next_phase_in_seconds / 60)} min
            </p>
          )}
        </div>
      )}
    </div>
  );
}
