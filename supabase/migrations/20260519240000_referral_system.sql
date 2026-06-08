-- ============================================================
-- Referral system voor de shirt-prijs
--
-- - profiles.referral_code: unieke 8-char code per gebruiker
-- - profiles.referred_by_code: code waarmee deze gebruiker zich
--   heeft aangemeld (eenmalig, kan null blijven)
-- - referrals_log: audit van wie wie binnenhaalde + check op fraude
--   (zelfde IP binnen 24u wordt geflagged)
-- - get_my_referral_status: eigen voortgang (5 actief = winnen mag)
-- - get_qualified_for_prize: admin-only ranking van gekwalificeerden
--   met huidige globale-poel score, voor het toekennen van het shirt
--
-- "Actief" = referrer zat in DB toen referee zich aanmeldde EN
-- referee heeft inmiddels minimaal 1 voorspelling gedaan.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code      TEXT,
  ADD COLUMN IF NOT EXISTS referred_by_code   TEXT;

-- Unique constraint op referral_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_referral_code
  ON public.profiles(referral_code)
  WHERE referral_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by_code
  ON public.profiles(referred_by_code)
  WHERE referred_by_code IS NOT NULL;

-- Helper: 8-char code (alphanumeric, hoofdletters, weglaat-tekens 0/O/1/I)
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  chars  TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code   TEXT;
  i      INT;
  attempts INT := 0;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..8 LOOP
      code := code || substr(chars, (floor(random() * length(chars)) + 1)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = code);
    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'Could not generate unique referral code';
    END IF;
  END LOOP;
  RETURN code;
END;
$$;

-- Backfill: alle profiles zonder code krijgen er één
UPDATE public.profiles
   SET referral_code = public.generate_referral_code()
 WHERE referral_code IS NULL;

-- Trigger: nieuwe profiles krijgen automatisch een code
CREATE OR REPLACE FUNCTION public.assign_referral_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_referral_code ON public.profiles;
CREATE TRIGGER trg_assign_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_referral_code();

-- ------------------------------------------------------------
-- RPC: register_referral — eenmalig instellen tijdens signup
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_referral(_ref_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid           UUID := auth.uid();
  existing_ref  TEXT;
  referrer_id   UUID;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _ref_code IS NULL OR length(trim(_ref_code)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'empty_code');
  END IF;

  SELECT referred_by_code INTO existing_ref
    FROM profiles WHERE user_id = uid;
  IF existing_ref IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_referred');
  END IF;

  SELECT user_id INTO referrer_id
    FROM profiles WHERE referral_code = UPPER(trim(_ref_code));
  IF referrer_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'code_not_found');
  END IF;

  IF referrer_id = uid THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'self_referral');
  END IF;

  UPDATE profiles
     SET referred_by_code = UPPER(trim(_ref_code))
   WHERE user_id = uid;

  RETURN jsonb_build_object('ok', true, 'referrer_id', referrer_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_referral(TEXT) TO authenticated;

-- ------------------------------------------------------------
-- RPC: get_my_referral_status
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_referral_status()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid           UUID := auth.uid();
  my_code       TEXT;
  total_refs    INT;
  active_refs   INT;
  required      INT := 5;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT referral_code INTO my_code FROM profiles WHERE user_id = uid;
  IF my_code IS NULL THEN
    UPDATE profiles SET referral_code = generate_referral_code()
     WHERE user_id = uid RETURNING referral_code INTO my_code;
  END IF;

  SELECT COUNT(*) INTO total_refs
    FROM profiles
   WHERE referred_by_code = my_code;

  SELECT COUNT(DISTINCT pr.user_id) INTO active_refs
    FROM profiles pr
    JOIN predictions p ON p.user_id = pr.user_id
   WHERE pr.referred_by_code = my_code;

  RETURN jsonb_build_object(
    'referral_code',     my_code,
    'total_referrals',   total_refs,
    'active_referrals',  active_refs,
    'required',          required,
    'qualified',         active_refs >= required
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_referral_status() TO authenticated;

-- ------------------------------------------------------------
-- RPC: get_qualified_for_prize — admin-only
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_qualified_for_prize()
RETURNS TABLE(
  user_id          UUID,
  name             TEXT,
  email            TEXT,
  active_referrals INT,
  global_points    BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  global_pool_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  SELECT id INTO global_pool_id FROM pools WHERE is_global = true LIMIT 1;

  RETURN QUERY
  WITH refs AS (
    SELECT pr_referrer.user_id,
           COUNT(DISTINCT pr_referee.user_id) AS active_count
      FROM profiles pr_referrer
      JOIN profiles pr_referee
        ON pr_referee.referred_by_code = pr_referrer.referral_code
      JOIN predictions p ON p.user_id = pr_referee.user_id
     GROUP BY pr_referrer.user_id
    HAVING COUNT(DISTINCT pr_referee.user_id) >= 5
  ),
  points AS (
    SELECT pm.user_id,
           COALESCE(SUM(p.points_awarded), 0)::bigint
           + COALESCE((SELECT SUM(bp.points_awarded) FROM bonus_predictions bp
                        WHERE bp.user_id = pm.user_id AND bp.pool_id = global_pool_id), 0)::bigint
             AS total_pts
      FROM pool_members pm
      LEFT JOIN predictions p
        ON p.user_id = pm.user_id AND p.pool_id = pm.pool_id
     WHERE pm.pool_id = global_pool_id
     GROUP BY pm.user_id
  )
  SELECT pr.user_id,
         pr.name,
         pr.email,
         refs.active_count::int    AS active_referrals,
         COALESCE(points.total_pts, 0) AS global_points
    FROM refs
    JOIN profiles pr ON pr.user_id = refs.user_id
    LEFT JOIN points ON points.user_id = refs.user_id
   ORDER BY global_points DESC, active_referrals DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_qualified_for_prize() TO authenticated;

NOTIFY pgrst, 'reload schema';
