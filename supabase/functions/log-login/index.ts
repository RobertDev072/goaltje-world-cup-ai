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
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ip =
    req.headers.get("CF-Connecting-IP") ||
    req.headers.get("X-Real-IP") ||
    req.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    null;

  // Country comes free from Vercel / Cloudflare edge headers
  const country =
    req.headers.get("X-Vercel-IP-Country") ||
    req.headers.get("CF-IPCountry") ||
    null;

  const body = await req.json().catch(() => ({}));
  const device_info = typeof body.device_info === "string"
    ? body.device_info.substring(0, 200)
    : null;

  const nowIso = new Date().toISOString();

  const { error: insertErr } = await supabase.from("user_sessions").insert({
    user_id: user.id,
    login_at_utc: nowIso,
    device_info,
    ip_address: ip,
    country,
    last_seen_at: nowIso,
  });

  if (insertErr) {
    return new Response(JSON.stringify({ error: insertErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
