import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface PresenceUser {
  user_id: string;
  name: string;
  email?: string | null;
  avatar_url?: string | null;
  route: string;
  joined_at: string;
  device?: string | null;
  is_admin?: boolean;
}

const CHANNEL_NAME = "admin:online";

/**
 * Joins a Realtime presence channel so admins can see who is online.
 * Every authenticated user joins; only the admin dashboard subscribes to read the list.
 */
export function useJoinPresence(opts?: { name?: string; isAdmin?: boolean }) {
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(CHANNEL_NAME, {
      config: { presence: { key: user.id } },
    });

    channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;
      await channel.track({
        user_id: user.id,
        name: opts?.name || user.email || "Anoniem",
        email: user.email,
        avatar_url: (user.user_metadata?.avatar_url as string) || null,
        route: location.pathname,
        joined_at: new Date().toISOString(),
        is_admin: !!opts?.isAdmin,
      });
    });

    const updateRoute = () => {
      channel.track({
        user_id: user.id,
        name: opts?.name || user.email || "Anoniem",
        email: user.email,
        avatar_url: (user.user_metadata?.avatar_url as string) || null,
        route: location.pathname,
        joined_at: new Date().toISOString(),
        is_admin: !!opts?.isAdmin,
      }).catch(() => {});
    };

    updateRoute();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, location.pathname, opts?.isAdmin, opts?.name]);
}

/**
 * Subscribes to presence channel and returns the current list of online users.
 * Only used inside the admin dashboard.
 */
export function useObservePresence(enabled: boolean): PresenceUser[] {
  const [users, setUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!enabled) {
      setUsers([]);
      return;
    }

    const channel = supabase.channel(CHANNEL_NAME, {
      config: { presence: { key: "observer-" + Math.random().toString(36).slice(2) } },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState() as Record<string, unknown[]>;
      const flat: PresenceUser[] = [];
      Object.values(state).forEach((entries) => {
        (entries || []).forEach((entry) => {
          const e = entry as Partial<PresenceUser>;
          if (e?.user_id) flat.push(e as PresenceUser);
        });
      });
      // dedupe per user_id, latest joined wins
      const dedup = new Map<string, PresenceUser>();
      flat.forEach((u) => {
        const prev = dedup.get(u.user_id);
        if (!prev || prev.joined_at < u.joined_at) dedup.set(u.user_id, u);
      });
      setUsers(Array.from(dedup.values()));
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled]);

  return users;
}
