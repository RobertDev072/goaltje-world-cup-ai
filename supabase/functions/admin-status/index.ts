import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Verify caller is admin
  const authHeader = req.headers.get("Authorization") || "";
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
  }

  try {
    // Cron job status
    const { data: cronData } = await supabase.rpc("get_cron_status" as any);

    // API usage today
    const today = new Date().toISOString().split("T")[0];
    const { data: usage } = await supabase
      .from("api_usage")
      .select("request_count")
      .eq("usage_date", today)
      .maybeSingle();

    // Recent sync errors from client logs (stored in api_cache as sentinel)
    const { data: recentSyncs } = await supabase
      .from("api_cache")
      .select("cache_key, fetched_at, expires_at")
      .like("cache_key", "fixtures%")
      .order("fetched_at" as any, { ascending: false })
      .limit(3);

    // Pool & user summary
    const { count: totalPools } = await supabase.from("pools").select("*", { count: "exact", head: true });
    const { count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    const { count: totalMembers } = await supabase.from("pool_members").select("*", { count: "exact", head: true });

    // Large pools (100+ members)
    const { data: largePools } = await supabase
      .from("pools")
      .select("id, name, pool_members(count)")
      .order("created_at" as any, { ascending: false });

    const largePoolList = (largePools || [])
      .map((p: any) => ({ name: p.name, count: p.pool_members?.[0]?.count ?? 0 }))
      .filter((p: any) => p.count >= 50)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10);

    return new Response(
      JSON.stringify({
        cron: cronData || [],
        apiUsageToday: usage?.request_count ?? 0,
        recentSyncs: recentSyncs || [],
        summary: { totalPools, totalUsers, totalMembers },
        largePools: largePoolList,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
