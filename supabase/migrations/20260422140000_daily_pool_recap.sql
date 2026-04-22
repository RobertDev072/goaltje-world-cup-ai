-- Dagelijkse pool-recap: dagwinnaar + exacte-scorers + grootste verrassing
-- Gebaseerd op wedstrijden die "gisteren" (NL-tijd) zijn afgerond.
-- Returns NULL als er geen afgeronde wedstrijden waren — UI verbergt zich dan.

CREATE OR REPLACE FUNCTION public.get_daily_pool_recap(_pool_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  yesterday_start timestamptz;
  yesterday_end timestamptz;
  match_count int;
  day_winner json;
  exact_scorers json;
  biggest_upset json;
BEGIN
  IF NOT public.is_pool_member(auth.uid(), _pool_id) THEN
    RAISE EXCEPTION 'Not a pool member';
  END IF;

  -- Gisteren in NL-tijd (Europe/Amsterdam), geconverteerd terug naar UTC voor vergelijking
  yesterday_start := (date_trunc('day', (NOW() AT TIME ZONE 'Europe/Amsterdam')) - INTERVAL '1 day') AT TIME ZONE 'Europe/Amsterdam';
  yesterday_end   := date_trunc('day', (NOW() AT TIME ZONE 'Europe/Amsterdam')) AT TIME ZONE 'Europe/Amsterdam';

  SELECT COUNT(*) INTO match_count
  FROM public.matches
  WHERE status = 'finished'
    AND kickoff_utc >= yesterday_start
    AND kickoff_utc <  yesterday_end;

  IF match_count = 0 THEN
    RETURN NULL;
  END IF;

  -- Dagwinnaar: meeste punten verdiend aan de matches van gisteren (skip als iedereen 0 heeft)
  SELECT json_build_object(
    'userId', top.uid,
    'name', COALESCE(pr.name, 'Onbekend'),
    'points', top.total_pts
  ) INTO day_winner
  FROM (
    SELECT p.user_id AS uid, SUM(COALESCE(p.points_awarded, 0)) AS total_pts
    FROM public.predictions p
    JOIN public.matches m ON m.id = p.match_id
    WHERE p.pool_id = _pool_id
      AND m.status = 'finished'
      AND m.kickoff_utc >= yesterday_start
      AND m.kickoff_utc <  yesterday_end
    GROUP BY p.user_id
    HAVING SUM(COALESCE(p.points_awarded, 0)) > 0
    ORDER BY SUM(COALESCE(p.points_awarded, 0)) DESC, p.user_id
    LIMIT 1
  ) top
  LEFT JOIN public.profiles pr ON pr.user_id = top.uid;

  -- Exacte scorers (tot 5) — namen + welke match + exacte uitslag
  SELECT json_agg(row_data)
  INTO exact_scorers
  FROM (
    SELECT json_build_object(
      'userId', p.user_id,
      'name', COALESCE(pr.name, 'Onbekend'),
      'homeShort', ht.short_name,
      'awayShort', ta.short_name,
      'score', concat(m.home_score, '-', m.away_score)
    ) AS row_data
    FROM public.predictions p
    JOIN public.matches m ON m.id = p.match_id
    LEFT JOIN public.teams ht ON ht.id = m.home_team_id
    LEFT JOIN public.teams ta ON ta.id = m.away_team_id
    LEFT JOIN public.profiles pr ON pr.user_id = p.user_id
    WHERE p.pool_id = _pool_id
      AND m.status = 'finished'
      AND m.kickoff_utc >= yesterday_start
      AND m.kickoff_utc <  yesterday_end
      AND p.home_pred = m.home_score
      AND p.away_pred = m.away_score
    LIMIT 5
  ) t;

  -- Grootste verrassing: afgeronde match waar poule-consensus verkeerd zat, met hoogste consensus-% (meest "zeker" maar fout)
  WITH match_consensus AS (
    SELECT
      m.id,
      m.home_score,
      m.away_score,
      ht.short_name AS home_short,
      ta.short_name AS away_short,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE p.home_pred > p.away_pred) AS home_wins,
      COUNT(*) FILTER (WHERE p.home_pred = p.away_pred) AS draws,
      COUNT(*) FILTER (WHERE p.home_pred < p.away_pred) AS away_wins
    FROM public.matches m
    LEFT JOIN public.teams ht ON ht.id = m.home_team_id
    LEFT JOIN public.teams ta ON ta.id = m.away_team_id
    JOIN public.predictions p ON p.match_id = m.id
      AND p.pool_id = _pool_id
      AND p.home_pred IS NOT NULL
      AND p.away_pred IS NOT NULL
    WHERE m.status = 'finished'
      AND m.kickoff_utc >= yesterday_start
      AND m.kickoff_utc <  yesterday_end
    GROUP BY m.id, m.home_score, m.away_score, ht.short_name, ta.short_name
    HAVING COUNT(*) >= 2
  ),
  match_surprise AS (
    SELECT
      home_short,
      away_short,
      home_score,
      away_score,
      CASE
        WHEN home_score > away_score THEN 'home'
        WHEN home_score = away_score THEN 'draw'
        ELSE 'away'
      END AS actual,
      CASE
        WHEN home_wins >= draws AND home_wins >= away_wins THEN 'home'
        WHEN draws >= home_wins AND draws >= away_wins THEN 'draw'
        ELSE 'away'
      END AS consensus,
      GREATEST(home_wins, draws, away_wins)::float / total AS consensus_pct
    FROM match_consensus
  )
  SELECT json_build_object(
    'homeShort', home_short,
    'awayShort', away_short,
    'score', concat(home_score, '-', away_score),
    'consensusPct', round(consensus_pct * 100)::int
  ) INTO biggest_upset
  FROM match_surprise
  WHERE actual <> consensus
  ORDER BY consensus_pct DESC
  LIMIT 1;

  result := json_build_object(
    'matchCount', match_count,
    'dayWinner', day_winner,
    'exactScorers', COALESCE(exact_scorers, '[]'::json),
    'biggestUpset', biggest_upset
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_daily_pool_recap(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
