-- Pool consensus RPC: returns vote distribution + top 3 predicted scores per match per pool
-- Used by MatchDetail page to show "what the pool thinks" before user locks their prediction.
-- Data flows entirely from the existing predictions table (no extra storage needed).

CREATE OR REPLACE FUNCTION public.get_pool_consensus(_pool_id uuid, _match_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  total_votes int;
  home_wins int;
  draws int;
  away_wins int;
  top_scores json;
BEGIN
  -- Only pool members may read consensus (matches RLS on predictions)
  IF NOT public.is_pool_member(auth.uid(), _pool_id) THEN
    RAISE EXCEPTION 'Not a pool member';
  END IF;

  -- Outcome distribution
  SELECT
    COUNT(*) FILTER (WHERE home_pred IS NOT NULL AND away_pred IS NOT NULL),
    COUNT(*) FILTER (WHERE home_pred > away_pred),
    COUNT(*) FILTER (WHERE home_pred = away_pred AND home_pred IS NOT NULL),
    COUNT(*) FILTER (WHERE home_pred < away_pred)
  INTO total_votes, home_wins, draws, away_wins
  FROM public.predictions
  WHERE pool_id = _pool_id AND match_id = _match_id;

  -- Top 3 most-predicted exact scores
  SELECT json_agg(row_data)
  INTO top_scores
  FROM (
    SELECT json_build_object(
      'home_pred', home_pred,
      'away_pred', away_pred,
      'count', COUNT(*)
    ) AS row_data
    FROM public.predictions
    WHERE pool_id = _pool_id AND match_id = _match_id
      AND home_pred IS NOT NULL AND away_pred IS NOT NULL
    GROUP BY home_pred, away_pred
    ORDER BY COUNT(*) DESC
    LIMIT 3
  ) t;

  result := json_build_object(
    'totalVotes', COALESCE(total_votes, 0),
    'homeWins', COALESCE(home_wins, 0),
    'draws', COALESCE(draws, 0),
    'awayWins', COALESCE(away_wins, 0),
    'topScores', COALESCE(top_scores, '[]'::json)
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pool_consensus(uuid, uuid) TO authenticated;

-- Reload PostgREST schema cache so the RPC is immediately callable via supabase-js
NOTIFY pgrst, 'reload schema';
