// sync-wc2026 — productie sync van api.wc2026api.com naar onze DB.
//
// Twee modi via body:
//   { "mode": "full" } → teams + stadiums + matches schedule (1×/dag)
//   { "mode": "live" } → alleen scores van live wedstrijden (elke minuut)
//
// Budget hard cap 500/dag via claim_api_budget() RPC. Pas bij granted=true
// wordt er een upstream call gedaan.
//
// Bewust geen URL-imports — Deno.serve built-in + npm: specifier,
// zodat copy/paste-plumbing in Studio niet door autolinks gesloopt wordt.
//
// NB: deze function is via Supabase Studio gedeployed onder de auto-slug
// "bright-processor"; de cron-jobs verwijzen daarnaar.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const API_HOST = "api.wc2026api.com";

// Q&B round-codes → onze stage-namen
function mapStage(r) {
  if (!r) return "group";
  if (r === "group") return "group";
  if (r === "R32") return "round_of_32";
  if (r === "R16") return "round_of_16";
  if (r === "QF") return "quarter_final";
  if (r === "SF") return "semi_final";
  if (r === "3rd") return "third_place";
  if (r === "final") return "final";
  return r;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const bearer = Deno.env.get("WC2026_API_BEARER")?.trim();
    if (!bearer) return json({ error: "WC2026_API_BEARER ontbreekt in secrets" }, 500);

    const body = await req.json().catch(() => ({}));
    const mode = body?.mode === "full" ? "full" : "live";

    const stats = {
      mode, api_calls_made: 0, teams_upserted: 0, stadiums_upserted: 0,
      matches_upserted: 0, matches_score_updated: 0,
      skipped_reason: null, budget_remaining: null, rate_limit_remaining: null,
    };

    async function callApi(path) {
      const claim = await adminClient.rpc("claim_api_budget", { _calls_needed: 1 });
      if (claim.error) throw new Error("claim_api_budget: " + claim.error.message);
      stats.budget_remaining = claim.data?.budget_remaining ?? null;
      if (!claim.data?.granted) {
        stats.skipped_reason = "daily_cap_500_reached";
        throw new Error("BUDGET_CAP");
      }
      const upstream = await fetch("https://" + API_HOST + path, {
        method: "GET",
        headers: { "Accept": "application/json", "Authorization": "Bearer " + bearer },
      });
      stats.api_calls_made += 1;
      stats.rate_limit_remaining = upstream.headers.get("x-ratelimit-remaining");
      if (upstream.status === 429) throw new Error("Q&B rate limit hit (429)");
      if (!upstream.ok) throw new Error("Upstream " + upstream.status);
      return await upstream.json();
    }

    if (mode === "full") {
      const teams = await callApi("/teams");
      if (Array.isArray(teams)) {
        // flag_url bewust niet meegestuurd — wij beheren emoji-vlaggen zelf
        const rows = teams.map((t) => ({
          external_id: String(t["id"]),
          name: t.name,
          short_name: t.code ?? null,
          group: t.group_name ?? null,
        }));
        const up = await adminClient.from("teams").upsert(rows, { onConflict: "external_id" });
        if (up.error) throw new Error("teams: " + up.error.message);
        stats.teams_upserted = rows.length;
      }
      const stadiums = await callApi("/stadiums");
      if (Array.isArray(stadiums)) {
        const rows = stadiums.map((s) => ({
          external_id: String(s["id"]),
          name: s.name,
          city: s.city ?? null,
          country: s.country ?? null,
          capacity: s.capacity ?? null,
          updated_at: new Date().toISOString(),
        }));
        const up = await adminClient.from("stadiums").upsert(rows, { onConflict: "external_id" });
        if (up.error) throw new Error("stadiums: " + up.error.message);
        stats.stadiums_upserted = rows.length;
      }
      const matches = await callApi("/matches");
      if (Array.isArray(matches)) {
        const teamRows = await adminClient.from("teams").select("id, external_id");
        const stadRows = await adminClient.from("stadiums").select("id, external_id");
        const teamMap = new Map();
        (teamRows.data ?? []).forEach((r) => { if (r.external_id != null) teamMap.set(String(r.external_id), r["id"]); });
        const stadMap = new Map();
        (stadRows.data ?? []).forEach((r) => { if (r.external_id != null) stadMap.set(String(r.external_id), r["id"]); });
        const rows = matches.map((m) => {
          const homeId = m["home_team_id"];
          const awayId = m["away_team_id"];
          const h = homeId != null ? teamMap.get(String(homeId)) ?? null : null;
          const a = awayId != null ? teamMap.get(String(awayId)) ?? null : null;
          const round = m.round ?? "group";
          if (round === "group" && (!h || !a)) return null;
          const st = m["stadium_id"] != null ? stadMap.get(String(m["stadium_id"])) ?? null : null;
          const ko = m.kickoff_utc ?? null;
          return {
            external_id: String(m["id"]),
            stage: mapStage(round),
            group: m.group_name ?? null,
            kickoff_utc: ko,
            prediction_deadline_utc: ko, // voorspellen kan tot aftrap
            home_team_id: h,
            away_team_id: a,
            stadium_id: st,
            status: m.status ?? "scheduled",
            home_score: m.home_score ?? null,
            away_score: m.away_score ?? null,
          };
        }).filter((r) => r != null && !!r.kickoff_utc);
        if (rows.length > 0) {
          const up = await adminClient.from("matches").upsert(rows, { onConflict: "external_id" });
          if (up.error) throw new Error("matches: " + up.error.message);
          stats.matches_upserted = rows.length;
        }
      }
      return json({ ok: true, ...stats }, 200);
    }

    // mode === "live"
    const horizon = new Date(Date.now() + 15 * 60_000).toISOString();
    const lookback = new Date(Date.now() - 3 * 60 * 60_000).toISOString();
    const liveQ = await adminClient.from("matches")
      .select("id, external_id, home_score, away_score, status")
      .or("status.eq.live,and(status.eq.scheduled,kickoff_utc.lte." + horizon + ")")
      .gte("kickoff_utc", lookback);
    if (liveQ.error) return json({ ok: false, error: liveQ.error.message, ...stats }, 500);

    const candidates = liveQ.data ?? [];
    if (candidates.length === 0) {
      stats.skipped_reason = "no_live_window";
      return json({ ok: true, ...stats }, 200);
    }

    let liveMatches = null;
    try {
      const r = await callApi("/matches?status=live");
      if (Array.isArray(r)) liveMatches = r;
    } catch (_e) { /* fallback hieronder */ }
    if (!liveMatches) {
      const all = await callApi("/matches");
      if (Array.isArray(all)) {
        liveMatches = all.filter((m) =>
          m.status === "live" ||
          (m.status === "scheduled" && m.kickoff_utc &&
           new Date(m.kickoff_utc).getTime() <= Date.now() + 15 * 60_000));
      }
    }
    if (!liveMatches || liveMatches.length === 0) return json({ ok: true, ...stats }, 200);

    const byExt = new Map();
    candidates.forEach((c) => { if (c.external_id) byExt.set(c.external_id, c); });
    for (const qm of liveMatches) {
      const ext = String(qm["id"]);
      const cur = byExt.get(ext);
      if (!cur) continue;
      const nStatus = qm.status ?? cur.status;
      const nHome = qm.home_score ?? null;
      const nAway = qm.away_score ?? null;
      if (nStatus === cur.status && nHome === cur.home_score && nAway === cur.away_score) continue;
      const upd = await adminClient.from("matches")
        .update({ status: nStatus, home_score: nHome, away_score: nAway, last_updated: new Date().toISOString() })
        .eq("external_id", ext);
      if (!upd.error) stats.matches_score_updated += 1;
    }
    return json({ ok: true, ...stats }, 200);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
});

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
