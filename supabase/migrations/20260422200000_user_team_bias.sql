-- Team-bias RPC: vergelijkt per team de gemiddelde voorspelde goals van de user
-- met de werkelijke gemiddelde goals in afgeronde matches.
-- Retourneert top 3 overschatte en top 3 onderschatte teams.

CREATE OR REPLACE FUNCTION public.get_user_team_bias(_user_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  overestimated json;
  underestimated json;
BEGIN
  IF auth.uid() <> _user_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.pool_members pm1
      JOIN public.pool_members pm2 ON pm2.pool_id = pm1.pool_id
      WHERE pm1.user_id = auth.uid() AND pm2.user_id = _user_id
    ) THEN
      RAISE EXCEPTION 'Not allowed';
    END IF;
  END IF;

  -- Per team: vergelijk voorspelde vs werkelijke goals voor dat team.
  -- Een user kan meerdere predictions voor hetzelfde team hebben (thuis of uit).
  -- We aggregeren over alle matches waarin dat team speelde.
  WITH team_stats AS (
    SELECT
      t.id AS team_id,
      t.short_name,
      t.name AS team_name,
      -- Gemiddelde voorspelde goals VOOR dit team (home_pred als team thuis speelde, away_pred als uit)
      AVG(CASE
        WHEN m.home_team_id = t.id THEN p.home_pred
        WHEN m.away_team_id = t.id THEN p.away_pred
      END) AS predicted_goals,
      -- Gemiddelde werkelijke goals voor dit team
      AVG(CASE
        WHEN m.home_team_id = t.id THEN m.home_score
        WHEN m.away_team_id = t.id THEN m.away_score
      END) AS actual_goals,
      COUNT(*) AS match_count
    FROM public.teams t
    JOIN public.matches m ON (m.home_team_id = t.id OR m.away_team_id = t.id)
    JOIN public.predictions p ON p.match_id = m.id AND p.user_id = _user_id
    WHERE m.status = 'finished'
      AND p.home_pred IS NOT NULL
      AND p.away_pred IS NOT NULL
      AND m.home_score IS NOT NULL
      AND m.away_score IS NOT NULL
    GROUP BY t.id, t.short_name, t.name
    HAVING COUNT(*) >= 2  -- Min 2 matches per team voor betekenis
  ),
  diffs AS (
    SELECT
      team_id,
      short_name,
      team_name,
      match_count,
      predicted_goals,
      actual_goals,
      round((predicted_goals - actual_goals)::numeric, 1) AS delta
    FROM team_stats
  )
  SELECT
    (SELECT json_agg(json_build_object(
      'teamId', team_id,
      'shortName', short_name,
      'teamName', team_name,
      'delta', delta,
      'matchCount', match_count
    ) ORDER BY delta DESC)
     FROM (SELECT * FROM diffs WHERE delta > 0.3 ORDER BY delta DESC LIMIT 3) t),
    (SELECT json_agg(json_build_object(
      'teamId', team_id,
      'shortName', short_name,
      'teamName', team_name,
      'delta', delta,
      'matchCount', match_count
    ) ORDER BY delta ASC)
     FROM (SELECT * FROM diffs WHERE delta < -0.3 ORDER BY delta ASC LIMIT 3) t)
  INTO overestimated, underestimated;

  result := json_build_object(
    'overestimated', COALESCE(overestimated, '[]'::json),
    'underestimated', COALESCE(underestimated, '[]'::json)
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_team_bias(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
