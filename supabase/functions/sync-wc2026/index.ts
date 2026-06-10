// sync-wc2026 — productie sync van api.wc2026api.com naar onze DB.
//
// Twee modi via body:
//   { "mode": "full" } → teams + stadiums + matches schedule (1×/dag)
//   { "mode": "live" } → alleen scores van live wedstrijden (elke minuut)
//
// Budget hard cap 500/dag via claim_api_budget() RPC. Pas bij granted=true
// wordt er een upstream call gedaan. Bij budget op: skip + meld het.
//
// Bewust geen URL-imports — Deno.serve built-in + npm: specifier,
// zodat copy/paste-plumbing in Studio niet door autolinks gesloopt wordt.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const API_HOST = "api.wc2026api.com";

interface SyncRequest {
  mode: "full" | "live";
}

interface QbTeam {
  id: number | string;
  name: string;
  code?: string;
  flag_url?: string | null;
  group_name?: string | null;
}

interface QbStadium {
  id: number | string;
  name: string;
  city?: string | null;
  country?: string | null;
  capacity?: number | null;
}

interface QbMatch {
  id: number | string;
  home_team_id: number | string;
  away_team_id: number | string;
  stadium_id?: number | string | null;
  kickoff_at?: string | null;
  kickoff_utc?: string | null;
  stage?: string | null;
  group?: string | null;
  group_name?: string | null;
  status?: string | null;
  home_score?: number | null;
  away_score?: number | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const bearer = Deno.env.get("WC2026_API_BEARER");
    if (!bearer) return json({ error: "WC2026_API_BEARER ontbreekt in secrets" }, 500);

    const body = (await req.json().catch(() => ({}))) as SyncRequest;
    const mode = body?.mode === "full" ? "full" : "live";

    const stats = {
      mode,
      api_calls_made: 0,
      teams_upserted: 0,
      stadiums_upserted: 0,
      matches_upserted: 0,
      matches_score_updated: 0,
      skipped_reason: null as string | null,
      budget_remaining: null as number | null,
      rate_limit_remaining: null as string | null,
    };

    // Helper: claim 1 call, fetch, increment stats
    async function callApi(path: string): Promise<unknown> {
      const claim = await adminClient.rpc("claim_api_budget", { _calls_needed: 1 });
      if (claim.error) throw new Error("claim_api_budget: " + claim.error.message);
      const claimData = claim.data as { granted: boolean; budget_remaining: number };
      stats.budget_remaining = claimData?.budget_remaining ?? null;
      if (!claimData?.granted) {
        stats.skipped_reason = "daily_cap_500_reached";
        throw new Error("BUDGET_CAP");
      }

      const upstream = await fetch("https://" + API_HOST + path, {
        method: "GET",
        headers: { "Accept": "application/json", "Authorization": "Bearer " + bearer },
      });
      stats.api_calls_made += 1;
      stats.rate_limit_remaining = upstream.headers.get("x-ratelimit-remaining");

      if (upstream.status === 429) {
        throw new Error("Q&B rate limit hit (429)");
      }
      if (!upstream.ok) {
        const raw = await upstream.text();
        throw new Error("Upstream " + upstream.status + ": " + raw.slice(0, 200));
      }
      return await upstream.json();
    }

    // ============================================================
    // MODE: full — teams + stadiums + matches schedule
    // ============================================================
    if (mode === "full") {
      try {
        const teams = (await callApi("/teams")) as QbTeam[];
        if (Array.isArray(teams)) {
          const rows = teams.map((t) => ({
            external_id: String(t["id"]),
            name: t.name,
            short_name: t.code ?? null,
            flag_url: t.flag_url ?? null,
            group: t.group_name ?? null,
          }));
          const up = await adminClient.from("teams").upsert(rows, { onConflict: "external_id" });
          if (up.error) throw new Error("teams upsert: " + up.error.message);
          stats.teams_upserted = rows.length;
        }

        const stadiums = (await callApi("/stadiums")) as QbStadium[];
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
          if (up.error) throw new Error("stadiums upsert: " + up.error.message);
          stats.stadiums_upserted = rows.length;
        }

        const matches = (await callApi("/matches")) as QbMatch[];
        if (Array.isArray(matches)) {
          // Map externe ids → onze UUIDs
          const teamRows = await adminClient.from("teams").select("id, external_id");
          const stadiumRows = await adminClient.from("stadiums").select("id, external_id");
          const teamMap = new Map<string, string>();
          (teamRows.data ?? []).forEach((r: { id: string; external_id: string }) => {
            if (r.external_id) teamMap.set(r.external_id, r.id);
          });
          const stadiumMap = new Map<string, string>();
          (stadiumRows.data ?? []).forEach((r: { id: string; external_id: string }) => {
            if (r.external_id) stadiumMap.set(r.external_id, r.id);
          });

          const rows = matches
            .map((m) => {
              const homeUuid = teamMap.get(String(m["home_team_id"]));
              const awayUuid = teamMap.get(String(m["away_team_id"]));
              if (!homeUuid || !awayUuid) return null;
              const stadiumUuid = m["stadium_id"] != null
                ? stadiumMap.get(String(m["stadium_id"])) ?? null
                : null;
              return {
                external_id: String(m["id"]),
                stage: m.stage ?? "group",
                group: m.group ?? m.group_name ?? null,
                kickoff_utc: m.kickoff_utc ?? m.kickoff_at ?? null,
                home_team_id: homeUuid,
                away_team_id: awayUuid,
                stadium_id: stadiumUuid,
                status: m.status ?? "scheduled",
                home_score: m.home_score ?? null,
                away_score: m.away_score ?? null,
              };
            })
            .filter((r): r is NonNullable<typeof r> => r != null && !!r.kickoff_utc);

          if (rows.length > 0) {
            const up = await adminClient.from("matches").upsert(rows, { onConflict: "external_id" });
            if (up.error) throw new Error("matches upsert: " + up.error.message);
            stats.matches_upserted = rows.length;
          }
        }
      } catch (err) {
        if ((err as Error).message === "BUDGET_CAP") {
          return json({ ok: false, ...stats }, 200);
        }
        return json({ ok: false, error: (err as Error).message, ...stats }, 500);
      }

