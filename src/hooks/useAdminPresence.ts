import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PresenceUser {
  user_id: string;
  name: string;
  email?: string | null;
  avatar_url?: string | null;
  route: string;
  last_seen_at: string;
  country?: string | null;
  device?: string | null;
  is_admin?: boolean;
}

export interface PresenceDiagnostics {
  status: string;
  rawEntries: number;
  lastSyncAt: string | null;
  channelOpenedAt: string;
}

/**
 * No-op now. Heartbeat (in useHeartbeat) updates last_seen_at + route,
 * which is what the admin observer reads from get_online_users().
 *
 * Kept as an exported symbol so AppLayout doesn't need to change.
 */
export function useJoinPresence(_opts?: { name?: string; isAdmin?: boolean }) {
  // intentionally empty
}

/**
 * Polls get_online_users() every 20s. Replaces the previous Realtime
 * presence channel which was blocked by Supabase's private-channel RLS.
 */
export function useObservePresence(enabled: boolean): {
  users: PresenceUser[];
  diagnostics: PresenceDiagnostics;
} {
  const query = useQuery({
    queryKey: ["admin-online-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_online_users", { _minutes: 2 });
      if (error) throw error;
      return (data || []) as Array<{
        user_id: string;
        name: string | null;
        email: string | null;
        avatar_url: string | null;
        last_seen_at: string;
        country: string | null;
        device_info: string | null;
        current_route: string | null;
        is_admin: boolean;
      }>;
    },
    enabled,
    refetchInterval: enabled ? 20_000 : false,
    refetchIntervalInBackground: false,
    staleTime: 10_000,
  });

  const users: PresenceUser[] = (query.data || []).map((u) => ({
    user_id: u.user_id,
    name: u.name || u.email || "Anoniem",
    email: u.email,
    avatar_url: u.avatar_url,
    route: u.current_route || "—",
    last_seen_at: u.last_seen_at,
    country: u.country,
    device: u.device_info,
    is_admin: u.is_admin,
  }));

  const diagnostics: PresenceDiagnostics = {
    status: query.isLoading
      ? "loading"
      : query.error
      ? `error: ${(query.error as Error).message}`
      : `ok (${users.length})`,
    rawEntries: query.data?.length ?? 0,
    lastSyncAt: query.dataUpdatedAt ? new Date(query.dataUpdatedAt).toISOString() : null,
    channelOpenedAt: "",
  };

  return { users, diagnostics };
}
