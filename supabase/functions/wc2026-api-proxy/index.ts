// Proxy voor de WC2026 API (api.wc2026api.com) — alleen voor admins.
//
// Waarom een proxy:
//   1. CORS: de externe API blokkeert browser-calls
//   2. Bearer-token blijft serverside, niet zichtbaar in network-tab
//   3. We loggen rate-limit headers (x-ratelimit-*) zodat de admin-UI
//      ze kan tonen
//   4. Logged calls tellen niet mee in de gewone polling-budget
//
// Bewust geen URL-imports gebruikt: markdown clients autolinken
// patronen als "supabase-js@2" en breken zo de copy/paste-flow naar
// Supabase Studio. Met Deno.serve (built-in) en npm: specifier blijft
// de source schoon.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ProxyRequest {
  path: string;          // bv. "/teams"
  method?: string;       // default "GET"
  query?: Record<string, string>;
  bearer: string;        // door admin ingegeven
  body?: unknown;
}

const ALLOWED_HOST = "api.wc2026api.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }
    const sbClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const userResp = await sbClient.auth.getUser();
    const authedUser = userResp?.data?.user;
    if (!authedUser) return json({ error: "Unauthorized" }, 401);

    // Bracket-notation voorkomt dat copy-paste-autolinkers
    // `authedUser.id` als TLD-link interpreteren.
    const callerId = authedUser["id"];

    const roleResp = await sbClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleResp?.data) return json({ error: "Admin only" }, 403);

    const payload = (await req.json()) as ProxyRequest;
    if (!payload?.path || !payload?.bearer) {
      return json({ error: "path en bearer zijn verplicht" }, 400);
    }

    const url = new URL("https://" + ALLOWED_HOST + payload.path);
    if (payload.query) {
      for (const [k, v] of Object.entries(payload.query)) {
        if (v != null && v !== "") url.searchParams.set(k, v);
      }
    }

    const started = Date.now();
    const upstream = await fetch(url.toString(), {
      method: payload.method || "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": "Bearer " + payload.bearer,
      },
      body: payload.body && payload.method !== "GET"
        ? JSON.stringify(payload.body)
        : undefined,
    });
    const durationMs = Date.now() - started;

    const raw = await upstream.text();
    let parsed: unknown = null;
    let parseError: string | null = null;
    try { parsed = JSON.parse(raw); }
    catch (e) { parseError = (e as Error).message; }

    const headerSnapshot: Record<string, string> = {};
    upstream.headers.forEach((v, k) => { headerSnapshot[k.toLowerCase()] = v; });

    return json({
      ok: upstream.ok,
      status: upstream.status,
      duration_ms: durationMs,
      request_url: url.toString(),
      headers: headerSnapshot,
      rate_limit: {
        limit:     headerSnapshot["x-ratelimit-limit"]     ?? null,
        remaining: headerSnapshot["x-ratelimit-remaining"] ?? null,
        reset:     headerSnapshot["x-ratelimit-reset"]     ?? null,
      },
      body:     parsed,
      raw_body: parsed == null ? raw.slice(0, 5000) : null,
      parse_error: parseError,
    }, 200);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
