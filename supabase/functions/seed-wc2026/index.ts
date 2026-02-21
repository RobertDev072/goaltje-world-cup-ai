import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // All 48 teams with emoji flags
    const teams = [
      // Group A
      { name: "Mexico", short_name: "MEX", group: "A", flag_url: "🇲🇽", external_id: "mex" },
      { name: "South Africa", short_name: "RSA", group: "A", flag_url: "🇿🇦", external_id: "rsa" },
      { name: "South Korea", short_name: "KOR", group: "A", flag_url: "🇰🇷", external_id: "kor" },
      { name: "Euro Playoff D", short_name: "EPD", group: "A", flag_url: "🏳️", external_id: "epd" },
      // Group B
      { name: "Canada", short_name: "CAN", group: "B", flag_url: "🇨🇦", external_id: "can" },
      { name: "Euro Playoff A", short_name: "EPA", group: "B", flag_url: "🏳️", external_id: "epa" },
      { name: "Qatar", short_name: "QAT", group: "B", flag_url: "🇶🇦", external_id: "qat" },
      { name: "Switzerland", short_name: "SUI", group: "B", flag_url: "🇨🇭", external_id: "sui" },
      // Group C
      { name: "Brazil", short_name: "BRA", group: "C", flag_url: "🇧🇷", external_id: "bra" },
      { name: "Morocco", short_name: "MAR", group: "C", flag_url: "🇲🇦", external_id: "mar" },
      { name: "Haiti", short_name: "HAI", group: "C", flag_url: "🇭🇹", external_id: "hai" },
      { name: "Scotland", short_name: "SCO", group: "C", flag_url: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", external_id: "sco" },
      // Group D
      { name: "USA", short_name: "USA", group: "D", flag_url: "🇺🇸", external_id: "usa" },
      { name: "Paraguay", short_name: "PAR", group: "D", flag_url: "🇵🇾", external_id: "par" },
      { name: "Australia", short_name: "AUS", group: "D", flag_url: "🇦🇺", external_id: "aus" },
      { name: "Euro Playoff C", short_name: "EPC", group: "D", flag_url: "🏳️", external_id: "epc" },
      // Group E
      { name: "Germany", short_name: "GER", group: "E", flag_url: "🇩🇪", external_id: "ger" },
      { name: "Curaçao", short_name: "CUW", group: "E", flag_url: "🇨🇼", external_id: "cuw" },
      { name: "Ivory Coast", short_name: "CIV", group: "E", flag_url: "🇨🇮", external_id: "civ" },
      { name: "Ecuador", short_name: "ECU", group: "E", flag_url: "🇪🇨", external_id: "ecu" },
      // Group F
      { name: "Netherlands", short_name: "NED", group: "F", flag_url: "🇳🇱", external_id: "ned" },
      { name: "Japan", short_name: "JPN", group: "F", flag_url: "🇯🇵", external_id: "jpn" },
      { name: "Euro Playoff B", short_name: "EPB", group: "F", flag_url: "🏳️", external_id: "epb" },
      { name: "Tunisia", short_name: "TUN", group: "F", flag_url: "🇹🇳", external_id: "tun" },
      // Group G
      { name: "Belgium", short_name: "BEL", group: "G", flag_url: "🇧🇪", external_id: "bel" },
      { name: "Egypt", short_name: "EGY", group: "G", flag_url: "🇪🇬", external_id: "egy" },
      { name: "Iran", short_name: "IRN", group: "G", flag_url: "🇮🇷", external_id: "irn" },
      { name: "New Zealand", short_name: "NZL", group: "G", flag_url: "🇳🇿", external_id: "nzl" },
      // Group H
      { name: "Spain", short_name: "ESP", group: "H", flag_url: "🇪🇸", external_id: "esp" },
      { name: "Cape Verde", short_name: "CPV", group: "H", flag_url: "🇨🇻", external_id: "cpv" },
      { name: "Saudi Arabia", short_name: "KSA", group: "H", flag_url: "🇸🇦", external_id: "ksa" },
      { name: "Uruguay", short_name: "URU", group: "H", flag_url: "🇺🇾", external_id: "uru" },
      // Group I
      { name: "France", short_name: "FRA", group: "I", flag_url: "🇫🇷", external_id: "fra" },
      { name: "Senegal", short_name: "SEN", group: "I", flag_url: "🇸🇳", external_id: "sen" },
      { name: "FIFA Playoff 2", short_name: "FP2", group: "I", flag_url: "🏳️", external_id: "fp2" },
      { name: "Norway", short_name: "NOR", group: "I", flag_url: "🇳🇴", external_id: "nor" },
      // Group J
      { name: "Argentina", short_name: "ARG", group: "J", flag_url: "🇦🇷", external_id: "arg" },
      { name: "Algeria", short_name: "ALG", group: "J", flag_url: "🇩🇿", external_id: "alg" },
      { name: "Austria", short_name: "AUT", group: "J", flag_url: "🇦🇹", external_id: "aut" },
      { name: "Jordan", short_name: "JOR", group: "J", flag_url: "🇯🇴", external_id: "jor" },
      // Group K
      { name: "Portugal", short_name: "POR", group: "K", flag_url: "🇵🇹", external_id: "por" },
      { name: "FIFA Playoff 1", short_name: "FP1", group: "K", flag_url: "🏳️", external_id: "fp1" },
      { name: "Uzbekistan", short_name: "UZB", group: "K", flag_url: "🇺🇿", external_id: "uzb" },
      { name: "Colombia", short_name: "COL", group: "K", flag_url: "🇨🇴", external_id: "col" },
      // Group L
      { name: "England", short_name: "ENG", group: "L", flag_url: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", external_id: "eng" },
      { name: "Croatia", short_name: "CRO", group: "L", flag_url: "🇭🇷", external_id: "cro" },
      { name: "Ghana", short_name: "GHA", group: "L", flag_url: "🇬🇭", external_id: "gha" },
      { name: "Panama", short_name: "PAN", group: "L", flag_url: "🇵🇦", external_id: "pan" },
    ];

    // Insert teams (upsert by external_id)
    const { error: teamsError } = await supabase
      .from("teams")
      .upsert(teams, { onConflict: "external_id" });
    if (teamsError) throw new Error(`Teams error: ${teamsError.message}`);

    // Fetch team IDs
    const { data: allTeams } = await supabase.from("teams").select("id, external_id");
    const teamMap: Record<string, string> = {};
    allTeams?.forEach((t: any) => { teamMap[t.external_id] = t.id; });

    // Helper: ET to UTC (EDT = UTC-4)
    const etToUtc = (dateStr: string, etHour: number): string => {
      // dateStr format: "2026-06-11", create date in ET then add 4 hours for UTC
      const [y, m, d] = dateStr.split("-").map(Number);
      const date = new Date(Date.UTC(y, m - 1, d, etHour + 4, 0, 0));
      return date.toISOString();
    };

    // All 72 group stage matches (ET times converted to UTC)
    const matches = [
      // Matchday 1
      { home: "mex", away: "rsa", group: "A", date: "2026-06-12", etHour: 20, venue: "Estadio Azteca, Mexico City" },
      { home: "kor", away: "epd", group: "A", date: "2026-06-11", etHour: 17, venue: "Estadio Akron, Guadalajara" },
      { home: "can", away: "epa", group: "B", date: "2026-06-12", etHour: 15, venue: "BMO Field, Toronto" },
      { home: "usa", away: "par", group: "D", date: "2026-06-12", etHour: 21, venue: "SoFi Stadium, Los Angeles" },
      { home: "bra", away: "mar", group: "C", date: "2026-06-13", etHour: 12, venue: "Gillette Stadium, Foxborough" },
      { home: "hai", away: "sco", group: "C", date: "2026-06-13", etHour: 15, venue: "MetLife Stadium, East Rutherford" },
      { home: "aus", away: "epc", group: "D", date: "2026-06-13", etHour: 18, venue: "BC Place, Vancouver" },
      { home: "qat", away: "sui", group: "B", date: "2026-06-13", etHour: 21, venue: "Levi's Stadium, Santa Clara" },
      { home: "ger", away: "cuw", group: "E", date: "2026-06-14", etHour: 12, venue: "Lincoln Financial Field, Philadelphia" },
      { home: "civ", away: "ecu", group: "E", date: "2026-06-14", etHour: 15, venue: "NRG Stadium, Houston" },
      { home: "ned", away: "jpn", group: "F", date: "2026-06-14", etHour: 18, venue: "AT&T Stadium, Arlington" },
      { home: "epb", away: "tun", group: "F", date: "2026-06-14", etHour: 21, venue: "Estadio BBVA, Monterrey" },
      { home: "esp", away: "cpv", group: "H", date: "2026-06-15", etHour: 12, venue: "Hard Rock Stadium, Miami Gardens" },
      { home: "ksa", away: "uru", group: "H", date: "2026-06-15", etHour: 15, venue: "Mercedes-Benz Stadium, Atlanta" },
      { home: "bel", away: "egy", group: "G", date: "2026-06-15", etHour: 18, venue: "SoFi Stadium, Los Angeles" },
      { home: "irn", away: "nzl", group: "G", date: "2026-06-15", etHour: 21, venue: "Lumen Field, Seattle" },
      { home: "fra", away: "sen", group: "I", date: "2026-06-16", etHour: 12, venue: "MetLife Stadium, East Rutherford" },
      { home: "fp2", away: "nor", group: "I", date: "2026-06-16", etHour: 15, venue: "Gillette Stadium, Foxborough" },
      { home: "arg", away: "alg", group: "J", date: "2026-06-16", etHour: 18, venue: "Arrowhead Stadium, Kansas City" },
      { home: "aut", away: "jor", group: "J", date: "2026-06-16", etHour: 21, venue: "Levi's Stadium, Santa Clara" },
      { home: "eng", away: "cro", group: "L", date: "2026-06-17", etHour: 12, venue: "BMO Field, Toronto" },
      { home: "gha", away: "pan", group: "L", date: "2026-06-17", etHour: 15, venue: "AT&T Stadium, Arlington" },
      { home: "por", away: "fp1", group: "K", date: "2026-06-17", etHour: 18, venue: "NRG Stadium, Houston" },
      { home: "uzb", away: "col", group: "K", date: "2026-06-17", etHour: 21, venue: "Estadio Azteca, Mexico City" },

      // Matchday 2
      { home: "epd", away: "rsa", group: "A", date: "2026-06-18", etHour: 12, venue: "Mercedes-Benz Stadium, Atlanta" },
      { home: "sui", away: "epa", group: "B", date: "2026-06-18", etHour: 15, venue: "SoFi Stadium, Los Angeles" },
      { home: "can", away: "qat", group: "B", date: "2026-06-18", etHour: 18, venue: "BC Place, Vancouver" },
      { home: "mex", away: "kor", group: "A", date: "2026-06-18", etHour: 21, venue: "Estadio Akron, Guadalajara" },
      { home: "bra", away: "hai", group: "C", date: "2026-06-19", etHour: 12, venue: "Lincoln Financial Field, Philadelphia" },
      { home: "sco", away: "mar", group: "C", date: "2026-06-19", etHour: 15, venue: "MetLife Stadium, East Rutherford" },
      { home: "epc", away: "par", group: "D", date: "2026-06-19", etHour: 18, venue: "Levi's Stadium, Santa Clara" },
      { home: "usa", away: "aus", group: "D", date: "2026-06-19", etHour: 21, venue: "Lumen Field, Seattle" },
      { home: "ger", away: "civ", group: "E", date: "2026-06-20", etHour: 12, venue: "BMO Field, Toronto" },
      { home: "ecu", away: "cuw", group: "E", date: "2026-06-20", etHour: 15, venue: "Arrowhead Stadium, Kansas City" },
      { home: "ned", away: "epb", group: "F", date: "2026-06-20", etHour: 18, venue: "NRG Stadium, Houston" },
      { home: "tun", away: "jpn", group: "F", date: "2026-06-20", etHour: 21, venue: "Estadio BBVA, Monterrey" },
      { home: "esp", away: "ksa", group: "H", date: "2026-06-21", etHour: 12, venue: "Hard Rock Stadium, Miami Gardens" },
      { home: "uru", away: "cpv", group: "H", date: "2026-06-21", etHour: 15, venue: "Mercedes-Benz Stadium, Atlanta" },
      { home: "bel", away: "irn", group: "G", date: "2026-06-21", etHour: 18, venue: "SoFi Stadium, Los Angeles" },
      { home: "nzl", away: "egy", group: "G", date: "2026-06-21", etHour: 21, venue: "BC Place, Vancouver" },
      { home: "fra", away: "fp2", group: "I", date: "2026-06-22", etHour: 12, venue: "MetLife Stadium, East Rutherford" },
      { home: "nor", away: "sen", group: "I", date: "2026-06-22", etHour: 15, venue: "Lincoln Financial Field, Philadelphia" },
      { home: "arg", away: "aut", group: "J", date: "2026-06-22", etHour: 18, venue: "AT&T Stadium, Arlington" },
      { home: "jor", away: "alg", group: "J", date: "2026-06-22", etHour: 21, venue: "Levi's Stadium, Santa Clara" },
      { home: "eng", away: "gha", group: "L", date: "2026-06-23", etHour: 12, venue: "Gillette Stadium, Foxborough" },
      { home: "pan", away: "cro", group: "L", date: "2026-06-23", etHour: 15, venue: "BMO Field, Toronto" },
      { home: "por", away: "uzb", group: "K", date: "2026-06-23", etHour: 18, venue: "NRG Stadium, Houston" },
      { home: "col", away: "fp1", group: "K", date: "2026-06-23", etHour: 21, venue: "Estadio Akron, Guadalajara" },

      // Matchday 3
      { home: "sco", away: "bra", group: "C", date: "2026-06-24", etHour: 12, venue: "Hard Rock Stadium, Miami Gardens" },
      { home: "mar", away: "hai", group: "C", date: "2026-06-24", etHour: 15, venue: "Mercedes-Benz Stadium, Atlanta" },
      { home: "can", away: "sui", group: "B", date: "2026-06-24", etHour: 18, venue: "BC Place, Vancouver" },
      { home: "epa", away: "qat", group: "B", date: "2026-06-24", etHour: 21, venue: "Lumen Field, Seattle" },
      { home: "mex", away: "epd", group: "A", date: "2026-06-24", etHour: 12, venue: "Estadio Azteca, Mexico City" },
      { home: "kor", away: "rsa", group: "A", date: "2026-06-24", etHour: 15, venue: "Estadio BBVA, Monterrey" },
      { home: "ecu", away: "ger", group: "E", date: "2026-06-25", etHour: 12, venue: "Lincoln Financial Field, Philadelphia" },
      { home: "cuw", away: "civ", group: "E", date: "2026-06-25", etHour: 15, venue: "MetLife Stadium, East Rutherford" },
      { home: "tun", away: "ned", group: "F", date: "2026-06-25", etHour: 18, venue: "AT&T Stadium, Arlington" },
      { home: "jpn", away: "epb", group: "F", date: "2026-06-25", etHour: 21, venue: "Arrowhead Stadium, Kansas City" },
      { home: "usa", away: "epc", group: "D", date: "2026-06-25", etHour: 12, venue: "SoFi Stadium, Los Angeles" },
      { home: "par", away: "aus", group: "D", date: "2026-06-25", etHour: 15, venue: "Levi's Stadium, Santa Clara" },
      { home: "nor", away: "fra", group: "I", date: "2026-06-26", etHour: 12, venue: "Gillette Stadium, Foxborough" },
      { home: "sen", away: "fp2", group: "I", date: "2026-06-26", etHour: 15, venue: "BMO Field, Toronto" },
      { home: "nzl", away: "bel", group: "G", date: "2026-06-26", etHour: 18, venue: "Lumen Field, Seattle" },
      { home: "egy", away: "irn", group: "G", date: "2026-06-26", etHour: 21, venue: "BC Place, Vancouver" },
      { home: "uru", away: "esp", group: "H", date: "2026-06-26", etHour: 12, venue: "NRG Stadium, Houston" },
      { home: "cpv", away: "ksa", group: "H", date: "2026-06-26", etHour: 15, venue: "Estadio Akron, Guadalajara" },
      { home: "pan", away: "eng", group: "L", date: "2026-06-27", etHour: 12, venue: "MetLife Stadium, East Rutherford" },
      { home: "cro", away: "gha", group: "L", date: "2026-06-27", etHour: 15, venue: "Lincoln Financial Field, Philadelphia" },
      { home: "jor", away: "arg", group: "J", date: "2026-06-27", etHour: 18, venue: "Arrowhead Stadium, Kansas City" },
      { home: "alg", away: "aut", group: "J", date: "2026-06-27", etHour: 21, venue: "AT&T Stadium, Arlington" },
      { home: "col", away: "por", group: "K", date: "2026-06-27", etHour: 12, venue: "Hard Rock Stadium, Miami Gardens" },
      { home: "fp1", away: "uzb", group: "K", date: "2026-06-27", etHour: 15, venue: "Mercedes-Benz Stadium, Atlanta" },
    ];

    const matchRows = matches.map((m, i) => ({
      external_id: `wc2026_gs_${i + 1}`,
      stage: "group",
      group: m.group,
      kickoff_utc: etToUtc(m.date, m.etHour),
      venue: m.venue,
      home_team_id: teamMap[m.home],
      away_team_id: teamMap[m.away],
      status: "scheduled",
    }));

    const { error: matchesError } = await supabase
      .from("matches")
      .upsert(matchRows, { onConflict: "external_id" });
    if (matchesError) throw new Error(`Matches error: ${matchesError.message}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        teams_count: teams.length, 
        matches_count: matchRows.length,
        message: "WK 2026 data succesvol geladen! 🏆" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Seed error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
