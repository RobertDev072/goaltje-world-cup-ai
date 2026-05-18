import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Pings the server every 60 seconds while the tab is visible, so admin
 * dashboard can show who is currently online. Pauses while tab is hidden.
 */
export function useHeartbeat() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    let intervalId: number | undefined;

    const ping = () => {
      supabase.rpc("user_heartbeat").then(() => {}, () => {});
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
}
