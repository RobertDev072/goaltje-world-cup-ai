-- ============================================================
-- get_my_referral_status: extra veld 'has_made_prediction'
--
-- Gebruiker is "klaar met de winactie" wanneer:
--   1. active_referrals >= 5
--   2. heeft zelf minimaal 1 voorspelling gedaan
-- De frontend gebruikt 'completed' om de promo + speciale pagina
-- volledig te verbergen.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_referral_status()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid           UUID := auth.uid();
  my_code       TEXT;
  total_refs    INT;
  active_refs   INT;
  own_pred      INT;
  required      INT := 5;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT referral_code INTO my_code FROM profiles WHERE user_id = uid;
  IF my_code IS NULL THEN
    UPDATE profiles SET referral_code = generate_referral_code()
     WHERE user_id = uid RETURNING referral_code INTO my_code;
  END IF;

  SELECT COUNT(*) INTO total_refs
    FROM profiles WHERE referred_by_code = my_code;

  SELECT COUNT(DISTINCT pr.user_id) INTO active_refs
    FROM profiles pr
    JOIN predictions p ON p.user_id = pr.user_id
   WHERE pr.referred_by_code = my_code;

  SELECT COUNT(*) INTO own_pred
    FROM predictions WHERE user_id = uid;

  RETURN jsonb_build_object(
    'referral_code',       my_code,
    'total_referrals',     total_refs,
    'active_referrals',    active_refs,
    'required',            required,
    'has_made_prediction', own_pred > 0,
    'qualified',           active_refs >= required,
    'completed',           active_refs >= required AND own_pred > 0
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_referral_status() TO authenticated;

NOTIFY pgrst, 'reload schema';
