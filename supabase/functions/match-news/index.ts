import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const CACHE_TTL_HOURS = 4;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { homeTeam, awayTeam, matchDate, stage, group } = await req.json();

    if (!homeTeam || !awayTeam) {
      return new Response(
        JSON.stringify({ error: 'homeTeam and awayTeam required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check DB cache first
    const sbUrl = Deno.env.get('SB_URL') || Deno.env.get('SUPABASE_URL') || '';
    const sbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const sb = createClient(sbUrl, sbKey);

    const cacheKey = `match-news:${homeTeam}:${awayTeam}`;
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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stageInfo = stage === 'group' ? `Groepsfase ${group ? `Groep ${group}` : ''}` : stage;
    const dateStr = matchDate ? new Date(matchDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

    const prompt = `Je bent een voetbalexpert en journalist. Geef een kort nieuwsoverzicht voor de WK 2026 wedstrijd ${homeTeam} vs ${awayTeam} (${stageInfo}, ${dateStr}).

Schrijf in het Nederlands. Geef precies 4 items in JSON-array format. Elk item heeft:
- "title": korte pakkende kop (max 60 tekens)
- "summary": 2-3 zinnen met relevante context, feiten of analyse
- "category": een van "vorm", "historie", "spelers", "tactiek"

Focus op:
1. Recente vorm en prestaties van beide teams
2. Historische onderlinge resultaten en rivaliteit
3. Belangrijke spelers om in de gaten te houden
4. Tactische verwachtingen en voorspellingen

Gebruik je kennis over deze nationale teams, hun WK-kwalificatie, sterspelers en recente interlands.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit bereikt, probeer later opnieuw.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Tegoed onvoldoende.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const t = await response.text();
      console.error('AI gateway error:', response.status, t);
      return new Response(JSON.stringify({ error: 'AI gateway error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    let resultData: any = { items: [] };

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      resultData = JSON.parse(toolCall.function.arguments);
    } else {
      const content = data.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        resultData = { items: JSON.parse(jsonMatch[0]) };
      }
    }

    // Store in cache
    const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString();
    await sb.from('api_cache').upsert(
      { cache_key: cacheKey, data: resultData, expires_at: expiresAt, fetched_at: new Date().toISOString() },
      { onConflict: 'cache_key' }
    );

    return new Response(JSON.stringify(resultData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating match news:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
