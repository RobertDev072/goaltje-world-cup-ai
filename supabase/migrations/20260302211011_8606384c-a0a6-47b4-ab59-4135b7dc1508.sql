
-- Performance indexes for enterprise-scale pools
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON public.predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match_id ON public.predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_predictions_pool_id ON public.predictions(pool_id);
CREATE INDEX IF NOT EXISTS idx_predictions_pool_match ON public.predictions(pool_id, match_id);
CREATE INDEX IF NOT EXISTS idx_predictions_pool_user ON public.predictions(pool_id, user_id);
CREATE INDEX IF NOT EXISTS idx_pool_members_pool_id ON public.pool_members(pool_id);
CREATE INDEX IF NOT EXISTS idx_pool_members_user_id ON public.pool_members(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_kickoff ON public.matches(kickoff_utc);

-- Leaderboard function: returns sorted leaderboard for a pool efficiently
CREATE OR REPLACE FUNCTION public.get_pool_leaderboard(_pool_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- Verify caller is pool member
  IF NOT public.is_pool_member(auth.uid(), _pool_id) THEN
    RAISE EXCEPTION 'Not a pool member';
  END IF;

  SELECT json_agg(row_order)
  INTO result
  FROM (
    SELECT json_build_object(
      'userId', pm.user_id,
      'name', COALESCE(pr.name, 'Onbekend'),
      'avatar_url', pr.avatar_url,
      'role', pm.role,
      'points', COALESCE(s.total_points, 0),
      'todayPoints', COALESCE(s.today_points, 0),
      'exactCount', COALESCE(s.exact_count, 0),
      'correctResults', COALESCE(s.correct_results, 0),
      'totalCorrectGoals', COALESCE(s.total_correct_goals, 0),
      'lastCorrectAt', s.last_correct_at
    ) AS row_order
    FROM public.pool_members pm
    LEFT JOIN public.profiles pr ON pr.user_id = pm.user_id
    LEFT JOIN LATERAL (
      SELECT
        SUM(COALESCE(p.points_awarded, 0)) AS total_points,
        SUM(CASE WHEN m.kickoff_utc >= CURRENT_DATE THEN COALESCE(p.points_awarded, 0) ELSE 0 END) AS today_points,
        COUNT(*) FILTER (WHERE m.status = 'finished' AND m.home_score IS NOT NULL AND m.away_score IS NOT NULL
          AND p.home_pred = m.home_score AND p.away_pred = m.away_score) AS exact_count,
        COUNT(*) FILTER (WHERE p.points_awarded > 0) AS correct_results,
        SUM(CASE WHEN p.points_awarded > 0 AND m.status = 'finished' AND m.home_score IS NOT NULL AND m.away_score IS NOT NULL THEN
          (CASE WHEN p.home_pred = m.home_score THEN 1 ELSE 0 END) +
          (CASE WHEN p.away_pred = m.away_score THEN 1 ELSE 0 END)
        ELSE 0 END) AS total_correct_goals,
        MAX(CASE WHEN p.points_awarded > 0 THEN p.updated_at ELSE NULL END) AS last_correct_at
      FROM public.predictions p
      JOIN public.matches m ON m.id = p.match_id
      WHERE p.pool_id = _pool_id AND p.user_id = pm.user_id
        AND p.home_pred IS NOT NULL AND p.away_pred IS NOT NULL
    ) s ON true
    WHERE pm.pool_id = _pool_id
    ORDER BY
      COALESCE(s.total_points, 0) DESC,
      COALESCE(s.exact_count, 0) DESC,
      COALESCE(s.correct_results, 0) DESC,
      COALESCE(s.total_correct_goals, 0) DESC,
      s.last_correct_at ASC NULLS LAST
  ) sub;

  RETURN COALESCE(result, '[]'::json);
END;
$$;
