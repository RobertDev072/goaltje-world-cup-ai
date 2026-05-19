import { useActivityFeed, type ActivityEvent } from "@/hooks/useActivityFeed";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LogIn, LogOut, Sparkles, Users as UsersIcon,
  Trophy, ShieldAlert, Ban, FilePen, Activity,
} from "lucide-react";
import { formatNLDateTime } from "@/lib/timezone";

function eventIcon(type: string) {
  if (type === "login") return <LogIn className="h-3.5 w-3.5 text-emerald-500" />;
  if (type === "logout") return <LogOut className="h-3.5 w-3.5 text-muted-foreground" />;
  if (type === "prediction_submitted") return <FilePen className="h-3.5 w-3.5 text-blue-500" />;
  if (type === "pool_joined") return <UsersIcon className="h-3.5 w-3.5 text-violet-500" />;
  if (type === "pool_created") return <Sparkles className="h-3.5 w-3.5 text-amber-500" />;
  if (type === "match_viewed") return <Trophy className="h-3.5 w-3.5 text-orange-500" />;
  if (type.startsWith("admin_user_banned")) return <Ban className="h-3.5 w-3.5 text-rose-600" />;
  if (type.startsWith("admin_")) return <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />;
  return <Activity className="h-3.5 w-3.5 text-muted-foreground" />;
}

function eventLabel(e: ActivityEvent): string {
  const p = e.payload || {};
  switch (e.event_type) {
    case "login":
      return p.country ? `Ingelogd vanuit ${String(p.country)}` : "Ingelogd";
    case "logout": return "Uitgelogd";
    case "prediction_submitted": return `Voorspelling opgeslagen`;
    case "pool_joined": return `Pool gejoind`;
    case "pool_created": return `Pool aangemaakt`;
    case "match_viewed": return `Match bekeken`;
    case "admin_user_banned": return `Admin banned user`;
    case "admin_user_unbanned": return `Admin unbanned user`;
    default: return e.event_type;
  }
}

export function LiveActivityFeed({ enabled }: { enabled: boolean }) {
  const { events, loading } = useActivityFeed(enabled);

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Live activity feed
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Realtime — laatste {events.length || 50} events
            </p>
          </div>
          <Badge variant="outline" className="text-[10px]">live</Badge>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-md" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Nog geen events. Zodra iemand inlogt of een voorspelling opslaat
            verschijnt het hier.
          </p>
        ) : (
          <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
            {events.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 text-xs"
              >
                <div className="shrink-0">{eventIcon(e.event_type)}</div>
                <span className="flex-1 truncate">{eventLabel(e)}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatNLDateTime(e.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
