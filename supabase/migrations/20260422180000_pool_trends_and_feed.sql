-- Pool-wide trends (cijfers over de hele poule) + recap-feed (laatste N dagen highlights).
-- Alles afgeleid uit bestaande predictions + matches.

-- 1. Pool-trends: gem. voorspelde goals, draw-ratio, upset-teller, populairste uitslag, stemming
CREATE OR REPLACE FUNCTION public.get_pool_trends(_pool_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  total_preds int;
  avg_goals numeric;
  draw_rate_pct int;
  most_voted_score text;
  upset_count int;
  mood_label text;
BEGIN
  IF NOT public.is_pool_member(auth.uid(), _pool_id) THEN
    RAISE EXCEPTION 'Not a pool member';
  END IF;

  -- Basis-aggregaties
  SELECT
    COUNT(*) FILTER (WHERE home_pred IS NOT NULL AND away_pred IS NOT NULL),
    AVG(home_pred + away_pred) FILTER (WHERE home_pred IS NOT NULL AND away_pred IS NOT NULL),
    round(AVG(CASE WHEN home_pred = away_pred THEN 100.0 ELSE 0.0 END) FILTER (WHERE home_pred IS NOT NULL AND away_pred IS NOT NULL))::int
  INTO total_preds, avg_goals, draw_rate_pct
  FROM public.predictions
  WHERE pool_id = _pool_id;

  -- Populairste (home, away) uitslag over alle predictions
  SELECT concat(home_pred, '-', away_pred)
  INTO most_voted_score
  FROM public.predictions
  WHERE pool_id = _pool_id
    AND home_pred IS NOT NULL
    AND away_pred IS NOT NULL
  GROUP BY home_pred, away_pred
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- Upset-teller: afgeronde matches waar consensus faalde
  WITH match_consensus AS (
    SELECT
      m.id,
      m.home_score, m.away_score,
      COUNT(*) FILTER (WHERE p.home_pred > p.away_pred) AS hw,
      COUNT(*) FILTER (WHERE p.home_pred = p.away_pred) AS dr,
      COUNT(*) FILTER (WHERE p.home_pred < p.away_pred) AS aw
    FROM public.matches m
    JOIN public.predictions p ON p.match_id = m.id
      AND p.pool_id = _pool_id
      AND p.home_pred IS NOT NULL
      AND p.away_pred IS NOT NULL
    WHERE m.status = 'finished'
    GROUP BY m.id, m.home_score, m.away_score
    HAVING COUNT(*) >= 2
  )
  SELECT COUNT(*)
  INTO upset_count
  FROM match_consensus
  WHERE (CASE WHEN home_score > away_score THEN 'home'
              WHEN home_score = away_score THEN 'draw'
              ELSE 'away' END) <>
        (CASE WHEN hw >= dr AND hw >= aw THEN 'home'
              WHEN dr >= hw AND dr >= aw THEN 'draw'
              ELSE 'away' END);

  -- Stemming
  mood_label := CASE
    WHEN avg_goals IS NULL THEN 'neutraal'
    WHEN avg_goals > 3.0 THEN 'aanvallend'
    WHEN avg_goals < 2.0 THEN 'behoudend'
    ELSE 'neutraal'
  END;

  result := json_build_object(
    'totalPredictions', COALESCE(total_preds, 0),
    'avgGoals', round(COALESCE(avg_goals, 0), 1),
    'drawRatePct', COALESCE(draw_rate_pct, 0),
    'upsetCount', COALESCE(upset_count, 0),
    'mostVotedScore', COALESCE(most_voted_score, '—'),
    'mood', mood_label
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pool_trends(uuid) TO authenticated;

-- 2. Recap-feed: per dag in de laatste N dagen een highlight
CREATE OR REPLACE FUNCTION public.get_pool_recap_feed(_pool_id uuid, _days int DEFAULT 7)
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

  WITH day_matches AS (
    -- Afgeronde matches in de laatste N dagen (NL-tijd)
    SELECT
      (m.kickoff_utc AT TIME ZONE 'Europe/Amsterdam')::date AS day,
      m.id AS match_id,
      m.home_score, m.away_score,
      ht.short_name AS home_short,
      ta.short_name AS away_short
    FROM public.matches m
    LEFT JOIN public.teams ht ON ht.id = m.home_team_id
    LEFT JOIN public.teams ta ON ta.id = m.away_team_id
    WHERE m.status = 'finished'
      AND m.kickoff_utc >= (CURRENT_DATE - _days)::timestamp AT TIME ZONE 'Europe/Amsterdam'
  ),
  day_winners AS (
    -- Dagwinnaar per dag: hoogste totaal points_awarded die dag
    SELECT DISTINCT ON (day)
      day,
      p.user_id AS uid,
      pr.name AS winner_name,
      SUM(COALESCE(p.points_awarded, 0)) AS winner_points
    FROM day_matches dm
    JOIN public.predictions p ON p.match_id = dm.match_id AND p.pool_id = _pool_id
    LEFT JOIN public.profiles pr ON pr.user_id = p.user_id
    GROUP BY day, p.user_id, pr.name
    HAVING SUM(COALESCE(p.points_awarded, 0)) > 0
    ORDER BY day, SUM(COALESCE(p.points_awarded, 0)) DESC, p.user_id
  ),
  day_upsets AS (
    -- Grootste upset per dag
    WITH per_match AS (
      SELECT
        dm.day,
        dm.home_short,
        dm.away_short,
        dm.home_score, dm.away_score,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE p.home_pred > p.away_pred) AS hw,
        COUNT(*) FILTER (WHERE p.home_pred = p.away_pred) AS dr,
        COUNT(*) FILTER (WHERE p.home_pred < p.away_pred) AS aw
      FROM day_matches dm
      JOIN public.predictions p ON p.match_id = dm.match_id
        AND p.pool_id = _pool_id
        AND p.home_pred IS NOT NULL
        AND p.away_pred IS NOT NULL
      GROUP BY dm.day, dm.home_short, dm.away_short, dm.home_score, dm.away_score
      HAVING COUNT(*) >= 2
    )
    SELECT DISTINCT ON (day)
      day,
      home_short,
      away_short,
      concat(home_score, '-', away_score) AS score,
      GREATEST(hw, dr, aw)::float / total AS consensus_pct
    FROM per_match
    WHERE (CASE WHEN home_score > away_score THEN 'home'
                WHEN home_score = away_score THEN 'draw'
                ELSE 'away' END) <>
          (CASE WHEN hw >= dr AND hw >= aw THEN 'home'
                WHEN dr >= hw AND dr >= aw THEN 'draw'
                ELSE 'away' END)
    ORDER BY day, consensus_pct DESC
  ),
  days_summary AS (
    SELECT
      dm.day,
      COUNT(DISTINCT dm.match_id) AS match_count
    FROM day_matches dm
    GROUP BY dm.day
  )
  SELECT json_agg(row_data ORDER BY day DESC)
  INTO result
  FROM (
    SELECT
      ds.day,
      json_build_object(
        'date', ds.day,
        'matchCount', ds.match_count,
        'winner', CASE WHEN dw.winner_name IS NOT NULL THEN
          json_build_object('name', dw.winner_name, 'points', dw.winner_points)
          ELSE NULL END,
        'upset', CASE WHEN du.score IS NOT NULL THEN
          json_build_object(
            'homeShort', du.home_short,
            'awayShort', du.away_short,
            'score', du.score,
            'consensusPct', round(du.consensus_pct * 100)::int
          )
          ELSE NULL END
      ) AS row_data,
      ds.day AS day
    FROM days_summary ds
    LEFT JOIN day_winners dw ON dw.day = ds.day
    LEFT JOIN day_upsets du ON du.day = ds.day
  ) t;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pool_recap_feed(uuid, int) TO authenticated;

NOTIFY pgrst, 'reload schema';
