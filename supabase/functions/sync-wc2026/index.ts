// sync-wc2026 — productie sync van api.wc2026api.com naar onze DB.
//
// BELANGRIJK: onze matches gebruiken external_id "fd_537xxx" en Q&B
// gebruikt numerieke ids — die matchen NOOIT. Daarom koppelen we op
// **kickoff_utc** (+ teamcode bij gelijktijdige kickoffs). Teams worden
// gekoppeld via **short_name (code)**, niet via id. Niets wordt
// overschreven: team/stadion/kickoff worden alleen INGEVULD als leeg.
//
// Twee modi via body:
//   { "mode": "full" } → verwerk alle matches (handmatige volledige resync)
//   { "mode": "live" } → alleen live-window + nog-lege knockout matches
//
// Budget hard cap 500/dag via claim_api_budget(). Live-poll: elke 3 min
// als er een wedstrijd live is, elke 30 min als er alleen nog lege
// knockout-fixtures zijn (teams nog onbekend).
//
// NB: in Studio gedeployed onder auto-slug "bright-processor".

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const API_HOST = "api.wc2026api.com";

// Q&B status-woorden → onze statussen (scheduled/live/finished/cancelled)
function mapStatus(s) {
  if (!s) return "scheduled";
  const v = String(s).toLowerCase();
  if (["live","in_play","inplay","playing","1h","2h","ht","et","et1","et2","pen"].includes(v)) return "live";
  if (["completed","finished","ft","ft_pen","aet","full_time","done","ended"].includes(v)) return "finished";
  if (["cancelled","canceled","void","abandoned","postponed"].includes(v)) return "cancelled";
  return "scheduled";
}

function normCode(c) {
  return c != null && String(c).trim() !== "" ? String(c).trim().toUpperCase() : null;
}

