import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle, CheckCircle2, ChevronDown, ChevronRight,
  RotateCcw, Trash2, ExternalLink,
} from "lucide-react";
import { formatNLDateTime } from "@/lib/timezone";
import { toast } from "@/hooks/use-toast";

interface ClientError {
  id: string;
  fingerprint: string;
  message: string;
  stack: string | null;
  route: string | null;
  user_agent: string | null;
  count: number;
  first_seen_at: string;
  last_seen_at: string;
  last_user_id: string | null;
  last_payload: Record<string, unknown> | null;
  resolved_at: string | null;
}

type FilterMode = "unresolved" | "resolved" | "all";

export function ClientErrorsList({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterMode>("unresolved");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: errors, isLoading } = useQuery({
    queryKey: ["admin-client-errors", filter],
    queryFn: async () => {
      let q = supabase
        .from("client_errors")
        .select("*")
        .order("last_seen_at", { ascending: false })
        .limit(200);

      if (filter === "unresolved") q = q.is("resolved_at", null);
      if (filter === "resolved")   q = q.not("resolved_at", "is", null);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ClientError[];
    },
    enabled,
    refetchInterval: enabled ? 30_000 : false,
    staleTime: 15_000,
  });

  const resolve = useMutation({
    mutationFn: async ({ id, resolve }: { id: string; resolve: boolean }) => {
      const { error } = await supabase.rpc("resolve_client_error", {
        _id: id, _resolve: resolve,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast({ title: vars.resolve ? "Gemarkeerd als opgelost" : "Heropend" });
      queryClient.invalidateQueries({ queryKey: ["admin-client-errors"] });
    },
    onError: (err: Error) => toast({ title: "Fout", description: err.message, variant: "destructive" }),
  });

  const removeError = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_errors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Verwijderd" });
      queryClient.invalidateQueries({ queryKey: ["admin-client-errors"] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  const counts = {
    unresolved: errors?.filter((e) => !e.resolved_at).length ?? 0,
    resolved:   errors?.filter((e) =>  e.resolved_at).length ?? 0,
    all:        errors?.length ?? 0,
  };

  return (
    <div className="space-y-3">
      <Card className="border-0 shadow-sm bg-muted/40">
        <CardContent className="p-3 text-xs text-muted-foreground">
          Errors zijn ge-dedupeerd op (bericht + route). Bij herhaling
          telt de teller op, geen nieuwe rij. Maximaal ~100 unieke errors
          ooit, zelfs bij 1M crashes.
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {(["unresolved", "resolved", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {f === "unresolved" ? "Open" : f === "resolved" ? "Opgelost" : "Alles"}
            <span className="ml-1.5 opacity-70">({(counts as Record<string, number>)[f]})</span>
          </button>
        ))}
      </div>

      {errors && errors.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            🎉 Geen {filter === "unresolved" ? "open" : ""} errors.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(errors || []).map((e) => {
            const isOpen = expandedId === e.id;
            const isResolved = !!e.resolved_at;
            return (
              <Card key={e.id} className={`border-0 shadow-sm ${isResolved ? "opacity-60" : ""}`}>
                <CardContent className="p-3 space-y-2">
                  <div
                    className="flex items-start gap-2 cursor-pointer"
                    onClick={() => setExpandedId(isOpen ? null : e.id)}
                  >
                    <div className="shrink-0 mt-0.5">
                      {isResolved ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-rose-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate font-mono">{e.message}</p>
                      <div className="flex items-center gap-2 flex-wrap pt-0.5">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {e.count}× gezien
                        </Badge>
                        {e.route && (
                          <span className="text-[10px] text-muted-foreground truncate">{e.route}</span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {formatNLDateTime(e.last_seen_at)}
                        </span>
                      </div>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </div>

                  {isOpen && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <p className="text-muted-foreground">Eerste keer</p>
                          <p className="font-mono">{formatNLDateTime(e.first_seen_at)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Laatste keer</p>
                          <p className="font-mono">{formatNLDateTime(e.last_seen_at)}</p>
                        </div>
                        {e.user_agent && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground">User agent</p>
                            <p className="font-mono truncate" title={e.user_agent}>{e.user_agent}</p>
                          </div>
                        )}
                      </div>

                      {e.stack && (
                        <details className="text-[10px]">
                          <summary className="cursor-pointer text-muted-foreground font-medium">
                            Stack trace
                          </summary>
                          <pre className="mt-1 p-2 bg-muted/60 rounded text-[10px] overflow-x-auto whitespace-pre-wrap font-mono">
                            {e.stack}
                          </pre>
                        </details>
                      )}

                      {e.last_payload && Object.keys(e.last_payload).length > 0 && (
                        <details className="text-[10px]">
                          <summary className="cursor-pointer text-muted-foreground font-medium">
                            Payload
                          </summary>
                          <pre className="mt-1 p-2 bg-muted/60 rounded text-[10px] overflow-x-auto font-mono">
                            {JSON.stringify(e.last_payload, null, 2)}
                          </pre>
                        </details>
                      )}

                      <div className="flex gap-2 pt-1">
                        {!isResolved && (
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs gap-1"
                            onClick={() => resolve.mutate({ id: e.id, resolve: true })}
                            disabled={resolve.isPending}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Opgelost
                          </Button>
                        )}
                        {isResolved && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => resolve.mutate({ id: e.id, resolve: false })}
                            disabled={resolve.isPending}
                          >
                            <RotateCcw className="h-3 w-3" />
                            Heropen
                          </Button>
                        )}
                        {e.route && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs gap-1"
                            asChild
                          >
                            <a href={e.route} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-3 w-3" />
                              Open route
                            </a>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs gap-1 ml-auto text-destructive"
                          onClick={() => removeError.mutate(e.id)}
                          disabled={removeError.isPending}
                          title="Definitief verwijderen"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
