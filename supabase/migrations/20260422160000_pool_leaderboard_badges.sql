-- Badges per pool-lid: streak (consecutive correct) + profiel-type.
-- Eén RPC voor de hele pool, geen N+1. Gebruikt door PoolRanking voor badges in de lijst.

CREATE OR REPLACE FUNCTION public.get_pool_leaderboard_badges(_pool_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT public.is_pool_member(auth.uid(), _pool_id) THEN
    RAISE EXCEPTION 'Not a pool member';
  END IF;

  WITH pool_users AS (
    SELECT user_id FROM public.pool_members WHERE pool_id = _pool_id
  ),
  user_preds AS (
    SELECT
      p.user_id,
      COALESCE(p.points_awarded, 0) > 0 AS is_correct,
      ROW_NUMBER() OVER (PARTITION BY p.user_id ORDER BY m.kickoff_utc DESC) AS rn
    FROM public.predictions p
    JOIN public.matches m ON m.id = p.match_id
    WHERE p.pool_id = _pool_id
      AND m.status = 'finished'
      AND p.home_pred IS NOT NULL
      AND p.away_pred IS NOT NULL
  ),
  user_streak AS (
    SELECT
      user_id,
      COALESCE(MIN(rn) FILTER (WHERE NOT is_correct), COUNT(*) + 1) - 1 AS streak
    FROM user_preds
    GROUP BY user_id
  ),
  user_aggs AS (
    SELECT
      p.user_id,
      COUNT(*) FILTER (WHERE p.home_pred IS NOT NULL AND p.away_pred IS NOT NULL) AS total_preds,
      AVG(p.home_pred + p.away_pred) FILTER (WHERE p.home_pred IS NOT NULL AND p.away_pred IS NOT NULL) AS avg_goals,
      AVG(CASE WHEN p.home_pred = p.away_pred THEN 1.0 ELSE 0.0 END) FILTER (WHERE p.home_pred IS NOT NULL AND p.away_pred IS NOT NULL) AS draw_rate,
      COUNT(*) FILTER (WHERE m.status = 'finished' AND p.home_pred = m.home_score AND p.away_pred = m.away_score) AS exact_count
    FROM public.predictions p
    LEFT JOIN public.matches m ON m.id = p.match_id
    WHERE p.pool_id = _pool_id
    GROUP BY p.user_id
  )
  SELECT json_agg(json_build_object(
    'userId', pu.user_id,
    'streak', COALESCE(us.streak, 0),
    'profileType', CASE
      WHEN COALESCE(ua.total_preds, 0) < 3 THEN 'new'
      WHEN COALESCE(ua.exact_count, 0) >= 3 THEN 'exact_master'
      WHEN COALESCE(ua.avg_goals, 0) > 3.0 THEN 'attacker'
      WHEN COALESCE(ua.draw_rate, 0) > 0.25 THEN 'draw_king'
      WHEN COALESCE(ua.avg_goals, 0) < 2.0 AND COALESCE(ua.total_preds, 0) >= 5 THEN 'defender'
      ELSE 'balanced'
    END,
    'profileEmoji', CASE
      WHEN COALESCE(ua.total_preds, 0) < 3 THEN '🌱'
      WHEN COALESCE(ua.exact_count, 0) >= 3 THEN '🎯'
      WHEN COALESCE(ua.avg_goals, 0) > 3.0 THEN '⚡'
      WHEN COALESCE(ua.draw_rate, 0) > 0.25 THEN '🤝'
      WHEN COALESCE(ua.avg_goals, 0) < 2.0 AND COALESCE(ua.total_preds, 0) >= 5 THEN '🛡️'
      ELSE '⚖️'
    END
  ))
  INTO result
  FROM pool_users pu
  LEFT JOIN user_streak us ON us.user_id = pu.user_id
  LEFT JOIN user_aggs ua ON ua.user_id = pu.user_id;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pool_leaderboard_badges(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
