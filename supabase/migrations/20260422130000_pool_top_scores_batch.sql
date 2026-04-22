-- Batch RPC: top voorspelde uitslag per match voor een poule, voor een lijst match_ids.
-- Gebruikt door MatchCard om één compact chipje te tonen zonder N round-trips.
-- Returned vorm:
--   { "<match-uuid>": { "home_pred": 2, "away_pred": 1, "count": 2, "total": 4 }, ... }

CREATE OR REPLACE FUNCTION public.get_pool_top_scores(_pool_id uuid, _match_ids uuid[])
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

  SELECT json_object_agg(match_id, top)
  INTO result
  FROM (
    SELECT
      match_id,
      json_build_object(
        'home_pred', home_pred,
        'away_pred', away_pred,
        'count', n,
        'total', total
      ) AS top
    FROM (
      SELECT
        match_id,
        home_pred,
        away_pred,
        COUNT(*) AS n,
        SUM(COUNT(*)) OVER (PARTITION BY match_id) AS total,
        ROW_NUMBER() OVER (PARTITION BY match_id ORDER BY COUNT(*) DESC) AS rn
      FROM public.predictions
      WHERE pool_id = _pool_id
        AND match_id = ANY(_match_ids)
        AND home_pred IS NOT NULL
        AND away_pred IS NOT NULL
      GROUP BY match_id, home_pred, away_pred
    ) ranked
    WHERE rn = 1
  ) t;

  RETURN COALESCE(result, '{}'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pool_top_scores(uuid, uuid[]) TO authenticated;

NOTIFY pgrst, 'reload schema';
