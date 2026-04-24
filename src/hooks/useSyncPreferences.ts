import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys, staleTimes } from "@/lib/queryKeys";

type SyncPrefsRow = {
  bulk_predict_enabled: boolean;
  sync_onboarded: boolean;
};

type EnableResult = { matches_filled: number; pools_affected: number };

export function useSyncPreferences() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.syncPreferences(user?.id ?? ""),
    queryFn: async (): Promise<SyncPrefsRow> => {
      if (!user) return { bulk_predict_enabled: false, sync_onboarded: false };
      const { data, error } = await supabase
        .from("profiles")
        .select("bulk_predict_enabled, sync_onboarded")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return {
        bulk_predict_enabled: !!data?.bulk_predict_enabled,
        sync_onboarded: !!data?.sync_onboarded,
      };
    },
    enabled: !!user,
    staleTime: staleTimes.profile,
  });

  const invalidate = () => {
    if (!user) return;
    qc.invalidateQueries({ queryKey: queryKeys.syncPreferences(user.id) });
    qc.invalidateQueries({ queryKey: queryKeys.syncPreview(user.id) });
    qc.invalidateQueries({ queryKey: queryKeys.allPredictions() });
    qc.invalidateQueries({ queryKey: queryKeys.allHomePredictions() });
    qc.invalidateQueries({ queryKey: queryKeys.allMatchPredictions() });
  };

  // RPC's komen nog niet in de gegenereerde Supabase-types voor; cast met
  // bind zodat de `this`-binding op het supabase-client object behouden blijft —
  // anders crasht supabase-js intern op `this.rest`.
  type RpcClient<TArgs, TResult> = (
    fn: string,
    args?: TArgs,
  ) => Promise<{ data: TResult | null; error: Error | null }>;
  const rpc = supabase.rpc.bind(supabase) as unknown as RpcClient<
    Record<string, unknown>,
    unknown
  >;

  const enableSync = useMutation({
    mutationFn: async (): Promise<EnableResult> => {
      const { data, error } = await (rpc as RpcClient<undefined, unknown>)(
        "enable_prediction_sync",
      );
      if (error) throw error;
      // PostgREST kan TABLE-returnerende functies als array OF als single
      // object teruggeven. Pak het eerste element als array, anders het object zelf.
      const row =
        Array.isArray(data)
          ? (data[0] as Partial<EnableResult> | undefined)
          : (data as Partial<EnableResult> | null);
      return {
        matches_filled: Number(row?.matches_filled ?? 0) || 0,
        pools_affected: Number(row?.pools_affected ?? 0) || 0,
      };
    },
    onSuccess: invalidate,
    onError: (err) => {
      // eslint-disable-next-line no-console
      console.error("[useSyncPreferences] enableSync failed:", err);
    },
  });

  const disableSync = useMutation({
    mutationFn: async (): Promise<void> => {
      const { error } = await (rpc as RpcClient<undefined, null>)("disable_prediction_sync");
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (err) => {
      // eslint-disable-next-line no-console
      console.error("[useSyncPreferences] disableSync failed:", err);
    },
  });

  const markOnboardingSeen = useMutation({
    mutationFn: async (): Promise<void> => {
      const { error } = await (rpc as RpcClient<undefined, null>)("mark_sync_onboarding_seen");
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (err) => {
      // eslint-disable-next-line no-console
      console.error("[useSyncPreferences] markOnboardingSeen failed:", err);
    },
  });

  return {
    syncEnabled: query.data?.bulk_predict_enabled ?? false,
    onboarded: query.data?.sync_onboarded ?? false,
    isLoading: query.isLoading,
    enableSync,
    disableSync,
    markOnboardingSeen,
  };
}
