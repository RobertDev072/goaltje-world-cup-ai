import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ActivityEvent {
  id: string;
  event_type: string;
  user_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

const MAX_FEED = 50;

/**
 * Subscribes to activity_events realtime + initial backlog of last 50.
 * Admin-only; RLS ensures non-admins get an empty list.
 */
export function useActivityFeed(enabled: boolean) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setEvents([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      const { data } = await supabase
        .from("activity_events")
        .select("id, event_type, user_id, payload, created_at")
        .order("created_at", { ascending: false })
        .limit(MAX_FEED);
      if (cancelled) return;
      setEvents((data as ActivityEvent[]) || []);
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel("admin-activity-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_events" },
        (payload) => {
          const newEvent = payload.new as ActivityEvent;
          setEvents((prev) => [newEvent, ...prev].slice(0, MAX_FEED));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [enabled]);

  return { events, loading };
}
