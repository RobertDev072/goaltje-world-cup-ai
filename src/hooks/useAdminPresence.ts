import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

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
 * Joins the admin:online presence channel so admins can see who's online.
 *
 * Implementation detail: we subscribe ONCE per user session (keyed by user.id)
 * and re-track when route/name/admin-status changes via a separate effect.
 * Re-subscribing on every navigation tore down the channel before the
 * presence state propagated.
 */
export function useJoinPresence(opts?: { name?: string; isAdmin?: boolean }) {
  const { user } = useAuth();
  const location = useLocation();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedRef = useRef(false);

  const nameRef    = useRef(opts?.name);
  const adminRef   = useRef(opts?.isAdmin);
  const routeRef   = useRef(location.pathname);
  useEffect(() => { nameRef.current  = opts?.name;     }, [opts?.name]);
  useEffect(() => { adminRef.current = opts?.isAdmin;  }, [opts?.isAdmin]);
  useEffect(() => { routeRef.current = location.pathname; }, [location.pathname]);

  // Subscribe once per user
  useEffect(() => {
    if (!user) {
      subscribedRef.current = false;
      return;
    }

    const channel = supabase.channel(CHANNEL_NAME, {
      config: { presence: { key: user.id } },
    });
    channelRef.current = channel;

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        subscribedRef.current = true;
        await channel.track({
          user_id: user.id,
          name: nameRef.current || user.email || "Anoniem",
          email: user.email,
          avatar_url: (user.user_metadata?.avatar_url as string) || null,
          route: routeRef.current,
          joined_at: new Date().toISOString(),
          is_admin: !!adminRef.current,
        });
      }
    });

    return () => {
      subscribedRef.current = false;
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user?.id]);

  // Re-track when route or display props change
  useEffect(() => {
    const channel = channelRef.current;
    if (!channel || !subscribedRef.current || !user) return;
    channel
      .track({
        user_id: user.id,
        name: opts?.name || user.email || "Anoniem",
        email: user.email,
        avatar_url: (user.user_metadata?.avatar_url as string) || null,
        route: location.pathname,
        joined_at: new Date().toISOString(),
        is_admin: !!opts?.isAdmin,
      })
      .catch(() => {});
  }, [location.pathname, opts?.name, opts?.isAdmin, user?.id]);
}

/**
 * Subscribes to the presence channel as an observer and returns the
 * current list of online users. Only used inside the admin dashboard.
 */
export function useObservePresence(enabled: boolean): PresenceUser[] {
  const [users, setUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!enabled) {
      setUsers([]);
      return;
    }

    const channel = supabase.channel(CHANNEL_NAME, {
      config: { presence: { key: `observer-${Math.random().toString(36).slice(2)}` } },
    });

    const refresh = () => {
      const state = channel.presenceState() as Record<string, unknown[]>;
      const dedup = new Map<string, PresenceUser>();
      Object.values(state).forEach((entries) => {
        (entries || []).forEach((entry) => {
          const e = entry as Partial<PresenceUser>;
          if (!e?.user_id) return;
          const prev = dedup.get(e.user_id);
          if (!prev || (prev.joined_at && e.joined_at && prev.joined_at < e.joined_at)) {
            dedup.set(e.user_id, e as PresenceUser);
          }
        });
      });
      setUsers(Array.from(dedup.values()));
    };

    channel.on("presence", { event: "sync" },  refresh);
    channel.on("presence", { event: "join" },  refresh);
    channel.on("presence", { event: "leave" }, refresh);
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled]);

  return users;
}