      return json({ ok: true, ...stats }, 200);
    }

    // ============================================================
    // MODE: live — alleen scores updaten van live/imminente wedstrijden
    // ============================================================

    // Pre-check: zijn er überhaupt wedstrijden om te pollen?
    const liveWindowQuery = await adminClient
      .from("matches")
      .select("id, external_id, home_score, away_score, status")
      .or("status.eq.live,and(status.eq.scheduled,kickoff_utc.lte." + new Date(Date.now() + 15 * 60_000).toISOString() + ")")
      .gte("kickoff_utc", new Date(Date.now() - 3 * 60 * 60_000).toISOString());

    if (liveWindowQuery.error) {
      return json({ ok: false, error: liveWindowQuery.error.message, ...stats }, 500);
    }

    const candidates = liveWindowQuery.data ?? [];
    if (candidates.length === 0) {
      stats.skipped_reason = "no_live_window";
      return json({ ok: true, ...stats }, 200);
    }

    try {
      // Probeer batch-endpoint eerst. Q&B-docs onbekend → fallback bij 404 op /matches met client-filter.
      let liveMatches: QbMatch[] | null = null;
      try {
        const r = await callApi("/matches?status=live");
        if (Array.isArray(r)) liveMatches = r as QbMatch[];
      } catch (_e) {
        // Niet fataal — val terug op /matches
      }

      if (!liveMatches) {
        const all = (await callApi("/matches")) as QbMatch[];
        if (Array.isArray(all)) {
          liveMatches = all.filter((m) =>
            m.status === "live"
            || (m.status === "scheduled" && m.kickoff_utc && new Date(m.kickoff_utc).getTime() <= Date.now() + 15 * 60_000)
            || (m.status === "scheduled" && m.kickoff_at && new Date(m.kickoff_at).getTime() <= Date.now() + 15 * 60_000)
          );
        }
      }

      if (!liveMatches || liveMatches.length === 0) {
        return json({ ok: true, ...stats }, 200);
      }

      // Build map van bestaande matches op external_id
      const byExt = new Map<string, { id: string; home_score: number | null; away_score: number | null; status: string }>();
      candidates.forEach((c: { external_id: string | null; id: string; home_score: number | null; away_score: number | null; status: string }) => {
        if (c.external_id) byExt.set(c.external_id, c);
      });

      for (const qm of liveMatches) {
        const ext = String(qm["id"]);
        const current = byExt.get(ext);
        if (!current) continue; // wedstrijd niet in onze candidates-set, schedule-sync vult 'm
        const newStatus = qm.status ?? current.status;
        const newHome   = qm.home_score ?? null;
        const newAway   = qm.away_score ?? null;

        const changed =
          newStatus !== current.status
          || newHome !== current.home_score
          || newAway !== current.away_score;

        if (!changed) continue;

        const upd = await adminClient
          .from("matches")
          .update({ status: newStatus, home_score: newHome, away_score: newAway, last_updated: new Date().toISOString() })
          .eq("external_id", ext);
        if (upd.error) {
          console.error("update fail", ext, upd.error.message);
          continue;
        }
        stats.matches_score_updated += 1;
      }
    } catch (err) {
      if ((err as Error).message === "BUDGET_CAP") {
        return json({ ok: false, ...stats }, 200);
      }
      return json({ ok: false, error: (err as Error).message, ...stats }, 500);
    }

    return json({ ok: true, ...stats }, 200);
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
