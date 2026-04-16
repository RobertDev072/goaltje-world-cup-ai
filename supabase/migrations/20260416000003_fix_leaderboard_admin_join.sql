-- Fix get_pool_leaderboard_admin: profiles join via user_id ipv id
CREATE OR REPLACE FUNCTION public.get_pool_leaderboard_admin(p_pool_id uuid)
RETURNS TABLE(
  user_id        uuid,
  name           text,
  avatar_url     text,
  total_points   bigint,
  pred_count     bigint,
  role           text,
  joined_at      timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    pm.user_id,
    pr.name,
    pr.avatar_url,
    COALESCE(SUM(pred.points_awarded), 0)::bigint AS total_points,
    COUNT(pred.id)::bigint AS pred_count,
    pm.role,
    pm.joined_at
  FROM pool_members pm
  LEFT JOIN profiles pr ON pr.user_id = pm.user_id
  LEFT JOIN predictions pred
    ON pred.user_id = pm.user_id
   AND pred.pool_id = p_pool_id
   AND pred.points_awarded IS NOT NULL
  WHERE pm.pool_id = p_pool_id
  GROUP BY pm.user_id, pr.name, pr.avatar_url, pm.role, pm.joined_at
  ORDER BY total_points DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_pool_leaderboard_admin(uuid) TO authenticated;
