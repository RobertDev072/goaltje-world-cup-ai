import { supabase } from "@/integrations/supabase/client";

export async function logEvent(params: {
  event_type: string;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, any>;
}) {
  try {
    await supabase.functions.invoke("log-event", { body: params });
  } catch {
    // silent fail - logging should never break the app
  }
}

// Convenience helpers
export const auditLog = {
  poolCreated: (poolId: string, poolName: string) =>
    logEvent({ event_type: "pool_created", entity_type: "pool", entity_id: poolId, metadata: { name: poolName } }),
  poolDeleted: (poolId: string, poolName: string) =>
    logEvent({ event_type: "pool_deleted", entity_type: "pool", entity_id: poolId, metadata: { name: poolName } }),
  poolJoined: (poolId: string, poolName: string) =>
    logEvent({ event_type: "pool_joined", entity_type: "pool", entity_id: poolId, metadata: { name: poolName } }),
  poolLeft: (poolId: string) =>
    logEvent({ event_type: "pool_left", entity_type: "pool", entity_id: poolId }),
  profileUpdated: () =>
    logEvent({ event_type: "profile_updated", entity_type: "profile" }),
  predictionMade: (matchId: string) =>
    logEvent({ event_type: "prediction_made", entity_type: "match", entity_id: matchId }),
};
