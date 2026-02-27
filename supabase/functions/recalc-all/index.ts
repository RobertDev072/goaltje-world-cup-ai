import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all finished matches
    const { data: matches, error: mErr } = await supabase
      .from("matches")
      .select("id, home_score, away_score, status")
      .eq("status", "finished")
      .not("home_score", "is", null)
      .not("away_score", "is", null);

    if (mErr) throw mErr;
    if (!matches || matches.length === 0) {
      return new Response(JSON.stringify({ message: "No finished matches" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: string[] = [];

    for (const m of matches) {
      // "Touch" the match to retrigger the BEFORE UPDATE trigger
      const { error } = await supabase
        .from("matches")
        .update({ 
          last_updated: new Date().toISOString(),
          needs_recalc: true,
          // Re-set the same score to trigger the column-specific trigger
          home_score: m.home_score,
          away_score: m.away_score,
          status: m.status,
        })
        .eq("id", m.id);

      if (error) {
        results.push(`❌ ${m.id}: ${error.message}`);
      } else {
        results.push(`✅ ${m.id}: recalculated`);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      matches_processed: matches.length,
      results 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
