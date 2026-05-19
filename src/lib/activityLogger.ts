import { supabase } from "@/integrations/supabase/client";

/**
 * Insert a live activity event. Admins subscribe to this feed via Realtime.
 * Fail silently — analytics-grade reliability is not required.
 */
export async function logActivity(
  eventType: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  try {
    await supabase.rpc("log_activity_event", {
      _event_type: eventType,
      _payload: payload,
    });
  } catch {
    /* swallow */
  }
}
