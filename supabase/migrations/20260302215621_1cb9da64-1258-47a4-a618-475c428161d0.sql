
-- Public leaderboard: top pools by member count + avg points (no auth required)
CREATE OR REPLACE FUNCTION public.get_public_leaderboard()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'top_pools', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT
          p.id,
          p.name,
          p.privacy,
          t.name AS tenant_name,
          COUNT(pm.id) AS member_count,
          COALESCE(ROUND(AVG(pts.total)::numeric, 1), 0) AS avg_points,
          COALESCE(MAX(pts.total), 0) AS top_score
        FROM public.pools p
        LEFT JOIN public.tenants t ON t.id = p.tenant_id
        JOIN public.pool_members pm ON pm.pool_id = p.id
        LEFT JOIN LATERAL (
          SELECT SUM(COALESCE(pred.points_awarded, 0)) AS total
          FROM public.predictions pred
          WHERE pred.pool_id = p.id AND pred.user_id = pm.user_id
        ) pts ON true
        WHERE p.privacy = 'public'
        GROUP BY p.id, p.name, p.privacy, t.name
        HAVING COUNT(pm.id) >= 3
        ORDER BY COUNT(pm.id) DESC, COALESCE(MAX(pts.total), 0) DESC
        LIMIT 50
      ) t
    ),
    'top_predictors', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT
          pr.name,
          pr.avatar_url,
          SUM(COALESCE(pred.points_awarded, 0)) AS total_points,
          COUNT(*) FILTER (WHERE pred.points_awarded > 0) AS correct_count,
          COUNT(*) FILTER (WHERE m.status = 'finished' AND m.home_score IS NOT NULL
            AND pred.home_pred = m.home_score AND pred.away_pred = m.away_score) AS exact_count
        FROM public.predictions pred
        JOIN public.pool_members pm ON pm.pool_id = pred.pool_id AND pm.user_id = pred.user_id
        JOIN public.pools p ON p.id = pred.pool_id AND p.privacy = 'public'
        JOIN public.profiles pr ON pr.user_id = pred.user_id
        JOIN public.matches m ON m.id = pred.match_id
        WHERE pred.home_pred IS NOT NULL AND pred.away_pred IS NOT NULL
        GROUP BY pr.user_id, pr.name, pr.avatar_url
        HAVING SUM(COALESCE(pred.points_awarded, 0)) > 0
        ORDER BY SUM(COALESCE(pred.points_awarded, 0)) DESC
        LIMIT 50
      ) t
    ),
    'stats', (
      SELECT json_build_object(
        'total_pools', (SELECT count(*) FROM public.pools),
        'total_players', (SELECT count(*) FROM public.profiles),
        'total_predictions', (SELECT count(*) FROM public.predictions)
      )
    )
  ) INTO result;

  RETURN result;
END;
$$;
