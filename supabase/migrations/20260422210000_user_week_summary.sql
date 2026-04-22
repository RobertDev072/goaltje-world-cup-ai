-- Week-samenvatting: punten / rang-delta / exacten / gemist over laatste 7 dagen (in een specifieke pool).

CREATE OR REPLACE FUNCTION public.get_user_week_summary(_pool_id uuid, _user_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  week_points int;
  exact_count int;
  missed_count int;
  rank_now int;
  rank_7d_ago int;
  rank_delta int;
  week_start timestamptz;
BEGIN
  IF NOT public.is_pool_member(auth.uid(), _pool_id) THEN
    RAISE EXCEPTION 'Not a pool member';
  END IF;

  week_start := (NOW() - INTERVAL '7 days');

  -- Punten binnengehaald laatste 7 dagen
  SELECT
    COALESCE(SUM(COALESCE(p.points_awarded, 0)), 0),
    COUNT(*) FILTER (WHERE p.home_pred = m.home_score AND p.away_pred = m.away_score),
    COUNT(*) FILTER (WHERE m.status = 'finished' AND (p.home_pred IS NULL OR p.away_pred IS NULL))
  INTO week_points, exact_count, missed_count
  FROM public.predictions p
  JOIN public.matches m ON m.id = p.match_id
  WHERE p.pool_id = _pool_id
    AND p.user_id = _user_id
    AND m.status = 'finished'
    AND m.kickoff_utc >= week_start;

  -- Ook matches die voorbij zijn zonder voorspelling tellen als gemist
  SELECT missed_count + COUNT(*)
  INTO missed_count
  FROM public.matches m
  WHERE m.status = 'finished'
    AND m.kickoff_utc >= week_start
    AND NOT EXISTS (
      SELECT 1 FROM public.predictions p
      WHERE p.match_id = m.id AND p.user_id = _user_id AND p.pool_id = _pool_id
    );

  -- Rang nu
  WITH current_totals AS (
    SELECT
      pm.user_id,
      COALESCE(SUM(COALESCE(p.points_awarded, 0)), 0) AS total_pts
    FROM public.pool_members pm
    LEFT JOIN public.predictions p ON p.user_id = pm.user_id AND p.pool_id = _pool_id
    LEFT JOIN public.matches m ON m.id = p.match_id AND m.status = 'finished'
    WHERE pm.pool_id = _pool_id
    GROUP BY pm.user_id
  ),
  current_ranked AS (
    SELECT user_id, RANK() OVER (ORDER BY total_pts DESC) AS rnk
    FROM current_totals
  )
  SELECT rnk INTO rank_now FROM current_ranked WHERE user_id = _user_id;

  -- Rang 7 dagen geleden (cumulatief tot week_start)
  WITH old_totals AS (
    SELECT
      pm.user_id,
      COALESCE(SUM(
        CASE
          WHEN m.status = 'finished' AND m.kickoff_utc < week_start
          THEN COALESCE(p.points_awarded, 0)
          ELSE 0
        END
      ), 0) AS total_pts
    FROM public.pool_members pm
    LEFT JOIN public.predictions p ON p.user_id = pm.user_id AND p.pool_id = _pool_id
    LEFT JOIN public.matches m ON m.id = p.match_id
    WHERE pm.pool_id = _pool_id
    GROUP BY pm.user_id
  ),
  old_ranked AS (
    SELECT user_id, RANK() OVER (ORDER BY total_pts DESC) AS rnk
    FROM old_totals
  )
  SELECT rnk INTO rank_7d_ago FROM old_ranked WHERE user_id = _user_id;

  rank_delta := COALESCE(rank_7d_ago, 0) - COALESCE(rank_now, 0);

  result := json_build_object(
    'weekPoints', week_points,
    'exactCount', exact_count,
    'missedCount', missed_count,
    'rankNow', rank_now,
    'rankDelta', rank_delta
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_week_summary(uuid, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
