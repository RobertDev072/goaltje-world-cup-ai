import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Pings user_heartbeat(route) every 60s while the tab is visible.
 * Also pings on route changes so the "where is the user now" admin
 * view stays fresh without waiting for the next interval.
 */
export function useHeartbeat() {
  const { user } = useAuth();
  const location = useLocation();
  const routeRef = useRef(location.pathname);
  routeRef.current = location.pathname;

  useEffect(() => {
    if (!user) return;

    let intervalId: number | undefined;

    const ping = () => {
      supabase.rpc("user_heartbeat", { _route: routeRef.current }).then(() => {}, () => {});
    };

    const start = () => {
      ping();
      intervalId = window.setInterval(ping, 60_000);
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

  // Also ping immediately on route changes so the admin view updates fast
  useEffect(() => {
    if (!user) return;
    supabase.rpc("user_heartbeat", { _route: location.pathname }).then(() => {}, () => {});
  }, [location.pathname, user?.id]);
}
