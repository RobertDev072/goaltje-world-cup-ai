-- Prediction sync — fix voor users zonder profiles-rij.
--
-- Context: handle_new_user-trigger maakt een profile-rij voor nieuwe signups,
-- maar oudere/handmatig-aangemaakte accounts (waaronder sommige admins) hebben
-- mogelijk geen rij. Daardoor was UPDATE in onze RPC's een no-op:
-- de flag werd nooit echt gezet en de onboarding-modal bleef terugkomen.
--
-- Fix: alle 3 RPC's switchen naar UPSERT (INSERT … ON CONFLICT DO UPDATE),
-- zodat een ontbrekende rij wordt aangemaakt en de flag direct correct staat.
-- Verder geen logica-wijzigingen.

-- 1. enable_prediction_sync — flag aan + onboarded + backfill -----------------

CREATE OR REPLACE FUNCTION public.enable_prediction_sync()
RETURNS TABLE (matches_filled int, pools_affected int)
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

  INSERT INTO public.profiles (user_id, bulk_predict_enabled, sync_onboarded)
  VALUES (uid, true, true)
  ON CONFLICT (user_id) DO UPDATE
    SET bulk_predict_enabled = true,
        sync_onboarded        = true,
        updated_at            = now();

  RETURN QUERY
  WITH latest_per_match AS (
    SELECT DISTINCT ON (pr.match_id)
      pr.match_id, pr.home_pred, pr.away_pred
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

-- 2. disable_prediction_sync — flag uit (rij blijft bestaan) -----------------

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

  INSERT INTO public.profiles (user_id, bulk_predict_enabled, sync_onboarded)
  VALUES (uid, false, true)
  ON CONFLICT (user_id) DO UPDATE
    SET bulk_predict_enabled = false,
        updated_at            = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.disable_prediction_sync() TO authenticated;

-- 3. mark_sync_onboarding_seen — alleen onboarded, flag onaangeroerd ---------

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

  INSERT INTO public.profiles (user_id, sync_onboarded)
  VALUES (uid, true)
  ON CONFLICT (user_id) DO UPDATE
    SET sync_onboarded = true,
        updated_at      = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_sync_onboarding_seen() TO authenticated;

NOTIFY pgrst, 'reload schema';
