import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const HEARTBEAT_INTERVAL_MS = 90_000;
const MIN_WRITE_GAP_MS      = 30_000;

/**
 * Pings user_heartbeat(route) every 90s while the tab is visible.
 * Also pings immediately on route changes, but de-duplicates if the
 * last write happened within 30s — protects DB from heartbeat-storms
 * at 5K+ concurrent users.
 */
export function useHeartbeat() {
  const { user } = useAuth();
  const location = useLocation();
  const routeRef = useRef(location.pathname);
  const lastWriteRef = useRef(0);
  routeRef.current = location.pathname;

  useEffect(() => {
    if (!user) return;

    let intervalId: number | undefined;

    const ping = () => {
      const now = Date.now();
      if (now - lastWriteRef.current < MIN_WRITE_GAP_MS) return;
      lastWriteRef.current = now;
      supabase
        .rpc("user_heartbeat", { _route: routeRef.current })
        .then(() => {}, () => {});
    };

    const start = () => {
      ping();
      intervalId = window.setInterval(ping, HEARTBEAT_INTERVAL_MS);
    };

    const stop = () => {
      if (intervalId !== undefined) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        if (intervalId === undefined) start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      stop();
    };
  }, [user?.id]);

  // Ping on route changes (subject to de-dupe gap)
  useEffect(() => {
    if (!user) return;
    const now = Date.now();
    if (now - lastWriteRef.current < MIN_WRITE_GAP_MS) return;
    lastWriteRef.current = now;
    supabase
      .rpc("user_heartbeat", { _route: location.pathname })
      .then(() => {}, () => {});
  }, [location.pathname, user?.id]);
}
