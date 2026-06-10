import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  PlugZap, Play, Eye, EyeOff, Clock, Gauge, ShieldCheck, AlertTriangle, Copy, Check,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const PRESETS: Array<{ label: string; path: string; method: "GET"; description: string }> = [
  { label: "Teams",     path: "/teams",     method: "GET", description: "Lijst van alle 48 teams" },
  { label: "Groups",    path: "/groups",    method: "GET", description: "Groepsindeling A–L" },
  { label: "Matches",   path: "/matches",   method: "GET", description: "Alle 104 wedstrijden + status" },
  { label: "Stadiums",  path: "/stadiums",  method: "GET", description: "Lijst van 16 stadions" },
];

interface ProxyResponse {
  ok: boolean;
  status: number;
  duration_ms: number;
  request_url: string;
  headers: Record<string, string>;
  rate_limit: { limit: string | null; remaining: string | null; reset: string | null };
  body: unknown;
  raw_body: string | null;
  parse_error: string | null;
}

const TOKEN_LS_KEY = "wc2026_api_bearer";

export function ApiTestPanel({ enabled }: { enabled: boolean }) {
  const [bearer, setBearer] = useState<string>(() => localStorage.getItem(TOKEN_LS_KEY) || "");
  const [showToken, setShowToken] = useState(false);
  const [preset, setPreset] = useState<string>(PRESETS[0].path);
  const [customPath, setCustomPath] = useState<string>("");
  const [response, setResponse] = useState<ProxyResponse | null>(null);
  const [bodyCopied, setBodyCopied] = useState(false);

  const path = customPath.trim() || preset;
  const activeDescription = useMemo(
    () => PRESETS.find((p) => p.path === preset)?.description,
    [preset],
  );

  const send = useMutation({
    mutationFn: async () => {
      if (!bearer.trim()) throw new Error("Vul je Bearer-token in");
      if (!path.startsWith("/")) throw new Error("Pad moet beginnen met /");
      const { data, error } = await supabase.functions.invoke("wc2026-api-proxy", {
        body: { path, method: "GET", bearer: bearer.trim() },
      });
      if (error) throw error;
      return data as ProxyResponse;
    },
    onSuccess: (data) => {
      setResponse(data);
      localStorage.setItem(TOKEN_LS_KEY, bearer.trim());
    },
    onError: (err: Error) => {
      toast({ title: "Mislukt", description: err.message, variant: "destructive" });
    },
  });

  const handleCopy = () => {
    const text = response?.body
      ? JSON.stringify(response.body, null, 2)
      : response?.raw_body ?? "";
    navigator.clipboard.writeText(text).then(() => {
      setBodyCopied(true);
      toast({ title: "Response gekopieerd" });
      setTimeout(() => setBodyCopied(false), 1500);
    });
  };

  if (!enabled) return null;

  return (
    <div className="space-y-4">
      {/* Intro */}
      <Card className="border-0 shadow-sm bg-muted/30">
        <CardContent className="p-3 flex items-start gap-2 text-xs">
          <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          <div className="text-muted-foreground">
            <p className="font-medium text-foreground">api.wc2026api.com test-tool</p>
            <p>Calls lopen via een server-side edge function (admin-only). Bearer-token
              wordt lokaal in je browser bewaard, niet in de DB. Niets in deze tool
              raakt de productie sync-flow.</p>
          </div>
        </CardContent>
      </Card>

      {/* Configuratie */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <h3 className="font-display font-semibold text-sm flex items-center gap-2">
            <PlugZap className="h-4 w-4 text-primary" /> Configuratie
          </h3>

          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground">Bearer-token</label>
            <div className="flex gap-2">
              <Input
                type={showToken ? "text" : "password"}
                value={bearer}
                onChange={(e) => setBearer(e.target.value)}
                placeholder="wc26_..."
                className="h-9 text-xs font-mono"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 px-2 shrink-0"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground">Endpoint</label>
            <Select value={preset} onValueChange={(v) => { setPreset(v); setCustomPath(""); }}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESETS.map((p) => (
                  <SelectItem key={p.path} value={p.path}>
                    <span className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-mono">{p.method}</Badge>
                      <span>{p.label}</span>
                      <span className="text-muted-foreground">{p.path}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeDescription && (
              <p className="text-[10px] text-muted-foreground">{activeDescription}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground">
              Of: custom pad (overschrijft endpoint hierboven)
            </label>
            <Input
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              placeholder="/matches/123"
              className="h-9 text-xs font-mono"
            />
          </div>

          <Button
            className="w-full gap-2"
            onClick={() => send.mutate()}
            disabled={send.isPending || !bearer.trim()}
          >
            <Play className="h-4 w-4" />
            {send.isPending ? "Bezig..." : `Verstuur GET ${path}`}
          </Button>
        </CardContent>
      </Card>

      {/* Response */}
      {response && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-sm">Response</h3>
              <div className="flex items-center gap-2">
                <Badge
                  variant={response.ok ? "default" : "destructive"}
                  className={response.ok ? "bg-emerald-500" : ""}
                >
                  HTTP {response.status}
                </Badge>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {response.duration_ms} ms
                </span>
              </div>
            </div>

            <div className="text-[10px] text-muted-foreground font-mono break-all">
              {response.request_url}
            </div>

            {/* Rate-limit */}
            {response.rate_limit.limit && (
              <div className="flex items-center gap-2 text-xs p-2 rounded bg-muted/50">
                <Gauge className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-muted-foreground">Rate-limit:</span>
                <span className="font-mono font-medium">
                  {response.rate_limit.remaining}/{response.rate_limit.limit}
                </span>
                {response.rate_limit.reset && (
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    reset {response.rate_limit.reset}s
                  </span>
                )}
              </div>
            )}

            {/* Parse-fout */}
            {response.parse_error && (
              <div className="flex items-start gap-2 text-xs p-2 rounded bg-amber-500/10 text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>JSON parse-fout: {response.parse_error}</span>
              </div>
            )}

            {/* Body */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] text-muted-foreground">Body</label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 gap-1 text-[10px]"
                  onClick={handleCopy}
                >
                  {bodyCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  kopiëer
                </Button>
              </div>
              <pre className="text-[10px] font-mono bg-muted/60 rounded p-2 max-h-96 overflow-auto">
                {response.body != null
                  ? JSON.stringify(response.body, null, 2)
                  : response.raw_body || "(leeg)"}
              </pre>
            </div>

            {/* Sample-counts */}
            {Array.isArray(response.body) && (
              <p className="text-[11px] text-muted-foreground">
                Array met <b className="text-foreground">{response.body.length}</b> items ontvangen.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
