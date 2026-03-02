import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface H2HFixture {
  fixture: { id: number; date: string; venue: { name: string; city: string } };
  teams: { home: { id: number; name: string; winner: boolean | null }; away: { id: number; name: string; winner: boolean | null } };
  goals: { home: number | null; away: number | null };
  league: { name: string; round: string };
}

const CACHE_TTL_HOURS = 4;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { homeTeamName, awayTeamName } = await req.json();

    if (!homeTeamName || !awayTeamName) {
      return new Response(
        JSON.stringify({ error: 'homeTeamName and awayTeamName required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check DB cache first
    const sbUrl = Deno.env.get('SB_URL') || Deno.env.get('SUPABASE_URL') || '';
    const sbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const sb = createClient(sbUrl, sbKey);

    const cacheKey = `match-stats:${homeTeamName}:${awayTeamName}`;
    const { data: cached } = await sb
      .from('api_cache')
      .select('data')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cached?.data) {
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('API_FOOTBALL_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const headers = { 'x-apisports-key': apiKey };

    const [homeRes, awayRes] = await Promise.all([
      fetch(`https://v3.football.api-sports.io/teams?search=${encodeURIComponent(homeTeamName)}`, { headers }),
      fetch(`https://v3.football.api-sports.io/teams?search=${encodeURIComponent(awayTeamName)}`, { headers }),
    ]);

    const homeData = await homeRes.json();
    const awayData = await awayRes.json();

    const homeTeam = homeData.response?.[0]?.team;
    const awayTeam = awayData.response?.[0]?.team;

    if (!homeTeam || !awayTeam) {
      return new Response(
        JSON.stringify({ h2h: [], homeForm: [], awayForm: [], error: 'Teams not found in API' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const [h2hRes, homeFormRes, awayFormRes] = await Promise.all([
      fetch(`https://v3.football.api-sports.io/fixtures/headtohead?h2h=${homeTeam.id}-${awayTeam.id}&last=10`, { headers }),
      fetch(`https://v3.football.api-sports.io/fixtures?team=${homeTeam.id}&last=5`, { headers }),
      fetch(`https://v3.football.api-sports.io/fixtures?team=${awayTeam.id}&last=5`, { headers }),
    ]);

    const h2hData = await h2hRes.json();
    const homeFormData = await homeFormRes.json();
    const awayFormData = await awayFormRes.json();

    const h2hFixtures: H2HFixture[] = h2hData.response || [];
    let homeWins = 0, awayWins = 0, draws = 0;
    h2hFixtures.forEach((f) => {
      if (f.goals.home === f.goals.away) draws++;
      else if (
        (f.teams.home.id === homeTeam.id && (f.goals.home ?? 0) > (f.goals.away ?? 0)) ||
        (f.teams.away.id === homeTeam.id && (f.goals.away ?? 0) > (f.goals.home ?? 0))
      ) homeWins++;
      else awayWins++;
    });

    const getForm = (fixtures: any[], teamId: number) =>
      fixtures.map((f: any) => {
        const isHome = f.teams.home.id === teamId;
        const goalsFor = isHome ? f.goals.home : f.goals.away;
        const goalsAgainst = isHome ? f.goals.away : f.goals.home;
        let result = 'D';
        if (goalsFor > goalsAgainst) result = 'W';
        else if (goalsFor < goalsAgainst) result = 'L';
        return { result, score: `${f.goals.home}-${f.goals.away}`, opponent: isHome ? f.teams.away.name : f.teams.home.name, date: f.fixture.date, league: f.league?.name };
      });

    const result = {
      h2h: {
        total: h2hFixtures.length, homeWins, awayWins, draws,
        matches: h2hFixtures.slice(0, 5).map((f) => ({
          date: f.fixture.date, home: f.teams.home.name, away: f.teams.away.name,
          homeGoals: f.goals.home, awayGoals: f.goals.away, league: f.league?.name,
        })),
      },
      homeForm: getForm(homeFormData.response || [], homeTeam.id),
      awayForm: getForm(awayFormData.response || [], awayTeam.id),
      homeLogo: homeTeam.logo,
      awayLogo: awayTeam.logo,
    };

    // Store in cache
    const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString();
    await sb.from('api_cache').upsert(
      { cache_key: cacheKey, data: result, expires_at: expiresAt, fetched_at: new Date().toISOString() },
      { onConflict: 'cache_key' }
    );

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching match stats:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
