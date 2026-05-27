import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldAlert, ShieldCheck, AlertTriangle, Activity,
  Mail, Globe, Bot,
} from "lucide-react";
import { formatNLDateTime } from "@/lib/timezone";
import { countryFlag } from "@/lib/ipMask";

interface FailedLoginSummary {
  email: string;
  attempt_count: number;
  first_attempt: string;
  last_attempt: string;
  reasons: string[];
}

interface SuspiciousPatterns {
  brute_force: Array<{ email: string; attempt_count: number; last_attempt: string }>;
  multi_country: Array<{
    user_id: string;
    name: string | null;
    email: string | null;
    countries: string[];
    last_login: string;
  }>;
  prediction_bursts: Array<{
    user_id: string;
    name: string | null;
    prediction_count: number;
    window_start: string;
  }>;
  generated_at: string;
}

export function SecurityPanel({ enabled }: { enabled: boolean }) {
  const { data: failedLogins, isLoading: loadingFailed } = useQuery({
    queryKey: ["admin-failed-logins"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_failed_login_summary", { _hours: 24 });
      if (error) throw error;
      return (data || []) as FailedLoginSummary[];
    },
    enabled,
    refetchInterval: enabled ? 30_000 : false,
    staleTime: 15_000,
  });

  const { data: patterns, isLoading: loadingPatterns } = useQuery({
    queryKey: ["admin-suspicious-patterns"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_suspicious_patterns");
      if (error) throw error;
      return data as SuspiciousPatterns;
    },
    enabled,
    refetchInterval: enabled ? 60_000 : false,
    staleTime: 30_000,
  });

  const hasFlags =
    (patterns?.brute_force?.length ?? 0) > 0 ||
    (patterns?.multi_country?.length ?? 0) > 0 ||
    (patterns?.prediction_bursts?.length ?? 0) > 0;

  return (
    <div className="space-y-4">
      {/* Overall verdict */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-3 flex items-center gap-3">
          {hasFlags ? (
            <>
              <ShieldAlert className="h-5 w-5 text-rose-500" />
              <div>
                <p className="text-sm font-medium">Verdachte activiteit gedetecteerd</p>
                <p className="text-[10px] text-muted-foreground">
                  Bekijk de flags hieronder en onderneem actie indien nodig.
                </p>
              </div>
            </>
          ) : (
            <>
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-sm font-medium">Geen verdachte patronen</p>
                <p className="text-[10px] text-muted-foreground">
                  Laatste check: {patterns?.generated_at ? formatNLDateTime(patterns.generated_at) : "—"}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Brute force */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-2">
          <h3 className="font-display font-semibold text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-500" />
            Brute force pogingen (10 min)
            {(patterns?.brute_force?.length ?? 0) > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {patterns!.brute_force.length}
              </Badge>
            )}
          </h3>
          {loadingPatterns ? (
            <Skeleton className="h-12 rounded-md" />
          ) : (patterns?.brute_force?.length ?? 0) === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Geen brute force.</p>
          ) : (
            <div className="space-y-1.5">
              {patterns!.brute_force.map((b, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-1 px-2 rounded-md bg-rose-50 dark:bg-rose-950/30">
                  <Mail className="h-3 w-3 text-rose-500 shrink-0" />
                  <span className="font-mono truncate flex-1">{b.email}</span>
                  <Badge variant="destructive" className="text-[10px]">{b.attempt_count}×</Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {formatNLDateTime(b.last_attempt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Multi-country */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-2">
          <h3 className="font-display font-semibold text-sm flex items-center gap-2">
            <Globe className="h-4 w-4 text-amber-500" />
            Multi-country sessies (1 uur)
            {(patterns?.multi_country?.length ?? 0) > 0 && (
              <Badge className="text-[10px] bg-amber-500">
                {patterns!.multi_country.length}
              </Badge>
            )}
          </h3>
          {loadingPatterns ? (
            <Skeleton className="h-12 rounded-md" />
          ) : (patterns?.multi_country?.length ?? 0) === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Geen multi-country activiteit.</p>
          ) : (
            <div className="space-y-1.5">
              {patterns!.multi_country.map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-1 px-2 rounded-md bg-amber-50 dark:bg-amber-950/30">
                  <span className="font-medium truncate flex-1">{m.name || m.email || "Onbekend"}</span>
                  <span>
                    {m.countries.map((c) => countryFlag(c)).join(" ")}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatNLDateTime(m.last_login)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prediction bursts (bot-like) */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-2">
          <h3 className="font-display font-semibold text-sm flex items-center gap-2">
            <Bot className="h-4 w-4 text-violet-500" />
            Voorspellings-bursts (24u)
            {(patterns?.prediction_bursts?.length ?? 0) > 0 && (
              <Badge className="text-[10px] bg-violet-500">
                {patterns!.prediction_bursts.length}
              </Badge>
            )}
          </h3>
          {loadingPatterns ? (
            <Skeleton className="h-12 rounded-md" />
          ) : (patterns?.prediction_bursts?.length ?? 0) === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Geen abnormale prediction-bursts.</p>
          ) : (
            <div className="space-y-1.5">
              {patterns!.prediction_bursts.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-1 px-2 rounded-md bg-violet-50 dark:bg-violet-950/30">
                  <span className="font-medium truncate flex-1">{p.name || p.user_id.slice(0, 8)}</span>
                  <Badge className="text-[10px] bg-violet-500">{p.prediction_count}/min</Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {formatNLDateTime(p.window_start)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All failed logins last 24h */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-2">
          <h3 className="font-display font-semibold text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Alle failed logins (24u)
          </h3>
          {loadingFailed ? (
            <Skeleton className="h-12 rounded-md" />
          ) : (failedLogins?.length ?? 0) === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Geen mislukte logins in laatste 24u.</p>
          ) : (
            <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
              {failedLogins!.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-muted/50">
                  <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="font-mono truncate flex-1">{f.email}</span>
                  <Badge variant="outline" className="text-[10px]">{f.attempt_count}×</Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {formatNLDateTime(f.last_attempt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
