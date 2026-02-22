import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";
const WC_2026_LEAGUE = 1; // FIFA World Cup
const WC_2026_SEASON = 2026;
const MAX_DAILY_REQUESTS = 90; // safety buffer (limit is 100)

// Cache TTLs in minutes
const CACHE_TTL = {
  fixtures: 720,      // 12 hours
  standings: 360,     // 6 hours (shortened to 30min on match days via caller)
  live: 0,            // no cache for live, but event-based polling
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    let action = url.searchParams.get("action");
    
    // Also check body for action
    if (!action && req.method === "POST") {
      try {
        const body = await req.json();
        action = body?.action;
      } catch { /* ignore */ }
    }
    action = action || "sync-fixtures";

    // Check daily usage
    const today = new Date().toISOString().split("T")[0];
    const { data: usageRow } = await supabaseAdmin
      .from("api_usage")
      .select("*")
      .eq("usage_date", today)
      .maybeSingle();

    const currentCount = usageRow?.request_count || 0;

    if (currentCount >= MAX_DAILY_REQUESTS) {
      return new Response(
        JSON.stringify({
          error: "Daily API limit reached",
          count: currentCount,
          max: MAX_DAILY_REQUESTS,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("API_FOOTBALL_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API_FOOTBALL_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Helper: check cache
    async function getCached(key: string): Promise<any | null> {
      const { data } = await supabaseAdmin
        .from("api_cache")
        .select("data, expires_at")
        .eq("cache_key", key)
        .maybeSingle();

      if (data && new Date(data.expires_at) > new Date()) {
        return data.data;
      }
      return null;
    }

    // Helper: set cache
    async function setCache(key: string, value: any, ttlMinutes: number) {
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
      await supabaseAdmin.from("api_cache").upsert(
        {
          cache_key: key,
          data: value,
          fetched_at: new Date().toISOString(),
          expires_at: expiresAt,
        },
        { onConflict: "cache_key" }
      );
    }

    // Helper: call API-Football and increment counter
    async function callApi(endpoint: string, params: Record<string, string>) {
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`${API_FOOTBALL_BASE}/${endpoint}?${qs}`, {
        headers: { "x-apisports-key": apiKey! },
      });
      const json = await res.json();

      // Increment daily counter
      if (usageRow) {
        await supabaseAdmin
          .from("api_usage")
          .update({ request_count: currentCount + 1 })
          .eq("usage_date", today);
      } else {
        await supabaseAdmin.from("api_usage").insert({
          usage_date: today,
          request_count: 1,
        });
      }

      return json;
    }

    // ===== ACTION: sync-fixtures =====
    if (action === "sync-fixtures") {
      const cacheKey = `fixtures_wc2026`;
      const cached = await getCached(cacheKey);

      let fixtures;
      if (cached) {
        fixtures = cached;
      } else {
        const result = await callApi("fixtures", {
          league: String(WC_2026_LEAGUE),
          season: String(WC_2026_SEASON),
        });
        fixtures = result.response || [];
        await setCache(cacheKey, fixtures, CACHE_TTL.fixtures);
      }

      // Map to our matches table
      let updated = 0;
      for (const f of fixtures) {
        const fix = f.fixture;
        const goals = f.goals;
        const status = mapStatus(fix.status?.short);

        // Try to match by external_id
        const externalId = String(fix.id);
        const { data: existing } = await supabaseAdmin
          .from("matches")
          .select("id")
          .eq("external_id", externalId)
          .maybeSingle();

        if (existing) {
          // Update score and status
          const updateData: any = { status, last_updated: new Date().toISOString() };
          if (goals?.home != null) updateData.home_score = goals.home;
          if (goals?.away != null) updateData.away_score = goals.away;

          await supabaseAdmin
            .from("matches")
            .update(updateData)
            .eq("id", existing.id);
          updated++;
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          total_fixtures: fixtures.length,
          updated,
          daily_requests: currentCount + (cached ? 0 : 1),
          from_cache: !!cached,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== ACTION: sync-live =====
    if (action === "sync-live") {
      // Only call API for currently live matches (event-based)
      const result = await callApi("fixtures", {
        league: String(WC_2026_LEAGUE),
        season: String(WC_2026_SEASON),
        live: "all",
      });

      const liveFixtures = result.response || [];
      let updated = 0;

      for (const f of liveFixtures) {
        const fix = f.fixture;
        const goals = f.goals;
        const externalId = String(fix.id);

        const { data: existing } = await supabaseAdmin
          .from("matches")
          .select("id")
          .eq("external_id", externalId)
          .maybeSingle();

        if (existing) {
          await supabaseAdmin
            .from("matches")
            .update({
              home_score: goals?.home ?? 0,
              away_score: goals?.away ?? 0,
              status: "live",
              last_updated: new Date().toISOString(),
            })
            .eq("id", existing.id);
          updated++;
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          live_matches: liveFixtures.length,
          updated,
          daily_requests: currentCount + 1,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== ACTION: usage =====
    if (action === "usage") {
      return new Response(
        JSON.stringify({ date: today, requests: currentCount, max: MAX_DAILY_REQUESTS }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== ACTION: status-check =====
    if (action === "status-check") {
      try {
        const res = await fetch(`${API_FOOTBALL_BASE}/status`, {
          headers: { "x-apisports-key": apiKey },
        });
        const json = await res.json();
        const account = json?.response?.account;
        const subscription = json?.response?.subscription;
        const requests = json?.response?.requests;

        return new Response(
          JSON.stringify({
            success: true,
            connected: true,
            account: account || null,
            plan: subscription?.plan || "unknown",
            requests_today: requests?.current || 0,
            requests_limit: requests?.limit_day || 100,
            daily_db_count: currentCount,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        return new Response(
          JSON.stringify({ success: false, connected: false, error: String(e) }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use: sync-fixtures, sync-live, usage" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function mapStatus(apiStatus: string | undefined): string {
  if (!apiStatus) return "scheduled";
  const s = apiStatus.toUpperCase();
  if (["1H", "2H", "HT", "ET", "BT", "P", "LIVE"].includes(s)) return "live";
  if (["FT", "AET", "PEN"].includes(s)) return "finished";
  if (["SUSP", "INT", "ABD"].includes(s)) return "suspended";
  if (["PST", "CANC", "AWD", "WO"].includes(s)) return "cancelled";
  return "scheduled";
}
