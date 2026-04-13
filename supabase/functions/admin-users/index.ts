import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ActionBody =
  | { action: "list"; limit?: number; offset?: number }
  | { action: "delete"; user_id: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Verify caller is admin
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as ActionBody;

    if (body.action === "delete") {
      if (!body.user_id) {
        return new Response(JSON.stringify({ error: "Missing user_id" }), { status: 400, headers: corsHeaders });
      }

      const uid = body.user_id;

      // 1. Delete all pools created by this user (with their related data)
      const { data: userPools } = await supabase
        .from("pools")
        .select("id")
        .eq("created_by", uid);

      for (const pool of userPools || []) {
        await supabase.from("pool_messages").delete().eq("pool_id", pool.id);
        await supabase.from("bonus_predictions").delete().eq("pool_id", pool.id);
        await supabase.from("predictions").delete().eq("pool_id", pool.id);
        await supabase.from("pool_members").delete().eq("pool_id", pool.id);
        await supabase.from("pools").delete().eq("id", pool.id);
      }

      // 2. Delete remaining user data
      await supabase.from("pool_messages").delete().eq("user_id", uid);
      await supabase.from("bonus_predictions").delete().eq("user_id", uid);
      await supabase.from("predictions").delete().eq("user_id", uid);
      await supabase.from("pool_members").delete().eq("user_id", uid);
      await supabase.from("user_sessions").delete().eq("user_id", uid);
      await supabase.from("user_roles").delete().eq("user_id", uid);
      await supabase.from("profiles").delete().eq("user_id", uid);

      // 3. Delete auth user
      const { error: delErr } = await supabase.auth.admin.deleteUser(uid);
      if (delErr) throw delErr;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: list users
    const limit = Math.min(Math.max(body.action === "list" && body.limit ? body.limit : 100, 1), 500);
    const offset = body.action === "list" && body.offset ? body.offset : 0;
    const page = Math.floor(offset / limit) + 1;

    const { data: userData, error: listErr } = await supabase.auth.admin.listUsers({
      page,
      perPage: limit,
    });
    if (listErr) throw listErr;

    const users = userData?.users || [];
    const ids = users.map((u) => u.id);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, avatar_url, created_at")
      .in("user_id", ids);

    const { data: sessions } = await supabase
      .from("user_sessions")
      .select("user_id, login_at_utc, device_info")
      .in("user_id", ids);

    const { data: memberRows } = await supabase
      .from("pool_members")
      .select("user_id")
      .in("user_id", ids);

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    const sessionAgg = new Map<string, { last_login_at: string | null; login_count: number; last_device: string | null }>();
    (sessions || []).forEach((s: any) => {
      const existing = sessionAgg.get(s.user_id) || { last_login_at: null, login_count: 0, last_device: null };
      existing.login_count += 1;
      if (!existing.last_login_at || new Date(s.login_at_utc) > new Date(existing.last_login_at)) {
        existing.last_login_at = s.login_at_utc;
        existing.last_device = s.device_info || null;
      }
      sessionAgg.set(s.user_id, existing);
    });

    const poolCounts = new Map<string, number>();
    (memberRows || []).forEach((m: any) => {
      poolCounts.set(m.user_id, (poolCounts.get(m.user_id) || 0) + 1);
    });

    const result = users.map((u) => {
      const profile = profileMap.get(u.id);
      const sess = sessionAgg.get(u.id) || { last_login_at: null, login_count: 0, last_device: null };
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        name: profile?.name || u.user_metadata?.name || null,
        avatar_url: profile?.avatar_url || null,
        last_login_at: sess.last_login_at,
        login_count: sess.login_count,
        last_device: sess.last_device,
        pool_count: poolCounts.get(u.id) || 0,
      };
    });

    return new Response(JSON.stringify({ users: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

