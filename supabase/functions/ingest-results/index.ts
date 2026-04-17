import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ingest-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const secret = Deno.env.get("INGEST_SECRET");
  if (!secret || req.headers.get("X-Ingest-Secret") !== secret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const body = await req.json().catch(() => ({}));
  const results: { match_id: string; home_score: number; away_score: number; note?: string }[] =
    body.results ?? [];

  if (!Array.isArray(results) || results.length === 0) {
    return new Response(JSON.stringify({ error: "results array required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rows = results.map((r) => ({
    match_id: r.match_id,
    home_score: r.home_score,
    away_score: r.away_score,
    source: "script",
    note: r.note ?? null,
    status: "pending",
  }));

  // Upsert: replace existing pending draft for same match
  const { error } = await supabase
    .from("match_result_drafts")
    .upsert(rows, { onConflict: "match_id", ignoreDuplicates: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, count: rows.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
