-- Profile analytics: rang-evolutie (per pool, laatste N dagen) + per-fase accuratesse (globaal).
-- Live berekend, geen snapshot-tabel. Voor 300 leden × 14 dagen = 4200 rijen, prima.

-- 1. Rang-evolutie voor een user in een specifieke poule, over de laatste N dagen
CREATE OR REPLACE FUNCTION public.get_user_rank_evolution(_pool_id uuid, _user_id uuid, _days int DEFAULT 14)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- Alleen pool-leden
  IF NOT public.is_pool_member(auth.uid(), _pool_id) THEN
    RAISE EXCEPTION 'Not a pool member';
  END IF;

  WITH days AS (
    SELECT generate_series(
      (CURRENT_DATE - (_days - 1))::date,
      CURRENT_DATE,
      '1 day'::interval
    )::date AS day
  ),
  user_day_points AS (
    SELECT
      d.day,
      pm.user_id,
      COALESCE(SUM(
        CASE
          WHEN (m.kickoff_utc AT TIME ZONE 'Europe/Amsterdam')::date <= d.day
               AND m.status = 'finished'
          THEN COALESCE(p.points_awarded, 0)
          ELSE 0
        END
      ), 0) AS cum_points
    FROM days d
    CROSS JOIN public.pool_members pm
    LEFT JOIN public.predictions p ON p.user_id = pm.user_id AND p.pool_id = _pool_id
    LEFT JOIN public.matches m ON m.id = p.match_id
    WHERE pm.pool_id = _pool_id
    GROUP BY d.day, pm.user_id
  ),
  ranked AS (
    SELECT
      day,
      user_id,
      cum_points,
      RANK() OVER (PARTITION BY day ORDER BY cum_points DESC) AS rank
    FROM user_day_points
  )
  SELECT json_agg(json_build_object(
    'date', day,
    'rank', rank,
    'points', cum_points
  ) ORDER BY day)
  INTO result
  FROM ranked
  WHERE user_id = _user_id;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_rank_evolution(uuid, uuid, int) TO authenticated;

-- 2. Per-fase accuratesse voor een user (globaal, alle pools)
CREATE OR REPLACE FUNCTION public.get_user_stage_accuracy(_user_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- Eigen profiel, of gedeelde pool
  IF auth.uid() <> _user_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.pool_members pm1
      JOIN public.pool_members pm2 ON pm2.pool_id = pm1.pool_id
      WHERE pm1.user_id = auth.uid() AND pm2.user_id = _user_id
    ) THEN
      RAISE EXCEPTION 'Not allowed';
    END IF;
  END IF;

  SELECT json_agg(json_build_object(
    'stage', stage,
    'stageLabel', stage_label,
    'correct', correct_count,
    'total', total_count,
    'pct', CASE WHEN total_count > 0 THEN round((correct_count::numeric / total_count) * 100)::int ELSE 0 END
  ) ORDER BY stage_order)
  INTO result
  FROM (
    SELECT
      m.stage,
      CASE m.stage
        WHEN 'group' THEN 'Groepsfase'
        WHEN 'round_of_32' THEN 'Laatste 32'
        WHEN 'round_of_16' THEN 'Laatste 16'
        WHEN 'quarter_final' THEN 'Kwartfinale'
        WHEN 'semi_final' THEN 'Halve finale'
        WHEN 'third_place' THEN '3e/4e plaats'
        WHEN 'final' THEN 'Finale'
        ELSE m.stage
      END AS stage_label,
      CASE m.stage
        WHEN 'group' THEN 1
        WHEN 'round_of_32' THEN 2
        WHEN 'round_of_16' THEN 3
        WHEN 'quarter_final' THEN 4
        WHEN 'semi_final' THEN 5
        WHEN 'third_place' THEN 6
        WHEN 'final' THEN 7
        ELSE 99
      END AS stage_order,
      COUNT(*) FILTER (WHERE COALESCE(p.points_awarded, 0) > 0) AS correct_count,
      COUNT(*) AS total_count
    FROM public.predictions p
    JOIN public.matches m ON m.id = p.match_id
    WHERE p.user_id = _user_id
      AND m.status = 'finished'
      AND p.home_pred IS NOT NULL
      AND p.away_pred IS NOT NULL
    GROUP BY m.stage
    HAVING COUNT(*) > 0
  ) s;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_stage_accuracy(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
