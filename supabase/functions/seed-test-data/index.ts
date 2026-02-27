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

    const log: string[] = [];

    // ── 1. Get all users ──
    const users = [
      { id: "948d6aaf-fe1a-44e2-8a4b-239572b48e4e", name: "RobertDev" },
      { id: "80b72977-0a64-42a2-a28b-9f8109d29ee1", name: "Breno" },
      { id: "00c23a5d-60db-4ea4-80bd-456b44e6438a", name: "Lore" },
      { id: "f26bd7f2-0731-4175-85a4-d611a5fdac4f", name: "Josr" },
    ];

    const pools = [
      { id: "3e39911a-a89a-49d8-b4a4-c5996b3402d3", name: "Salet" },
      { id: "0de0b296-e894-40f9-bc8a-525ee805326a", name: "Test" },
      { id: "ef1ffe15-480a-452d-bc13-918f50c49d4b", name: "Test 3" },
      { id: "fa546d2d-604b-4cda-986f-6df4055f4020", name: "Tes" },
    ];

    // ── 2. Ensure all users are in all pools ──
    for (const pool of pools) {
      for (const user of users) {
        const { error } = await supabase.from("pool_members").upsert(
          { pool_id: pool.id, user_id: user.id, role: "member" },
          { onConflict: "pool_id,user_id", ignoreDuplicates: true }
        );
        // Ignore duplicate errors
      }
    }
    log.push("✅ All users added to all pools");

    // ── 3. Get matches ordered by kickoff ──
    const { data: matches } = await supabase
      .from("matches")
      .select("id, kickoff_utc, home_team_id, away_team_id, stage, group, status")
      .not("home_team_id", "is", null)
      .not("away_team_id", "is", null)
      .order("kickoff_utc", { ascending: true });

    if (!matches || matches.length === 0) {
      return new Response(JSON.stringify({ error: "No matches found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // ── 4. Set match results for first 18 matches (finished), 2 live, rest scheduled ──
    const realisticScores = [
      [2, 1], [1, 1], [3, 0], [0, 0], [2, 2], [1, 0], [3, 1], [2, 0],
      [1, 2], [0, 1], [4, 1], [2, 3], [1, 0], [0, 0], [3, 2], [2, 1],
      [1, 1], [0, 2],
    ];

    const finishedCount = 18;
    const liveCount = 2;

    for (let i = 0; i < Math.min(matches.length, finishedCount + liveCount); i++) {
      const m = matches[i];
      // Skip the one that's already finished (MEX vs RSA)
      if (m.status === "finished") continue;

      const score = realisticScores[i] || [1, 0];

      if (i < finishedCount) {
        // Set as finished
        const { error } = await supabase.from("matches").update({
          home_score: score[0],
          away_score: score[1],
          status: "finished",
          needs_recalc: true,
          last_updated: new Date().toISOString(),
        }).eq("id", m.id);
        if (error) log.push(`❌ Match ${i}: ${error.message}`);
      } else {
        // Set as live (with partial score)
        const { error } = await supabase.from("matches").update({
          home_score: score[0],
          away_score: score[1],
          status: "live",
          last_updated: new Date().toISOString(),
        }).eq("id", m.id);
        if (error) log.push(`❌ Live match ${i}: ${error.message}`);
      }
    }
    log.push(`✅ ${finishedCount} matches set to finished, ${liveCount} set to live`);

    // ── 5. Generate predictions for ALL users in ALL pools for first 30 matches ──
    const predictionScores = [
      // Varying predictions per user to create interesting leaderboard
      // User 0 (RobertDev) - decent predictor
      [[2, 1], [1, 1], [2, 0], [1, 0], [1, 1], [1, 0], [2, 1], [3, 0], [2, 1], [0, 0], [3, 1], [2, 2], [1, 0], [1, 1], [2, 1], [2, 1], [0, 0], [1, 2], [2, 0], [1, 1], [0, 1], [3, 0], [2, 1], [1, 0], [1, 1], [2, 0], [0, 0], [3, 1], [2, 2], [1, 0]],
      // User 1 (Breno) - good predictor  
      [[2, 0], [2, 1], [3, 0], [1, 1], [2, 1], [2, 0], [3, 1], [2, 0], [0, 1], [1, 0], [4, 1], [1, 2], [2, 0], [0, 0], [3, 2], [1, 0], [1, 1], [0, 1], [1, 0], [2, 2], [1, 0], [2, 1], [3, 0], [1, 1], [0, 0], [3, 1], [2, 0], [1, 2], [0, 1], [2, 1]],
      // User 2 (Lore) - average predictor
      [[1, 0], [0, 0], [2, 1], [0, 1], [3, 1], [0, 0], [2, 0], [1, 1], [2, 0], [1, 1], [2, 0], [3, 1], [0, 1], [1, 0], [2, 0], [3, 2], [2, 0], [1, 1], [0, 0], [2, 1], [1, 1], [0, 0], [2, 0], [3, 1], [1, 0], [2, 2], [1, 1], [0, 1], [3, 0], [2, 1]],
      // User 3 (Josr) - wildcard predictor
      [[3, 0], [2, 2], [1, 0], [2, 1], [0, 0], [3, 1], [4, 2], [0, 0], [1, 3], [2, 0], [5, 0], [1, 1], [0, 2], [2, 1], [4, 3], [0, 0], [2, 1], [0, 3], [3, 1], [0, 0], [2, 0], [1, 1], [0, 1], [2, 2], [3, 0], [1, 0], [2, 1], [0, 0], [1, 1], [3, 2]],
    ];

    let predCount = 0;
    const matchesToPredict = Math.min(matches.length, 30);

    for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
      const pool = pools[poolIdx];
      for (let userIdx = 0; userIdx < users.length; userIdx++) {
        const user = users[userIdx];
        for (let matchIdx = 0; matchIdx < matchesToPredict; matchIdx++) {
          const m = matches[matchIdx];
          const scores = predictionScores[userIdx][matchIdx] || [1, 0];
          
          // Add some variation per pool (shift scores slightly)
          const homeP = Math.max(0, scores[0] + (poolIdx % 2 === 0 ? 0 : (matchIdx % 3 === 0 ? 1 : 0)));
          const awayP = Math.max(0, scores[1] + (poolIdx % 2 === 1 ? 0 : (matchIdx % 4 === 0 ? 1 : 0)));

          const { error } = await supabase.from("predictions").upsert(
            {
              pool_id: pool.id,
              user_id: user.id,
              match_id: m.id,
              home_pred: homeP,
              away_pred: awayP,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "pool_id,user_id,match_id", ignoreDuplicates: false }
          );
          if (!error) predCount++;
        }
      }
    }
    log.push(`✅ ${predCount} predictions created/updated`);

    // ── 6. Add some bonus questions ──
    const bonusQuestions = [
      { question: "Wie wordt wereldkampioen 2026?", type: "team", points: 15, closes_at: "2026-06-11T18:00:00Z", options_json: JSON.stringify(["Brazilië", "Argentinië", "Frankrijk", "Duitsland", "Engeland", "Spanje", "Nederland", "Portugal"]) },
      { question: "Wie wordt topscorer van het WK?", type: "player", points: 10, closes_at: "2026-06-11T18:00:00Z", options_json: JSON.stringify(["Mbappé", "Haaland", "Vinicius Jr", "Kane", "Lewandowski", "Messi"]) },
      { question: "Hoeveel doelpunten vallen er in de groepsfase?", type: "number", points: 10, closes_at: "2026-06-11T18:00:00Z", options_json: null },
    ];

    for (const q of bonusQuestions) {
      // Check if already exists
      const { data: existing } = await supabase.from("bonus_questions").select("id").eq("question", q.question).limit(1);
      if (!existing || existing.length === 0) {
        await supabase.from("bonus_questions").insert(q);
      }
    }
    log.push("✅ Bonus questions created");

    // ── 7. Add bonus predictions for users ──
    const { data: bqs } = await supabase.from("bonus_questions").select("id, question").limit(10);
    if (bqs && bqs.length > 0) {
      const bonusAnswers = ["Brazilië", "Mbappé", "145", "Argentinië", "Haaland", "160", "Nederland", "Vinicius Jr", "130", "Frankrijk", "Kane", "155"];
      let bpCount = 0;
      for (const pool of pools) {
        for (let ui = 0; ui < users.length; ui++) {
          for (let qi = 0; qi < bqs.length; qi++) {
            const answer = bonusAnswers[(ui * bqs.length + qi) % bonusAnswers.length];
            const { error } = await supabase.from("bonus_predictions").upsert(
              { pool_id: pool.id, user_id: users[ui].id, question_id: bqs[qi].id, answer },
              { onConflict: "pool_id,user_id,question_id", ignoreDuplicates: true }
            );
            if (!error) bpCount++;
          }
        }
      }
      log.push(`✅ ${bpCount} bonus predictions created`);
    }

    return new Response(JSON.stringify({ success: true, log }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