function isoKickoff(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
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
      mode, api_calls_made: 0, matches_matched: 0,
      teams_filled: 0, scores_updated: 0, kickoffs_updated: 0,
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

    // --- Onze data laden (geen API-calls) ---
    const teamRows = await adminClient.from("teams").select("id, short_name");
    if (teamRows.error) return json({ ok: false, error: "teams: " + teamRows.error.message, ...stats }, 500);
    const teamIdByCode = new Map();   // CODE -> our team uuid
    const codeByTeamId = new Map();   // our team uuid -> CODE
    (teamRows.data ?? []).forEach((t) => {
      const c = normCode(t.short_name);
      if (c) {
        if (!teamIdByCode.has(c)) teamIdByCode.set(c, t.id);
        codeByTeamId.set(t.id, c);
      }
    });

    const stadRows = await adminClient.from("stadiums").select("id, name");
    const stadIdByName = new Map();   // lowercased name -> our stadium uuid
    (stadRows.data ?? []).forEach((s) => {
      if (s.name) stadIdByName.set(String(s.name).trim().toLowerCase(), s.id);
    });

    const matchRows = await adminClient.from("matches")
      .select("id, kickoff_utc, stage, home_team_id, away_team_id, stadium_id, status, home_score, away_score");
    if (matchRows.error) return json({ ok: false, error: "matches: " + matchRows.error.message, ...stats }, 500);
    const ourByKickoff = new Map();   // ISO kickoff -> [matches]
    (matchRows.data ?? []).forEach((m) => {
      const k = isoKickoff(m.kickoff_utc);
      if (!k) return;
      if (!ourByKickoff.has(k)) ourByKickoff.set(k, []);
      ourByKickoff.get(k).push(m);
    });

    // Welke teams staan al in een ronde? Voorkomt dat hetzelfde team twee keer
    // in dezelfde stage belandt (bv. Brazil in twee achtste finales). Geseed
    // met de huidige DB-stand, daarna bijgewerkt naarmate we deze run invullen.
    const teamsByStage = new Map();   // stage -> Set(team uuid)
    const stageSet = (stage) => {
      if (!teamsByStage.has(stage)) teamsByStage.set(stage, new Set());
      return teamsByStage.get(stage);
    };
    (matchRows.data ?? []).forEach((m) => {
      if (m.home_team_id) stageSet(m.stage).add(m.home_team_id);
      if (m.away_team_id) stageSet(m.stage).add(m.away_team_id);
    });

    // --- Live-mode: bepaal of pollen nodig is (spaart API-budget) ---
    const nowMs = Date.now();
    if (mode === "live") {
      const horizon = nowMs + 15 * 60_000;        // start binnen 15 min
      const lookback = nowMs - 4 * 60 * 60_000;   // begonnen < 4u geleden
      const tbdHorizon = nowMs + 14 * 24 * 60 * 60_000;
      let liveNow = false, tbdExists = false;
      for (const arr of ourByKickoff.values()) {
        for (const m of arr) {
          const km = new Date(m.kickoff_utc).getTime();
          if (m.status === "live" || (m.status === "scheduled" && km <= horizon && km >= lookback)) liveNow = true;
          if ((!m.home_team_id || !m.away_team_id) && km >= nowMs && km <= tbdHorizon) tbdExists = true;
        }
      }
      const minute = new Date().getUTCMinutes();
      const shouldPoll = (liveNow && minute % 3 === 0) || (tbdExists && minute % 30 === 0);
      if (!shouldPoll) {
        stats.skipped_reason = liveNow || tbdExists ? "throttled" : "no_live_window";
        return json({ ok: true, ...stats }, 200);
      }
    }

    // --- Q&B ophalen (1 call) ---
    const all = await callApi("/matches");
    if (!Array.isArray(all)) return json({ ok: true, ...stats }, 200);

    for (const qm of all) {
      const k = isoKickoff(qm.kickoff_utc);
      if (!k) continue;
      const candidates = ourByKickoff.get(k) || [];
      if (candidates.length === 0) continue;

      const hCode = normCode(qm.home_team_code);
      const aCode = normCode(qm.away_team_code);
      const hId = hCode && teamIdByCode.has(hCode) ? teamIdByCode.get(hCode) : null;
      const aId = aCode && teamIdByCode.has(aCode) ? teamIdByCode.get(aCode) : null;

      // Koppel: exacte teamcode-match eerst; anders (bij 1 kandidaat) die ene;
      // anders de eerste rij die nog volledig leeg is. Een al (deels) gevulde
      // rij wordt nooit als "lege" hergebruikt.
      const target =
        candidates.find((c) =>
          codeByTeamId.get(c.home_team_id) === hCode &&
          codeByTeamId.get(c.away_team_id) === aCode
        ) ||
        (candidates.length === 1 ? candidates[0] : null) ||
        candidates.find((c) => !c.home_team_id && !c.away_team_id) ||
        null;
      if (!target) continue;
      stats.matches_matched += 1;

      const placed = stageSet(target.stage);
      const patch = {};

      // Teams invullen — alleen als nog leeg (nooit overschrijven), nooit een
      // team twee keer in dezelfde ronde, en nooit home === away.
      if (!target.home_team_id && hId && !placed.has(hId)) patch.home_team_id = hId;
      const effHome = patch.home_team_id ?? target.home_team_id;
      if (!target.away_team_id && aId && aId !== effHome && !placed.has(aId)) patch.away_team_id = aId;

      // In-memory bijwerken zodat dezelfde kickoff-collisie deze rij/teams niet
      // opnieuw pakt verderop in deze run.
      if (patch.home_team_id) { target.home_team_id = patch.home_team_id; placed.add(patch.home_team_id); }
      if (patch.away_team_id) { target.away_team_id = patch.away_team_id; placed.add(patch.away_team_id); }

      // Stadion invullen — alleen als nog leeg
      if (!target.stadium_id && qm.stadium) {
        const sid = stadIdByName.get(String(qm.stadium).trim().toLowerCase());
        if (sid) patch.stadium_id = sid;
      }

      // Kickoff bijwerken als Q&B die verschuift — maar NIET voor nog-lege
      // knockout-fixtures: hun placeholder-tijden zouden meerdere rijen op
      // dezelfde kickoff laten botsen → verkeerde teamkoppeling.
      const teamsKnown = (patch.home_team_id ?? target.home_team_id) && (patch.away_team_id ?? target.away_team_id);
      const qbIso = isoKickoff(qm.kickoff_utc);
      const ourIso = isoKickoff(target.kickoff_utc);
      if (teamsKnown && qbIso && qbIso !== ourIso) {
        patch.kickoff_utc = qm.kickoff_utc;
        patch.prediction_deadline_utc = qm.kickoff_utc;
      }

      // Score + status bijwerken als veranderd
      const nStatus = mapStatus(qm.status);
      const nHome = qm.home_score ?? null;
      const nAway = qm.away_score ?? null;
      const scoreChanged = nStatus !== target.status || nHome !== target.home_score || nAway !== target.away_score;
      if (scoreChanged) {
        patch.status = nStatus;
        patch.home_score = nHome;
        patch.away_score = nAway;
      }

      if (Object.keys(patch).length === 0) continue;
      patch.last_updated = new Date().toISOString();

      const upd = await adminClient.from("matches").update(patch).eq("id", target.id);
      if (!upd.error) {
        if (patch.home_team_id || patch.away_team_id) stats.teams_filled += 1;
        if (scoreChanged) stats.scores_updated += 1;
        if (patch.kickoff_utc) stats.kickoffs_updated += 1;
      }
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
