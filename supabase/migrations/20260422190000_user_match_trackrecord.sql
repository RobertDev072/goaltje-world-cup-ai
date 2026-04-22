-- Persoonlijke trackrecord voor een specifieke match: accuratesse bij dezelfde
-- toernooifase + bij matches met thuis- of uit-team.
-- Eigenaar-only: alleen de user zelf mag z'n trackrecord zien.

CREATE OR REPLACE FUNCTION public.get_user_match_trackrecord(
  _user_id uuid,
  _match_id uuid
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  match_stage text;
  home_team uuid;
  away_team uuid;
  stage_correct int;
  stage_total int;
  home_correct int;
  home_total int;
  away_correct int;
  away_total int;
BEGIN
  IF auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT stage, home_team_id, away_team_id
  INTO match_stage, home_team, away_team
  FROM public.matches
  WHERE id = _match_id;

  IF match_stage IS NULL THEN
    RETURN NULL;
  END IF;

  -- Accuratesse bij alle ANDERE matches van dezelfde toernooifase
  SELECT
    COUNT(*) FILTER (WHERE COALESCE(p.points_awarded, 0) > 0),
    COUNT(*)
  INTO stage_correct, stage_total
  FROM public.predictions p
  JOIN public.matches m ON m.id = p.match_id
  WHERE p.user_id = _user_id
    AND m.status = 'finished'
    AND m.stage = match_stage
    AND m.id <> _match_id
    AND p.home_pred IS NOT NULL
    AND p.away_pred IS NOT NULL;

  -- Accuratesse bij matches waar het thuis-team ook speelde
  SELECT
    COUNT(*) FILTER (WHERE COALESCE(p.points_awarded, 0) > 0),
    COUNT(*)
  INTO home_correct, home_total
  FROM public.predictions p
  JOIN public.matches m ON m.id = p.match_id
  WHERE p.user_id = _user_id
    AND m.status = 'finished'
    AND (m.home_team_id = home_team OR m.away_team_id = home_team)
    AND m.id <> _match_id
    AND p.home_pred IS NOT NULL
    AND p.away_pred IS NOT NULL;

  -- Accuratesse bij matches waar het uit-team ook speelde
  SELECT
    COUNT(*) FILTER (WHERE COALESCE(p.points_awarded, 0) > 0),
    COUNT(*)
  INTO away_correct, away_total
  FROM public.predictions p
  JOIN public.matches m ON m.id = p.match_id
  WHERE p.user_id = _user_id
    AND m.status = 'finished'
    AND (m.home_team_id = away_team OR m.away_team_id = away_team)
    AND m.id <> _match_id
    AND p.home_pred IS NOT NULL
    AND p.away_pred IS NOT NULL;

  result := json_build_object(
    'stage', match_stage,
    'stageCorrect', stage_correct,
    'stageTotal', stage_total,
    'stagePct', CASE WHEN stage_total > 0 THEN round((stage_correct::numeric / stage_total) * 100)::int ELSE NULL END,
    'homeTeamCorrect', home_correct,
    'homeTeamTotal', home_total,
    'awayTeamCorrect', away_correct,
    'awayTeamTotal', away_total
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_match_trackrecord(uuid, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
