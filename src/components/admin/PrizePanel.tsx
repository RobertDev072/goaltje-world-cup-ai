import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Trophy, Gift, Users, Sparkles, Network, Search, Check, X, ChevronDown, ChevronRight,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatNLDateTime } from "@/lib/timezone";
import { cn } from "@/lib/utils";

interface QualifiedRow {
  user_id: string;
  name: string | null;
  email: string | null;
  active_referrals: number;
  global_points: number;
}

interface ReferralLogRow {
  referrer_user_id: string;
  referrer_name: string;
  referrer_code: string;
  referee_user_id: string;
  referee_name: string;
  referee_email: string | null;
  referee_signed_at: string;
  prediction_count: number;
  is_active: boolean;
}

export function PrizePanel({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient();
  const [logSearch, setLogSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: qualified, isLoading: loadingQual } = useQuery({
    queryKey: ["admin-prize-qualified"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_qualified_for_prize");
      if (error) throw error;
      return (data || []) as QualifiedRow[];
    },
    enabled, staleTime: 30_000,
  });

  const { data: log, isLoading: loadingLog } = useQuery({
    queryKey: ["admin-referral-log"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_referral_log");
      if (error) throw error;
      return (data || []) as ReferralLogRow[];
    },
    enabled, staleTime: 30_000,
  });

  const awardTop20 = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("award_global_top20_bonus");
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      toast({ title: "Top-20 bonus verdeeld", description: `${count} gebruiker(s) +50 punten.` });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-prize-qualified"] });
    },
    onError: (err: Error) => toast({ title: "Fout", description: err.message, variant: "destructive" }),
  });

  // Groepeer log per referrer
  const groupedLog = useMemo(() => {
    if (!log) return [] as Array<{
      referrer_user_id: string; referrer_name: string; referrer_code: string;
      total: number; active: number; referees: ReferralLogRow[];
    }>;
    const map = new Map<string, ReferralLogRow[]>();
    log.forEach((r) => {
      const arr = map.get(r.referrer_user_id) || [];
      arr.push(r);
      map.set(r.referrer_user_id, arr);
    });
    const out: Array<{
      referrer_user_id: string; referrer_name: string; referrer_code: string;
      total: number; active: number; referees: ReferralLogRow[];
    }> = [];
    map.forEach((refs, refId) => {
      out.push({
        referrer_user_id: refId,
        referrer_name: refs[0].referrer_name,
        referrer_code: refs[0].referrer_code,
        total: refs.length,
        active: refs.filter((r) => r.is_active).length,
        referees: refs,
      });
    });
    out.sort((a, b) => b.active - a.active || b.total - a.total);
    return out;
  }, [log]);

  const filteredLog = useMemo(() => {
    const q = logSearch.trim().toLowerCase();
    if (!q) return groupedLog;
    return groupedLog.filter((g) =>
      g.referrer_name.toLowerCase().includes(q) ||
      g.referrer_code.toLowerCase().includes(q) ||
      g.referees.some((r) =>
        r.referee_name.toLowerCase().includes(q) ||
        (r.referee_email || "").toLowerCase().includes(q),
      ),
    );
  }, [groupedLog, logSearch]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const winner = qualified?.[0] || null;

  return (
    <div className="space-y-4">
      {/* Winner-regel uitleg */}
      <Card className="border-0 shadow-sm bg-secondary/10">
        <CardContent className="p-4 space-y-2">
          <h3 className="font-display font-semibold text-sm flex items-center gap-2">
            <Trophy className="h-4 w-4 text-secondary" />
            Wie wint het shirt?
          </h3>
          <ol className="text-[11px] text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Speler moet <b className="text-foreground">minimaal 5 actieve referrals</b> hebben (vrienden die zich registreerden via hun link <i>én</i> ≥1 voorspelling deden).</li>
            <li>Onder de gekwalificeerden wint degene met de <b className="text-foreground">hoogste score in de globale poel</b> (incl. top-20 bonus van +50).</li>
            <li>Run eerst <b className="text-foreground">"Verdeel top-20 bonus"</b> na de finale, daarna staat de winnaar bovenaan.</li>
          </ol>
        </CardContent>
      </Card>

      {/* Huidige winnaar card */}
      {winner && (
        <Card className="border-0 shadow-glow-gold overflow-hidden">
          <div className="bg-gradient-to-r from-secondary/30 to-transparent h-0.5" />
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xl">
              🏆
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Huidige winnaar van het shirt</p>
              <p className="font-display font-bold text-base truncate">{winner.name || "Onbekend"}</p>
              <p className="text-[11px] text-muted-foreground truncate">{winner.email}</p>
            </div>
            <div className="text-right">
              <p className="font-mono font-bold text-lg text-secondary">{winner.global_points}p</p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                <Users className="h-3 w-3" /> {winner.active_referrals} actief
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top-20 bonus action */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <h3 className="font-display font-semibold text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-secondary" />
            Top-20 globaal bonus verdelen
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Kent +50 punten toe aan de top 20 van de globale poel. Pas runnen
            na de finale. Idempotent.
          </p>
          <Button
            size="sm"
            className="w-full gradient-primary text-primary-foreground"
            onClick={() => awardTop20.mutate()}
            disabled={awardTop20.isPending}
          >
            {awardTop20.isPending ? "Toekennen..." : "Verdeel +50 aan top 20"}
          </Button>
        </CardContent>
      </Card>

      {/* Gekwalificeerde lijst */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-2">
          <h3 className="font-display font-semibold text-sm flex items-center gap-2">
            <Gift className="h-4 w-4 text-secondary" />
            Gekwalificeerden (≥5 actieve referrals)
            {qualified && <Badge variant="outline" className="text-[10px]">{qualified.length}</Badge>}
          </h3>
          {loadingQual ? (
            <Skeleton className="h-24 rounded-md" />
          ) : (qualified?.length ?? 0) === 0 ? (
            <p className="text-xs text-muted-foreground py-3 text-center">Nog niemand gekwalificeerd.</p>
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
              {qualified!.map((q, i) => (
                <div
                  key={q.user_id}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md text-xs",
                    i === 0 ? "bg-secondary/15 ring-1 ring-secondary/30" : "hover:bg-muted/50",
                  )}
                >
                  <span className="font-bold w-6 text-center">
                    {i === 0 ? "🏆" : `#${i + 1}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{q.name || "Onbekend"}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{q.email}</p>
                  </div>
                  <span className="text-[10px] flex items-center gap-0.5 text-muted-foreground">
                    <Users className="h-3 w-3" /> {q.active_referrals}
                  </span>
                  <span className="font-mono font-bold tabular-nums">{q.global_points}p</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referral log — wie heeft wie binnengehaald */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <h3 className="font-display font-semibold text-sm flex items-center gap-2">
            <Network className="h-4 w-4 text-primary" />
            Referral-log
            {groupedLog && <Badge variant="outline" className="text-[10px]">{groupedLog.length} uitnodigers</Badge>}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Alle aanmeldingen via een invite-link. Vouw uit om de uitnodigingen per persoon te zien.
          </p>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Zoek op naam, email of code..."
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              className="h-8 pl-7 text-xs"
            />
          </div>
          {loadingLog ? (
            <Skeleton className="h-32 rounded-md" />
          ) : filteredLog.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3 text-center">
              {logSearch ? "Geen resultaten." : "Nog geen referrals."}
            </p>
          ) : (
            <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
              {filteredLog.map((g) => {
                const open = expanded.has(g.referrer_user_id);
                const qualified = g.active >= 5;
                return (
                  <div key={g.referrer_user_id} className="rounded-md border border-muted/50">
                    <button
                      onClick={() => toggle(g.referrer_user_id)}
                      className="w-full flex items-center gap-2 p-2 text-xs hover:bg-muted/30 rounded-md"
                    >
                      {open
                        ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium truncate flex items-center gap-1">
                          {g.referrer_name}
                          {qualified && <span className="text-[9px] px-1 py-0 rounded-full bg-emerald-500/20 text-emerald-700 font-bold">5+</span>}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">{g.referrer_code}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {g.active}/{g.total} actief
                      </span>
                    </button>
                    {open && (
                      <div className="border-t border-muted/50 px-2 py-1.5 space-y-1">
                        {g.referees.map((r) => (
                          <div key={r.referee_user_id} className="flex items-center gap-2 text-[11px] py-1">
                            <span className={cn(
                              "h-5 w-5 rounded-full flex items-center justify-center shrink-0",
                              r.is_active ? "bg-emerald-500/20 text-emerald-600" : "bg-muted text-muted-foreground",
                            )}>
                              {r.is_active ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{r.referee_name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {r.referee_email} · {formatNLDateTime(r.referee_signed_at)}
                              </p>
                            </div>
                            <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                              {r.prediction_count} pred.
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
