import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FD_BASE = "https://api.football-data.org/v4";
const WC_COMPETITION = "WC"; // FIFA World Cup competition code

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

    if (!action && req.method === "POST") {
      try {
        const body = await req.json();
        action = body?.action;
      } catch { /* ignore */ }
    }
    action = action || "sync-fixtures";

    const apiKey = Deno.env.get("FOOTBALL_DATA_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "FOOTBALL_DATA_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Helper: call football-data.org
    async function callApi(path: string, params?: Record<string, string>) {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      const res = await fetch(`${FD_BASE}${path}${qs}`, {
        headers: { "X-Auth-Token": apiKey! },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error ${res.status}: ${text}`);
      }
      return res.json();
    }

    // Map football-data.org status to our internal status
    function mapStatus(apiStatus: string): string {
      switch (apiStatus) {
        case "IN_PLAY":
        case "PAUSED":
        case "EXTRA_TIME":
        case "PENALTY_SHOOTOUT":
          return "live";
        case "FINISHED":
        case "AWARDED":
          return "finished";
        case "POSTPONED":
          return "postponed";
        case "CANCELLED":
        case "SUSPENDED":
          return "cancelled";
        default:
          return "scheduled";
      }
    }

    // Find local match by external_id, or fallback to kickoff_utc + team names
    async function findLocalMatch(
      externalId: string,
      utcDate: string,
      homeTeamName: string,
      awayTeamName: string
    ) {
      // 1. Try direct external_id match
      const { data: byId } = await supabaseAdmin
        .from("matches")
        .select("id")
        .eq("external_id", `fd_${externalId}`)
        .maybeSingle();

      if (byId) return byId.id;

      // 2. Fallback: same day + team names (for first-time sync)
      const kickoffDay = utcDate.substring(0, 10); // YYYY-MM-DD
      const { data: byDate } = await supabaseAdmin
        .from("matches")
        .select("id, home_team:teams!matches_home_team_id_fkey(name), away_team:teams!matches_away_team_id_fkey(name)")
        .gte("kickoff_utc", `${kickoffDay}T00:00:00Z`)
        .lte("kickoff_utc", `${kickoffDay}T23:59:59Z`);

      if (!byDate) return null;

      const matched = byDate.find((m: any) => {
        const home = m.home_team?.name?.toLowerCase() || "";
        const away = m.away_team?.name?.toLowerCase() || "";
        const apiHome = homeTeamName.toLowerCase();
        const apiAway = awayTeamName.toLowerCase();
        return (
          (home.includes(apiHome) || apiHome.includes(home)) &&
          (away.includes(apiAway) || apiAway.includes(away))
        );
      });

      return matched?.id || null;
    }

    // ===== ACTION: sync-live =====
    // Call every 2 minutes during match days — only updates live matches
    if (action === "sync-live") {
      const result = await callApi(`/competitions/${WC_COMPETITION}/matches`, {
        status: "IN_PLAY,PAUSED,EXTRA_TIME,PENALTY_SHOOTOUT",
      });

      const liveMatches = result.matches || [];
      let updated = 0;

      for (const m of liveMatches) {
        const matchId = await findLocalMatch(
          String(m.id),
          m.utcDate,
          m.homeTeam?.name || "",
          m.awayTeam?.name || ""
        );

        if (!matchId) continue;

        const homeScore = m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? 0;
        const awayScore = m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? 0;

        await supabaseAdmin
          .from("matches")
          .update({
            home_score: homeScore,
            away_score: awayScore,
            status: "live",
            external_id: `fd_${m.id}`,
            last_updated: new Date().toISOString(),
          })
          .eq("id", matchId);

        updated++;
      }

      return new Response(
        JSON.stringify({ success: true, live_matches: liveMatches.length, updated }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== ACTION: sync-fixtures =====
    // Call once or twice per day — syncs all finished + upcoming matches
    if (action === "sync-fixtures") {
      const result = await callApi(`/competitions/${WC_COMPETITION}/matches`);
      const fixtures = result.matches || [];
      let updated = 0;
      let notFound = 0;

      for (const m of fixtures) {
        const status = mapStatus(m.status);
        const homeScore = m.score?.fullTime?.home;
        const awayScore = m.score?.fullTime?.away;

        const matchId = await findLocalMatch(
          String(m.id),
          m.utcDate,
          m.homeTeam?.name || "",
          m.awayTeam?.name || ""
        );

        if (!matchId) {
          notFound++;
          continue;
        }

        const updateData: Record<string, unknown> = {
          status,
          external_id: `fd_${m.id}`,
          last_updated: new Date().toISOString(),
        };

        if (homeScore != null) updateData.home_score = homeScore;
        if (awayScore != null) updateData.away_score = awayScore;

        await supabaseAdmin
          .from("matches")
          .update(updateData)
          .eq("id", matchId);

        updated++;
      }

      return new Response(
        JSON.stringify({
          success: true,
          total: fixtures.length,
          updated,
          not_found: notFound,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== ACTION: status-check =====
    if (action === "status-check") {
      const result = await callApi(`/competitions/${WC_COMPETITION}`);
      return new Response(
        JSON.stringify({
          success: true,
          competition: result.name,
          season: result.currentSeason?.startDate,
          note: "football-data.org — 10 req/min free tier",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use: sync-live, sync-fixtures, status-check" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
