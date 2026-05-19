import { useObservePresence } from "@/hooks/useAdminPresence";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, User, MonitorSmartphone } from "lucide-react";
import { useMemo, useState } from "react";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "nu";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  return `${h}u`;
}

type Filter = "all" | "admin" | "users";

export function OnlineUsersList({ enabled }: { enabled: boolean }) {
  const { users: presence, diagnostics } = useObservePresence(enabled);
  const [filter, setFilter] = useState<Filter>("all");
  const [showDebug, setShowDebug] = useState(false);

  const filtered = useMemo(() => {
    if (filter === "admin") return presence.filter((p) => p.is_admin);
    if (filter === "users") return presence.filter((p) => !p.is_admin);
    return presence;
  }, [presence, filter]);

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3
              className="font-display font-semibold text-sm flex items-center gap-2 cursor-pointer"
              onClick={() => setShowDebug((v) => !v)}
              title="Tik om debug-info te tonen"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              {presence.length} online
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Wie is nu in de app
            </p>
          </div>
          <div className="flex gap-1">
            {(["all", "admin", "users"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                  filter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {f === "all" ? "Alle" : f === "admin" ? "Admins" : "Users"}
              </button>
            ))}
          </div>
        </div>

        {showDebug && (
          <div className="text-[10px] bg-muted/60 rounded-md p-2 space-y-0.5 font-mono">
            <p>status: <span className="text-primary">{diagnostics.status}</span></p>
            <p>raw entries: {diagnostics.rawEntries} · valid: {presence.length}</p>
            <p>last sync: {diagnostics.lastSyncAt
              ? new Date(diagnostics.lastSyncAt).toLocaleTimeString("nl-NL")
              : "nooit"}</p>
            <p>opened: {diagnostics.channelOpenedAt
              ? new Date(diagnostics.channelOpenedAt).toLocaleTimeString("nl-NL")
              : "—"}</p>
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Niemand online.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {filtered.map((u) => (
              <div
                key={u.user_id}
                className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {u.avatar_url ? (
                    <img
                      src={u.avatar_url}
                      alt=""
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-3.5 w-3.5 text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium truncate">{u.name}</p>
                    {u.is_admin && (
                      <Crown className="h-3 w-3 text-amber-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {u.route}
                  </p>
                </div>
                <Badge variant="outline" className="text-[9px] gap-0.5 shrink-0">
                  <MonitorSmartphone className="h-2.5 w-2.5" />
                  {timeAgo(u.joined_at)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
