import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get upcoming matches with real teams (next 7 days)
    const now = new Date().toISOString();
    // Look ahead up to 6 months to cover pre-tournament period
    const lookAhead = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();

    const { data: matches, error: matchErr } = await supabase
      .from('matches')
      .select('id, kickoff_utc, stage, "group", home_team:teams!matches_home_team_id_fkey(name), away_team:teams!matches_away_team_id_fkey(name)')
      .eq('status', 'scheduled')
      .gte('kickoff_utc', now)
      .lte('kickoff_utc', lookAhead)
      .order('kickoff_utc', { ascending: true })
      .limit(6);

    if (matchErr) {
      console.error('Error fetching matches:', matchErr);
      return new Response(JSON.stringify({ error: 'Failed to fetch matches' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Filter out placeholder/playoff teams
    const validMatches = (matches || []).filter(
      (m: any) => m.home_team?.name && m.away_team?.name &&
        !m.home_team.name.includes('Playoff') && !m.away_team.name.includes('Playoff') &&
        !m.home_team.name.includes('TBD') && !m.away_team.name.includes('TBD')
    );

    if (validMatches.length === 0) {
      return new Response(JSON.stringify({ message: 'No upcoming matches with known teams', processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check which matches already have fresh news (not expired)
    const matchIds = validMatches.map((m: any) => m.id);
    const { data: existingNews } = await supabase
      .from('wk_news_cache')
      .select('match_id')
      .in('match_id', matchIds)
      .gt('expires_at', now);

    const existingMatchIds = new Set((existingNews || []).map((n: any) => n.match_id));
    const matchesNeedingNews = validMatches.filter((m: any) => !existingMatchIds.has(m.id));

    if (matchesNeedingNews.length === 0) {
      return new Response(JSON.stringify({ message: 'All matches have fresh news', processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Limit to 3 per batch to avoid rate limits
    const batch = matchesNeedingNews.slice(0, 3);
    let processed = 0;

    for (const match of batch) {
      try {
        const homeTeam = match.home_team?.name;
        const awayTeam = match.away_team?.name;
        const stageInfo = match.stage === 'group' ? `Groepsfase ${match.group ? `Groep ${match.group}` : ''}` : match.stage;
        const dateStr = new Date(match.kickoff_utc).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });

        const prompt = `Je bent een voetbalexpert en journalist. Geef een kort nieuwsoverzicht voor de WK 2026 wedstrijd ${homeTeam} vs ${awayTeam} (${stageInfo}, ${dateStr}).

Schrijf in het Nederlands. Geef precies 4 items in JSON-array format. Elk item heeft:
- "title": korte pakkende kop (max 60 tekens)
- "summary": 2-3 zinnen met relevante context, feiten of analyse
- "category": een van "vorm", "historie", "spelers", "tactiek"

Focus op:
1. Recente vorm en prestaties van beide teams
2. Historische onderlinge resultaten en rivaliteit
3. Belangrijke spelers om in de gaten te houden
4. Tactische verwachtingen en voorspellingen`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: [{ role: 'user', content: prompt }],
            tools: [{
              type: 'function',
              function: {
                name: 'match_news',
                description: 'Return 4 news items about a football match',
                parameters: {
                  type: 'object',
                  properties: {
                    items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          title: { type: 'string' },
                          summary: { type: 'string' },
                          category: { type: 'string', enum: ['vorm', 'historie', 'spelers', 'tactiek'] },
                        },
                        required: ['title', 'summary', 'category'],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ['items'],
                  additionalProperties: false,
                },
              },
            }],
            tool_choice: { type: 'function', function: { name: 'match_news' } },
          }),
        });

        if (!aiResponse.ok) {
          console.error(`AI error for ${homeTeam} vs ${awayTeam}:`, aiResponse.status);
          continue;
        }

        const data = await aiResponse.json();
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        let items: any[] = [];

        if (toolCall?.function?.arguments) {
          items = JSON.parse(toolCall.function.arguments).items || [];
        } else {
          const content = data.choices?.[0]?.message?.content || '';
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) items = JSON.parse(jsonMatch[0]);
        }

        if (items.length > 0) {
          // Delete old news for this match
          await supabase.from('wk_news_cache').delete().eq('match_id', match.id);

          // Insert new items
          const rows = items.map((item: any) => ({
            match_id: match.id,
            home_team_name: homeTeam,
            away_team_name: awayTeam,
            category: item.category,
            title: item.title,
            summary: item.summary,
            expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
          }));

          const { error: insertErr } = await supabase.from('wk_news_cache').insert(rows);
          if (insertErr) {
            console.error(`Insert error for ${homeTeam} vs ${awayTeam}:`, insertErr);
          } else {
            processed++;
            console.log(`Generated news for ${homeTeam} vs ${awayTeam}`);
          }
        }

        // Small delay between API calls
        if (batch.indexOf(match) < batch.length - 1) {
          await new Promise(r => setTimeout(r, 1000));
        }
      } catch (err) {
        console.error(`Error processing match ${match.id}:`, err);
      }
    }

    return new Response(JSON.stringify({ message: `Processed ${processed} matches`, processed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Batch news error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
