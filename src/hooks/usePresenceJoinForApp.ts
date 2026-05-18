import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useJoinPresence } from "./useAdminPresence";

/**
 * Wires up the realtime presence channel for the current user, with a
 * friendly display name and admin flag. Called once from AppLayout.
 */
export function usePresenceJoinForApp() {
  const { user } = useAuth();
  const [name, setName] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setName("");
      setIsAdmin(false);
      return;
    }

    let cancelled = false;

    supabase
      .from("profiles")
      .select("name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setName((data?.name as string) || user.email || "Anoniem");
      });

    supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data }) => {
        if (!cancelled) setIsAdmin(data === true);
      });

    return () => { cancelled = true; };
  }, [user?.id]);

  useJoinPresence({ name, isAdmin });
}
