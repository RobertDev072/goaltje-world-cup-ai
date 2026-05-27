-- ============================================================
-- Failed login monitoring + suspicious patterns — Fase 2.3
--
-- Supabase logt mislukte logins niet via een hook, dus we vangen
-- ze client-side op in AuthContext. Daarnaast: detectie van
-- suspicious patterns voor de Security-tab.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.failed_login_attempts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT,                       -- email die geprobeerd werd
  ip_address  TEXT,                       -- IP gemaskeerd in UI
  country     TEXT,
  user_agent  TEXT,
  reason      TEXT,                       -- 'invalid_credentials', 'user_not_found', etc.
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_failed_logins_created
  ON public.failed_login_attempts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_failed_logins_email_created
  ON public.failed_login_attempts(email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_failed_logins_ip_created
  ON public.failed_login_attempts(ip_address, created_at DESC);

ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read failed_login_attempts" ON public.failed_login_attempts;
CREATE POLICY "Admins read failed_login_attempts"
  ON public.failed_login_attempts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ------------------------------------------------------------
-- RPC: log_failed_login
-- Iedereen mag aanroepen (ook anon, want gebruiker is per definitie
-- nog niet ingelogd). Server gooit alleen rate-limit op.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_failed_login(
  _email      TEXT,
  _reason     TEXT DEFAULT 'invalid_credentials'
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  recent_same_email INT;
BEGIN
  -- Anti-spam: max 1 entry per email per 10 sec
  SELECT COUNT(*) INTO recent_same_email
    FROM failed_login_attempts
   WHERE email = LOWER(TRIM(_email))
     AND created_at > NOW() - INTERVAL '10 seconds';

  IF recent_same_email > 0 THEN RETURN; END IF;

  INSERT INTO failed_login_attempts (email, reason)
  VALUES (LOWER(TRIM(_email)), LEFT(_reason, 100));
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_failed_login(TEXT, TEXT) TO authenticated, anon;

-- ------------------------------------------------------------
-- RPC: get_failed_login_summary  — voor security tab
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_failed_login_summary(_hours INT DEFAULT 24)
RETURNS TABLE(
  email         TEXT,
  attempt_count BIGINT,
  first_attempt TIMESTAMPTZ,
  last_attempt  TIMESTAMPTZ,
  reasons       TEXT[]
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    f.email,
    COUNT(*)::bigint                    AS attempt_count,
    MIN(f.created_at)                   AS first_attempt,
    MAX(f.created_at)                   AS last_attempt,
    ARRAY_AGG(DISTINCT f.reason)        AS reasons
  FROM failed_login_attempts f
  WHERE f.created_at > NOW() - (_hours || ' hours')::INTERVAL
    AND f.email IS NOT NULL
  GROUP BY f.email
  ORDER BY attempt_count DESC, last_attempt DESC
  LIMIT 100;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_failed_login_summary(INT) TO authenticated;

-- ------------------------------------------------------------
-- RPC: get_suspicious_patterns — flags voor security tab
--   1. Brute force: > 5 mislukte logins op zelfde email in 10 min
--   2. Multi-country: zelfde user logt in vanuit > 1 land in 1h
--   3. Burst: > 20 voorspellingen van 1 user in 1 min (bot-like)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_suspicious_patterns()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  brute_force        JSONB;
  multi_country      JSONB;
  prediction_bursts  JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  -- 1. Brute force op email
  SELECT jsonb_agg(jsonb_build_object(
    'email',         email,
    'attempt_count', attempt_count,
    'last_attempt',  last_attempt
  )) INTO brute_force
  FROM (
    SELECT email, COUNT(*) AS attempt_count, MAX(created_at) AS last_attempt
      FROM failed_login_attempts
     WHERE created_at > NOW() - INTERVAL '10 minutes'
       AND email IS NOT NULL
     GROUP BY email
    HAVING COUNT(*) > 5
     ORDER BY attempt_count DESC
     LIMIT 20
  ) t;

  -- 2. Multi-country: user logt in vanuit verschillende landen binnen 1h
  SELECT jsonb_agg(jsonb_build_object(
    'user_id',      user_id,
    'name',         name,
    'email',        email,
    'countries',    countries,
    'last_login',   last_login
  )) INTO multi_country
  FROM (
    SELECT
      s.user_id,
      p.name,
      p.email,
      ARRAY_AGG(DISTINCT s.country)      AS countries,
      MAX(s.login_at_utc)                AS last_login,
      COUNT(DISTINCT s.country)          AS country_count
    FROM user_sessions s
    LEFT JOIN profiles p ON p.user_id = s.user_id
    WHERE s.login_at_utc > NOW() - INTERVAL '1 hour'
      AND s.country IS NOT NULL
    GROUP BY s.user_id, p.name, p.email
    HAVING COUNT(DISTINCT s.country) > 1
    ORDER BY country_count DESC, last_login DESC
    LIMIT 20
  ) t;

  -- 3. Voorspellings-burst: > 20 predictions/minuut van zelfde user
  SELECT jsonb_agg(jsonb_build_object(
    'user_id',          user_id,
    'name',             name,
    'prediction_count', prediction_count,
    'window_start',     window_start
  )) INTO prediction_bursts
  FROM (
    SELECT
      pred.user_id,
      p.name,
      COUNT(*)                         AS prediction_count,
      MIN(pred.created_at)             AS window_start
    FROM predictions pred
    LEFT JOIN profiles p ON p.user_id = pred.user_id
    WHERE pred.created_at > NOW() - INTERVAL '24 hours'
    GROUP BY pred.user_id, p.name,
             date_trunc('minute', pred.created_at)
    HAVING COUNT(*) > 20
    ORDER BY prediction_count DESC
    LIMIT 20
  ) t;

  RETURN jsonb_build_object(
    'brute_force',       COALESCE(brute_force, '[]'::jsonb),
    'multi_country',     COALESCE(multi_country, '[]'::jsonb),
    'prediction_bursts', COALESCE(prediction_bursts, '[]'::jsonb),
    'generated_at',      NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_suspicious_patterns() TO authenticated;

NOTIFY pgrst, 'reload schema';
