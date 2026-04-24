-- Bulk predictions feature
-- Adds a per-user preference to apply one prediction to all pools the user
-- is a member of, plus RPCs to preview and execute the bulk save atomically.
--
-- Design notes:
--   * Deadline is enforced per-match via matches.prediction_deadline_utc
--     (see trigger enforce_prediction_lock). RPCs filter pools whose match
--     is already locked so the trigger never fires for a locked row.
--   * Only pools the user is a member of are considered — auth.uid() is the
--     single source of truth; admin impersonation is not supported here.
--   * RPCs are SECURITY DEFINER to bypass RLS cleanly while restricting the
--     scope to auth.uid() explicitly.

-- 1. Preference column on profiles ------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bulk_predict_enabled boolean NOT NULL DEFAULT false;

-- 2. Preview helper: which of the user's pools would be updated/skipped -----

CREATE OR REPLACE FUNCTION public.get_user_bulk_save_preview(_match_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  match_deadline timestamptz;
  match_status text;
  is_locked boolean;
  eligible json;
  skipped json;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT prediction_deadline_utc, status
  INTO match_deadline, match_status
  FROM public.matches
  WHERE id = _match_id;

  IF match_deadline IS NULL THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  is_locked := (
    match_status IN ('cancelled', 'void')
    OR now() >= match_deadline
  );

  -- Eligible pools: user is member AND match is not locked
  SELECT COALESCE(json_agg(
    json_build_object('pool_id', p.id, 'pool_name', p.name)
    ORDER BY p.name
  ), '[]'::json)
  INTO eligible
  FROM public.pool_members pm
  JOIN public.pools p ON p.id = pm.pool_id
  WHERE pm.user_id = uid
    AND NOT is_locked;

  -- Skipped pools: user is member BUT match is locked
  SELECT COALESCE(json_agg(
    json_build_object('pool_id', p.id, 'pool_name', p.name, 'reason', 'locked')
    ORDER BY p.name
  ), '[]'::json)
  INTO skipped
  FROM public.pool_members pm
  JOIN public.pools p ON p.id = pm.pool_id
  WHERE pm.user_id = uid
    AND is_locked;

  RETURN json_build_object(
    'eligible', eligible,
    'skipped', skipped,
    'matchLocked', is_locked
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_bulk_save_preview(uuid) TO authenticated;

-- 3. Match-prediction bulk save ---------------------------------------------

CREATE OR REPLACE FUNCTION public.save_prediction_bulk(
  _match_id uuid,
  _home_pred integer,
  _away_pred integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  match_deadline timestamptz;
  match_status text;
  saved_ids uuid[] := ARRAY[]::uuid[];
  skipped_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _home_pred IS NULL OR _away_pred IS NULL OR _home_pred < 0 OR _away_pred < 0 THEN
    RAISE EXCEPTION 'Invalid score';
  END IF;

  SELECT prediction_deadline_utc, status
  INTO match_deadline, match_status
  FROM public.matches
  WHERE id = _match_id;

  IF match_deadline IS NULL THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF match_status IN ('cancelled', 'void') OR now() >= match_deadline THEN
    -- Whole match locked: nothing to save, return user's pools as skipped
    SELECT COALESCE(array_agg(pm.pool_id), ARRAY[]::uuid[])
    INTO skipped_ids
    FROM public.pool_members pm
    WHERE pm.user_id = uid;

    RETURN json_build_object(
      'savedPoolIds', to_json(saved_ids),
      'skippedPoolIds', to_json(skipped_ids),
      'matchLocked', true
    );
  END IF;

  -- Upsert for every pool the user is a member of
  WITH upserted AS (
    INSERT INTO public.predictions (pool_id, user_id, match_id, home_pred, away_pred)
    SELECT pm.pool_id, uid, _match_id, _home_pred, _away_pred
    FROM public.pool_members pm
    WHERE pm.user_id = uid
    ON CONFLICT (pool_id, user_id, match_id)
    DO UPDATE SET
      home_pred = EXCLUDED.home_pred,
      away_pred = EXCLUDED.away_pred,
      updated_at = now()
    RETURNING pool_id
  )
  SELECT COALESCE(array_agg(pool_id), ARRAY[]::uuid[])
  INTO saved_ids
  FROM upserted;

  RETURN json_build_object(
    'savedPoolIds', to_json(saved_ids),
    'skippedPoolIds', to_json(skipped_ids),
    'matchLocked', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_prediction_bulk(uuid, integer, integer) TO authenticated;

-- 4. Bonus-prediction bulk save ---------------------------------------------

CREATE OR REPLACE FUNCTION public.save_bonus_prediction_bulk(
  _question_id uuid,
  _answer text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  closes_at_val timestamptz;
  saved_ids uuid[] := ARRAY[]::uuid[];
  skipped_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _answer IS NULL OR length(btrim(_answer)) = 0 THEN
    RAISE EXCEPTION 'Empty answer';
  END IF;

  SELECT closes_at INTO closes_at_val
  FROM public.bonus_questions
  WHERE id = _question_id;

  IF closes_at_val IS NULL THEN
    RAISE EXCEPTION 'Bonus question not found';
  END IF;

  IF now() >= closes_at_val THEN
    SELECT COALESCE(array_agg(pm.pool_id), ARRAY[]::uuid[])
    INTO skipped_ids
    FROM public.pool_members pm
    WHERE pm.user_id = uid;

    RETURN json_build_object(
      'savedPoolIds', to_json(saved_ids),
      'skippedPoolIds', to_json(skipped_ids),
      'questionLocked', true
    );
  END IF;

  WITH upserted AS (
    INSERT INTO public.bonus_predictions (pool_id, user_id, question_id, answer)
    SELECT pm.pool_id, uid, _question_id, _answer
    FROM public.pool_members pm
    WHERE pm.user_id = uid
    ON CONFLICT (user_id, pool_id, question_id)
    DO UPDATE SET
      answer = EXCLUDED.answer,
      updated_at = now()
    RETURNING pool_id
  )
  SELECT COALESCE(array_agg(pool_id), ARRAY[]::uuid[])
  INTO saved_ids
  FROM upserted;

  RETURN json_build_object(
    'savedPoolIds', to_json(saved_ids),
    'skippedPoolIds', to_json(skipped_ids),
    'questionLocked', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_bonus_prediction_bulk(uuid, text) TO authenticated;

-- Reload PostgREST schema cache so the new RPCs are immediately callable
NOTIFY pgrst, 'reload schema';
