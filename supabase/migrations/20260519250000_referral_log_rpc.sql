-- ============================================================
-- get_referral_log: admin-only audit van wie wie binnenhaalde
--
-- Voor elke referrer (die minstens 1 ref heeft) één rij per referee
-- met:
--   - wie de uitnodiger is (naam, code)
--   - wie de nieuweling is (naam, email, signup-datum)
--   - hoeveel voorspellingen de nieuweling al deed
--   - of die "actief" is (>= 1 voorspelling)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_referral_log()
RETURNS TABLE(
  referrer_user_id  UUID,
  referrer_name     TEXT,
  referrer_code     TEXT,
  referee_user_id   UUID,
  referee_name      TEXT,
  referee_email     TEXT,
  referee_signed_at TIMESTAMPTZ,
  prediction_count  INT,
  is_active         BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    rer.user_id                              AS referrer_user_id,
    COALESCE(rer.name, 'Onbekend')           AS referrer_name,
    rer.referral_code                        AS referrer_code,
    ree.user_id                              AS referee_user_id,
    COALESCE(ree.name, 'Onbekend')           AS referee_name,
    ree.email                                AS referee_email,
    ree.created_at                           AS referee_signed_at,
    COALESCE(pc.pred_count, 0)::int          AS prediction_count,
    COALESCE(pc.pred_count, 0) > 0           AS is_active
  FROM profiles rer
  JOIN profiles ree
    ON ree.referred_by_code = rer.referral_code
  LEFT JOIN (
    SELECT user_id, COUNT(*) AS pred_count
      FROM predictions
     GROUP BY user_id
  ) pc ON pc.user_id = ree.user_id
  ORDER BY rer.name ASC NULLS LAST, ree.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_referral_log() TO authenticated;

NOTIFY pgrst, 'reload schema';
