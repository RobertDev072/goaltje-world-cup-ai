import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  const { data: { user } } = await supabase.auth.getUser(token).catch(() => ({ data: { user: null } }));

  const ip =
    req.headers.get("CF-Connecting-IP") ||
    req.headers.get("X-Real-IP") ||
    req.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    null;

  const body = await req.json().catch(() => ({}));
  const {
    event_type,
    entity_type = null,
    entity_id = null,
    metadata = {},
    session_id = null,
  } = body;

  if (!event_type) {
    return new Response(JSON.stringify({ error: "event_type required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const device_info = req.headers.get("User-Agent")?.substring(0, 300) || null;

  await supabase.from("audit_logs").insert({
    user_id: user?.id || null,
    email: user?.email || null,
    event_type,
    entity_type,
    entity_id: entity_id || null,
    ip_address: ip,
    user_agent: device_info,
    session_id,
    metadata,
  });

  // Also update/create user_session entry for login events
  if (event_type === "login" && user) {
    await supabase.from("user_sessions").insert({
      user_id: user.id,
      login_at_utc: new Date().toISOString(),
      device_info: device_info?.substring(0, 200) || null,
      ip_address: ip,
    }).then(() => {});
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
