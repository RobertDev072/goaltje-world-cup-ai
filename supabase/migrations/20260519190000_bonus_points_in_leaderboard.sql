-- ============================================================
-- Bonuspunten meenemen in het klassement
--
-- Probleem: get_pool_leaderboard telde alleen predictions.points_awarded.
-- Bonusvraag-punten (bonus_predictions.points_awarded, 10 per goede
-- vraag) werden wel berekend door admin_award_bonus_points maar niet
-- in de totaalscore/einduitslag meegeteld.
--
-- Fix: tel per lid de som van bonus_predictions.points_awarded voor
-- deze poule op bij het prediction-totaal. Exposed apart als
-- 'bonusPoints' zodat de UI het kan tonen. Ook de admin-variant.
-- ============================================================

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
      'points', COALESCE(s.total_points, 0) + COALESCE(b.bonus_points, 0),
      'predictionPoints', COALESCE(s.total_points, 0),
      'bonusPoints', COALESCE(b.bonus_points, 0),
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
        SUM(CASE
          WHEN m.kickoff_utc >= CURRENT_DATE
           AND m.kickoff_utc < CURRENT_DATE + INTERVAL '1 day'
           AND m.status = 'finished'
          THEN COALESCE(p.points_awarded, 0)
          ELSE 0
        END) AS today_points,
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
    LEFT JOIN LATERAL (
      SELECT SUM(COALESCE(bp.points_awarded, 0)) AS bonus_points
      FROM public.bonus_predictions bp
      WHERE bp.pool_id = _pool_id AND bp.user_id = pm.user_id
    ) b ON true
    WHERE pm.pool_id = _pool_id
    ORDER BY
      (COALESCE(s.total_points, 0) + COALESCE(b.bonus_points, 0)) DESC,
      COALESCE(s.exact_count, 0) DESC,
      COALESCE(s.correct_results, 0) DESC,
      COALESCE(s.total_correct_goals, 0) DESC,
      s.last_correct_at DESC NULLS LAST
  ) sub;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Admin-variant: zelfde bonus-optelling.
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
    (COALESCE(SUM(pred.points_awarded), 0) + COALESCE(bonus.bonus_points, 0))::bigint AS total_points,
    COUNT(pred.id)::bigint AS pred_count,
    pm.role,
    pm.joined_at
  FROM pool_members pm
  LEFT JOIN profiles pr ON pr.user_id = pm.user_id
  LEFT JOIN predictions pred
    ON pred.user_id = pm.user_id
   AND pred.pool_id = p_pool_id
   AND pred.points_awarded IS NOT NULL
  LEFT JOIN LATERAL (
    SELECT SUM(COALESCE(bp.points_awarded, 0)) AS bonus_points
    FROM bonus_predictions bp
    WHERE bp.pool_id = p_pool_id AND bp.user_id = pm.user_id
  ) bonus ON true
  WHERE pm.pool_id = p_pool_id
  GROUP BY pm.user_id, pr.name, pr.avatar_url, pm.role, pm.joined_at, bonus.bonus_points
  ORDER BY total_points DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_pool_leaderboard(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pool_leaderboard_admin(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
