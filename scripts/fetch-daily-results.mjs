/**
 * fetch-daily-results.mjs
 *
 * Dagelijks script dat WK-uitslagen opzoekt via Claude AI (web_search)
 * en de gevonden scores als concept naar de Goaltje ingest-results endpoint stuurt.
 *
 * Gebruik:
 *   node scripts/fetch-daily-results.mjs
 *   DRY_RUN=true node scripts/fetch-daily-results.mjs   # geen POST, alleen tonen
 *
 * Vereiste omgevingsvariabelen (.env of shell):
 *   SUPABASE_URL        https://piahvmeitbcibtsjagur.supabase.co
 *   SUPABASE_ANON_KEY   <public anon key>
 *   INGEST_SECRET       <zelfde secret als in Supabase Edge Function env vars>
 *   ANTHROPIC_API_KEY   <Claude API key>
 *
 * Cron (dagelijks 23:00 NL-tijd):
 *   0 23 * * * cd /pad/naar/goaltje && node scripts/fetch-daily-results.mjs >> logs/results.log 2>&1
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Config laden (.env bestand naast project root of omgevingsvariabelen)
// ---------------------------------------------------------------------------
const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const paths = [
    resolve(__dirname, "../.env.script"),
    resolve(__dirname, "../.env"),
  ];
  for (const p of paths) {
    try {
      const raw = readFileSync(p, "utf8");
      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = val;
      }
      break;
    } catch {
      // bestand niet gevonden, doorgaan
    }
  }
}

loadEnv();

const SUPABASE_URL   = process.env.SUPABASE_URL;
const SUPABASE_KEY   = process.env.SUPABASE_ANON_KEY;
const INGEST_SECRET  = process.env.INGEST_SECRET;
const ANTHROPIC_KEY  = process.env.ANTHROPIC_API_KEY;
const DRY_RUN        = process.env.DRY_RUN === "true";

if (!SUPABASE_URL || !SUPABASE_KEY || !INGEST_SECRET || !ANTHROPIC_KEY) {
  console.error("Ontbrekende omgevingsvariabelen: SUPABASE_URL, SUPABASE_ANON_KEY, INGEST_SECRET, ANTHROPIC_API_KEY");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 1. Haal wedstrijden op die gespeeld hadden moeten zijn maar nog niet finished zijn
// ---------------------------------------------------------------------------
async function fetchPendingMatches() {
  const now = new Date().toISOString();
  const url = new URL(`${SUPABASE_URL}/rest/v1/matches`);
  url.searchParams.set("select", "id,home_team_id,away_team_id,kickoff_time,status,home_score,away_score,teams_home:teams!matches_home_team_id_fkey(name),teams_away:teams!matches_away_team_id_fkey(name)");
  url.searchParams.set("status", "neq.finished");
  url.searchParams.set("kickoff_time", `lt.${now}`);
  url.searchParams.set("order", "kickoff_time.asc");
  url.searchParams.set("limit", "20");

  const res = await fetch(url.toString(), {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase fout bij ophalen wedstrijden: ${res.status} ${text}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// 2. Vraag Claude naar de uitslag via web_search
// ---------------------------------------------------------------------------
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

async function fetchResultFromClaude(match) {
  const homeTeam = match.teams_home?.name ?? match.home_team_id;
  const awayTeam = match.teams_away?.name ?? match.away_team_id;
  const kickoff  = new Date(match.kickoff_time).toLocaleDateString("nl-NL", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const prompt = `Zoek de definitieve einduitslag van de FIFA WK 2026 wedstrijd: ${homeTeam} vs ${awayTeam} (gespeeld op ${kickoff}).
Geef ALLEEN een JSON-object terug in dit exacte formaat:
{"home_score": <number>, "away_score": <number>, "source": "<bronnaam>", "confidence": "<hoog|middel|laag>"}
Als de wedstrijd nog niet gespeeld is of de uitslag onbekend is, antwoord dan: {"error": "onbekend"}
Geen extra tekst, alleen het JSON-object.`;

  let response;
  try {
    response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: prompt }],
    });
  } catch (err) {
    console.warn(`  Claude API fout voor ${homeTeam}-${awayTeam}: ${err.message}`);
    return null;
  }

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) {
    console.warn(`  Geen JSON in antwoord voor ${homeTeam}-${awayTeam}: ${text.substring(0, 100)}`);
    return null;
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    console.warn(`  Kon JSON niet parsen voor ${homeTeam}-${awayTeam}`);
    return null;
  }

  if (parsed.error || typeof parsed.home_score !== "number" || typeof parsed.away_score !== "number") {
    console.log(`  Uitslag onbekend voor ${homeTeam}-${awayTeam}: ${JSON.stringify(parsed)}`);
    return null;
  }

  return {
    match_id:   match.id,
    home_score: parsed.home_score,
    away_score: parsed.away_score,
    note: `bron: ${parsed.source ?? "onbekend"}, betrouwbaarheid: ${parsed.confidence ?? "onbekend"}`,
  };
}

// ---------------------------------------------------------------------------
// 3. Stuur gevonden uitslagen naar ingest-results endpoint
// ---------------------------------------------------------------------------
async function sendDrafts(results) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ingest-results`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Ingest-Secret": INGEST_SECRET,
    },
    body: JSON.stringify({ results }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`ingest-results fout: ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`[${new Date().toISOString()}] fetch-daily-results gestart${DRY_RUN ? " (DRY_RUN)" : ""}`);

  let matches;
  try {
    matches = await fetchPendingMatches();
  } catch (err) {
    console.error("Kon wedstrijden niet ophalen:", err.message);
    process.exit(1);
  }

  if (matches.length === 0) {
    console.log("Geen openstaande wedstrijden gevonden.");
    return;
  }

  console.log(`${matches.length} wedstrijd(en) om te controleren.`);

  const results = [];
  for (const match of matches) {
    const home = match.teams_home?.name ?? match.home_team_id;
    const away = match.teams_away?.name ?? match.away_team_id;
    console.log(`  Zoeken: ${home} vs ${away} (${match.kickoff_time.slice(0, 10)})`);
    const result = await fetchResultFromClaude(match);
    if (result) {
      console.log(`    → ${result.home_score}-${result.away_score}  (${result.note})`);
      results.push(result);
    } else {
      console.log(`    → niet gevonden, overgeslagen`);
    }
    // Kort wachten om rate limits te respecteren
    await new Promise((r) => setTimeout(r, 1500));
  }

  if (results.length === 0) {
    console.log("Geen uitslagen gevonden om in te sturen.");
    return;
  }

  console.log(`\n${results.length} uitslag(en) gevonden.`);

  if (DRY_RUN) {
    console.log("DRY_RUN=true — niet ingediend. Gevonden uitslagen:");
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  try {
    const data = await sendDrafts(results);
    console.log(`Ingediend: ${JSON.stringify(data)}`);
  } catch (err) {
    console.error("Fout bij indienen:", err.message);
    process.exit(1);
  }

  console.log(`[${new Date().toISOString()}] Klaar.`);
}

main();
