-- Prediction sync — fase 1: onboarding + backfill + global preview + auto-copy on pool join.
--
-- Bouwt op de bestaande bulk-infra:
--   * profiles.bulk_predict_enabled (vlag, bestaat al sinds 20260424120000)
--   * save_prediction_bulk (per match upsert naar alle pools, bestaat al)
--   * enforce_prediction_lock trigger blokkeert al schrijven na deadline
--
-- Toegevoegd in deze migratie:
--   * profiles.sync_onboarded boolean
--   * disable_prediction_sync()       — flag uit
--   * mark_sync_onboarding_seen()     — voor "per pool apart"-keuze in onboarding
--   * preview_prediction_sync()       — globale dry-run, per pool current + would-add
--   * enable_prediction_sync()        — flag aan + onboarded + fill-only backfill
--   * trigger copy_predictions_after_pool_join — bij joinen pool: kopieer bestaande
--                                       predictions als sync aan staat (fill-only)
--
-- Deadline-check: filters laten gelocked rijen weg vóór insert, zodat
-- enforce_prediction_lock nooit hoeft te raisen.

-- 1. Onboarding-flag op profiles --------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sync_onboarded boolean NOT NULL DEFAULT false;

-- 2. Disable: flag uit ------------------------------------------------------

CREATE OR REPLACE FUNCTION public.disable_prediction_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.profiles
    SET bulk_predict_enabled = false,
        updated_at = now()
    WHERE user_id = uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.disable_prediction_sync() TO authenticated;

-- 3. Onboarding gezien (zonder flag te wijzigen) ----------------------------

CREATE OR REPLACE FUNCTION public.mark_sync_onboarding_seen()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.profiles
    SET sync_onboarded = true,
        updated_at = now()
    WHERE user_id = uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_sync_onboarding_seen() TO authenticated;

-- 4. Globale preview (dry-run) ----------------------------------------------
-- Per pool van de user: huidig aantal complete predictions + aantal dat erbij
-- zou komen bij enable_prediction_sync(). Fill-only: bestaande blijven staan.

CREATE OR REPLACE FUNCTION public.preview_prediction_sync()
RETURNS TABLE (
  pool_id uuid,
  pool_name text,
  current_count int,
  will_be_added int
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  WITH user_pools AS (
    SELECT pm.pool_id, p.name AS pool_name
    FROM public.pool_members pm
    JOIN public.pools p ON p.id = pm.pool_id
    WHERE pm.user_id = uid
  ),
  latest_per_match AS (
    SELECT DISTINCT ON (pr.match_id)
      pr.match_id,
      pr.home_pred,
      pr.away_pred
    FROM public.predictions pr
    JOIN public.matches m ON m.id = pr.match_id
    WHERE pr.user_id = uid
      AND pr.home_pred IS NOT NULL
      AND pr.away_pred IS NOT NULL
      AND m.status NOT IN ('cancelled', 'void')
      AND now() < m.prediction_deadline_utc
    ORDER BY pr.match_id, pr.updated_at DESC
  ),
  current_counts AS (
    SELECT pr.pool_id, COUNT(*)::int AS cnt
    FROM public.predictions pr
    WHERE pr.user_id = uid
      AND pr.home_pred IS NOT NULL
      AND pr.away_pred IS NOT NULL
    GROUP BY pr.pool_id
  ),
  would_add AS (
    SELECT
      up.pool_id,
      COUNT(*) FILTER (
        WHERE NOT EXISTS (
          SELECT 1 FROM public.predictions pr2
          WHERE pr2.user_id = uid
            AND pr2.pool_id = up.pool_id
            AND pr2.match_id = lpm.match_id
            AND pr2.home_pred IS NOT NULL
            AND pr2.away_pred IS NOT NULL
        )
      )::int AS to_add
    FROM user_pools up
    CROSS JOIN latest_per_match lpm
    GROUP BY up.pool_id
  )
  SELECT
    up.pool_id,
    up.pool_name,
    COALESCE(cc.cnt, 0)    AS current_count,
    COALESCE(wa.to_add, 0) AS will_be_added
  FROM user_pools up
  LEFT JOIN current_counts cc ON cc.pool_id = up.pool_id
  LEFT JOIN would_add      wa ON wa.pool_id = up.pool_id
  ORDER BY up.pool_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.preview_prediction_sync() TO authenticated;

-- 5. Enable: flag + onboarded + backfill ------------------------------------
-- Per match: meest recente prediction → fill-only naar alle pools van user.

CREATE OR REPLACE FUNCTION public.enable_prediction_sync()
RETURNS TABLE (
  matches_filled int,
  pools_affected int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.profiles
    SET bulk_predict_enabled = true,
        sync_onboarded = true,
        updated_at = now()
    WHERE user_id = uid;

  RETURN QUERY
  WITH latest_per_match AS (
    SELECT DISTINCT ON (pr.match_id)
      pr.match_id,
      pr.home_pred,
      pr.away_pred
    FROM public.predictions pr
    JOIN public.matches m ON m.id = pr.match_id
    WHERE pr.user_id = uid
      AND pr.home_pred IS NOT NULL
      AND pr.away_pred IS NOT NULL
      AND m.status NOT IN ('cancelled', 'void')
      AND now() < m.prediction_deadline_utc
    ORDER BY pr.match_id, pr.updated_at DESC
  ),
  inserted AS (
    INSERT INTO public.predictions (pool_id, user_id, match_id, home_pred, away_pred)
    SELECT pm.pool_id, uid, lpm.match_id, lpm.home_pred, lpm.away_pred
    FROM public.pool_members pm
    CROSS JOIN latest_per_match lpm
    WHERE pm.user_id = uid
    ON CONFLICT (pool_id, user_id, match_id) DO NOTHING
    RETURNING pool_id
  )
  SELECT COUNT(*)::int AS matches_filled, COUNT(DISTINCT pool_id)::int AS pools_affected
  FROM inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enable_prediction_sync() TO authenticated;

-- 6. Trigger op pool_members AFTER INSERT -----------------------------------
-- Bij joinen van een nieuwe pool: als sync aan staat, kopieer bestaande
-- predictions van user uit andere pools (fill-only, deadline-check).

CREATE OR REPLACE FUNCTION public.copy_predictions_on_pool_join()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sync_on boolean;
BEGIN
  SELECT bulk_predict_enabled INTO sync_on
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  IF NOT COALESCE(sync_on, false) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.predictions (pool_id, user_id, match_id, home_pred, away_pred)
  SELECT NEW.pool_id, NEW.user_id, src.match_id, src.home_pred, src.away_pred
  FROM (
    SELECT DISTINCT ON (pr.match_id)
      pr.match_id, pr.home_pred, pr.away_pred
    FROM public.predictions pr
    JOIN public.matches m ON m.id = pr.match_id
    WHERE pr.user_id = NEW.user_id
      AND pr.pool_id <> NEW.pool_id
      AND pr.home_pred IS NOT NULL
      AND pr.away_pred IS NOT NULL
      AND m.status NOT IN ('cancelled', 'void')
      AND now() < m.prediction_deadline_utc
    ORDER BY pr.match_id, pr.updated_at DESC
  ) src
  ON CONFLICT (pool_id, user_id, match_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS copy_predictions_after_pool_join ON public.pool_members;
CREATE TRIGGER copy_predictions_after_pool_join
  AFTER INSERT ON public.pool_members
  FOR EACH ROW
  EXECUTE FUNCTION public.copy_predictions_on_pool_join();

-- Reload PostgREST schema cache zodat de RPC's direct beschikbaar zijn
NOTIFY pgrst, 'reload schema';
