-- Voorspeller-profiel RPC: aggregaties over alle voorspellingen van een user,
-- incl. huidige correct-streak en afgeleid hoofdprofiel (Exact-master / Aanvaller / Voorzichtige etc.).
-- Zichtbaar voor de user zelf; voor anderen alleen als ze een gezamenlijke pool delen.

CREATE OR REPLACE FUNCTION public.get_user_predictor_profile(_user_id uuid)
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
  draw_rate numeric;
  exact_count int;
  correct_count int;
  finished_count int;
  accuracy numeric;
  current_streak int;
  profile_type text;
  profile_label text;
  profile_emoji text;
  profile_desc text;
BEGIN
  -- Access check
  IF auth.uid() <> _user_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.pool_members pm1
      JOIN public.pool_members pm2 ON pm2.pool_id = pm1.pool_id
      WHERE pm1.user_id = auth.uid() AND pm2.user_id = _user_id
    ) THEN
      RAISE EXCEPTION 'Not allowed';
    END IF;
  END IF;

  -- Basis-aggregaties over alle voorspellingen
  SELECT
    COUNT(*) FILTER (WHERE home_pred IS NOT NULL AND away_pred IS NOT NULL),
    AVG(home_pred + away_pred) FILTER (WHERE home_pred IS NOT NULL AND away_pred IS NOT NULL),
    AVG(CASE WHEN home_pred = away_pred THEN 1.0 ELSE 0.0 END) FILTER (WHERE home_pred IS NOT NULL AND away_pred IS NOT NULL)
  INTO total_preds, avg_goals, draw_rate
  FROM public.predictions
  WHERE user_id = _user_id;

  -- Tellers op afgeronde wedstrijden
  SELECT
    COUNT(*) FILTER (WHERE p.home_pred = m.home_score AND p.away_pred = m.away_score),
    COUNT(*) FILTER (WHERE COALESCE(p.points_awarded, 0) > 0),
    COUNT(*)
  INTO exact_count, correct_count, finished_count
  FROM public.predictions p
  JOIN public.matches m ON m.id = p.match_id
  WHERE p.user_id = _user_id
    AND m.status = 'finished'
    AND p.home_pred IS NOT NULL
    AND p.away_pred IS NOT NULL;

  accuracy := CASE WHEN finished_count > 0 THEN correct_count::numeric / finished_count ELSE 0 END;

  -- Huidige streak: aantal opeenvolgende correcte voorspellingen vanaf meest recente match
  WITH ordered AS (
    SELECT
      COALESCE(p.points_awarded, 0) > 0 AS is_correct,
      ROW_NUMBER() OVER (ORDER BY m.kickoff_utc DESC) AS rn
    FROM public.predictions p
    JOIN public.matches m ON m.id = p.match_id
    WHERE p.user_id = _user_id
      AND m.status = 'finished'
      AND p.home_pred IS NOT NULL
      AND p.away_pred IS NOT NULL
  ),
  first_wrong AS (
    SELECT MIN(rn) AS rn FROM ordered WHERE NOT is_correct
  )
  SELECT COALESCE((SELECT rn FROM first_wrong), (SELECT COUNT(*) FROM ordered) + 1) - 1
  INTO current_streak;

  -- Hoofdprofiel bepalen (priority-geordend)
  IF total_preds < 3 THEN
    profile_type := 'new';
    profile_label := 'Nieuwe voorspeller';
    profile_emoji := '🌱';
    profile_desc := 'Vul meer voorspellingen in om je profiel te ontgrendelen';
  ELSIF exact_count >= 3 THEN
    profile_type := 'exact_master';
    profile_label := 'Exact-master';
    profile_emoji := '🎯';
    profile_desc := format('%s exacte voorspellingen — jij ziet scores precies', exact_count);
  ELSIF avg_goals > 3.0 THEN
    profile_type := 'attacker';
    profile_label := 'Aanvaller';
    profile_emoji := '⚡';
    profile_desc := format('Gemiddeld %s goals per match — jij verwacht spektakel', round(avg_goals, 1));
  ELSIF draw_rate > 0.25 THEN
    profile_type := 'draw_king';
    profile_label := 'Gelijkspel-koning';
    profile_emoji := '🤝';
    profile_desc := format('%s%% van je voorspellingen is gelijkspel', round(draw_rate * 100));
  ELSIF avg_goals < 2.0 AND total_preds >= 5 THEN
    profile_type := 'defender';
    profile_label := 'Voorzichtige';
    profile_emoji := '🛡️';
    profile_desc := 'Jij voorspelt behoudende scores';
  ELSE
    profile_type := 'balanced';
    profile_label := 'Evenwichtig';
    profile_emoji := '⚖️';
    profile_desc := 'Gebalanceerd voorspel-profiel';
  END IF;

  result := json_build_object(
    'totalPredictions', total_preds,
    'finishedCount', finished_count,
    'avgGoals', round(COALESCE(avg_goals, 0), 1),
    'drawRatePct', round(COALESCE(draw_rate, 0) * 100)::int,
    'exactCount', exact_count,
    'correctCount', correct_count,
    'accuracyPct', round(accuracy * 100)::int,
    'currentStreak', current_streak,
    'profile', json_build_object(
      'type', profile_type,
      'label', profile_label,
      'emoji', profile_emoji,
      'description', profile_desc
    )
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_predictor_profile(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
