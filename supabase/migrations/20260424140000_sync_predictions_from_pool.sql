-- Sync predictions from one pool to all other pools of the user.
--
-- Use case: user fills in predictions in "pool A" completely, then wants every
-- other pool they're a member of to get the same predictions in one action.
-- Deadlines are still enforced per match — matches whose deadline has passed
-- are silently skipped so the trigger enforce_prediction_lock never raises.

-- 1. Preview helper ---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_sync_predictions_preview(_source_pool_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  source_total int;
  syncable_count int;
  skipped_count int;
  target_pools json;
  source_pool_name text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify membership + fetch source pool display name
  SELECT p.name INTO source_pool_name
  FROM public.pool_members pm
  JOIN public.pools p ON p.id = pm.pool_id
  WHERE pm.user_id = uid AND pm.pool_id = _source_pool_id;

  IF source_pool_name IS NULL THEN
    RAISE EXCEPTION 'Not a member of source pool';
  END IF;

  -- Total predictions in source pool (with both scores filled)
  SELECT COUNT(*) INTO source_total
  FROM public.predictions p
  WHERE p.user_id = uid
    AND p.pool_id = _source_pool_id
    AND p.home_pred IS NOT NULL
    AND p.away_pred IS NOT NULL;

  -- Syncable = source prediction + match still open
  SELECT COUNT(*) INTO syncable_count
  FROM public.predictions p
  JOIN public.matches m ON m.id = p.match_id
  WHERE p.user_id = uid
    AND p.pool_id = _source_pool_id
    AND p.home_pred IS NOT NULL
    AND p.away_pred IS NOT NULL
    AND m.status NOT IN ('cancelled', 'void')
    AND now() < m.prediction_deadline_utc;

  skipped_count := GREATEST(source_total - syncable_count, 0);

  -- Target pools = all other pools of the user
  SELECT COALESCE(json_agg(
    json_build_object('pool_id', p.id, 'pool_name', p.name)
    ORDER BY p.name
  ), '[]'::json)
  INTO target_pools
  FROM public.pool_members pm
  JOIN public.pools p ON p.id = pm.pool_id
  WHERE pm.user_id = uid
    AND pm.pool_id <> _source_pool_id;

  RETURN json_build_object(
    'sourcePoolId', _source_pool_id,
    'sourcePoolName', source_pool_name,
    'sourceTotal', source_total,
    'syncableCount', syncable_count,
    'skippedCount', skipped_count,
    'targetPools', target_pools
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_sync_predictions_preview(uuid) TO authenticated;

-- 2. Execute sync -----------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_predictions_from_pool(_source_pool_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  synced_rows int := 0;
  affected_pools int := 0;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.pool_members
    WHERE user_id = uid AND pool_id = _source_pool_id
  ) THEN
    RAISE EXCEPTION 'Not a member of source pool';
  END IF;

  -- Upsert every eligible source prediction into every OTHER pool of the user.
  WITH synced AS (
    INSERT INTO public.predictions (pool_id, user_id, match_id, home_pred, away_pred)
    SELECT
      pm.pool_id,
      uid,
      src.match_id,
      src.home_pred,
      src.away_pred
    FROM public.pool_members pm
    CROSS JOIN LATERAL (
      SELECT p.match_id, p.home_pred, p.away_pred
      FROM public.predictions p
      JOIN public.matches m ON m.id = p.match_id
      WHERE p.user_id = uid
        AND p.pool_id = _source_pool_id
        AND p.home_pred IS NOT NULL
        AND p.away_pred IS NOT NULL
        AND m.status NOT IN ('cancelled', 'void')
        AND now() < m.prediction_deadline_utc
    ) AS src
    WHERE pm.user_id = uid
      AND pm.pool_id <> _source_pool_id
    ON CONFLICT (pool_id, user_id, match_id)
    DO UPDATE SET
      home_pred = EXCLUDED.home_pred,
      away_pred = EXCLUDED.away_pred,
      updated_at = now()
    RETURNING pool_id
  )
  SELECT COUNT(*), COUNT(DISTINCT pool_id)
  INTO synced_rows, affected_pools
  FROM synced;

  RETURN json_build_object(
    'syncedPredictions', COALESCE(synced_rows, 0),
    'affectedPools', COALESCE(affected_pools, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_predictions_from_pool(uuid) TO authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
