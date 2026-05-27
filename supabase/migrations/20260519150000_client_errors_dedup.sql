-- ============================================================
-- Fase 2.2 — Client error tracking with fingerprint dedup
--
-- Goal: zelf-gebouwde Sentry-vervanger die niet exploit bij bugs.
--   - Iedere unieke (message + route) combinatie = 1 rij
--   - Bij herhaling: count++, last_seen_at updaten
--   - 1 miljoen identieke errors → nog steeds 1 rij
-- ============================================================

CREATE TABLE IF NOT EXISTS public.client_errors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint   TEXT NOT NULL UNIQUE,
  message       TEXT NOT NULL,
  stack         TEXT,
  route         TEXT,
  user_agent    TEXT,
  count         INT NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_payload  JSONB,
  resolved_at   TIMESTAMPTZ,
  resolved_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_client_errors_unresolved_last
  ON public.client_errors(last_seen_at DESC) WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_client_errors_count
  ON public.client_errors(count DESC) WHERE resolved_at IS NULL;

ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read client_errors"   ON public.client_errors;
CREATE POLICY "Admins read client_errors"
  ON public.client_errors FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update client_errors" ON public.client_errors;
CREATE POLICY "Admins update client_errors"
  ON public.client_errors FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete client_errors" ON public.client_errors;
CREATE POLICY "Admins delete client_errors"
  ON public.client_errors FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ------------------------------------------------------------
-- RPC: report_client_error
-- Public function — anonymous + authenticated kunnen errors melden.
-- Server-side dedup via ON CONFLICT (fingerprint).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.report_client_error(
  _message    TEXT,
  _stack      TEXT DEFAULT NULL,
  _route      TEXT DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL,
  _payload    JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  fp        TEXT;
  short_msg TEXT;
BEGIN
  IF _message IS NULL OR LENGTH(_message) = 0 THEN RETURN; END IF;

  short_msg := LEFT(_message, 500);
  fp := md5(LEFT(_message, 200) || '|' || COALESCE(_route, ''));

  INSERT INTO client_errors (
    fingerprint, message, stack, route, user_agent,
    last_user_id, last_payload
  )
  VALUES (
    fp, short_msg, LEFT(_stack, 4000), LEFT(_route, 300),
    LEFT(_user_agent, 300), auth.uid(), COALESCE(_payload, '{}'::jsonb)
  )
  ON CONFLICT (fingerprint) DO UPDATE
    SET count        = client_errors.count + 1,
        last_seen_at = NOW(),
        last_user_id = auth.uid(),
        last_payload = COALESCE(EXCLUDED.last_payload, client_errors.last_payload),
        resolved_at  = NULL,    -- recurring = un-resolve
        resolved_by  = NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_client_error(TEXT, TEXT, TEXT, TEXT, JSONB)
  TO authenticated, anon;

-- ------------------------------------------------------------
-- RPC: resolve_client_error / unresolve
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_client_error(_id UUID, _resolve BOOLEAN DEFAULT TRUE)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  UPDATE client_errors
     SET resolved_at = CASE WHEN _resolve THEN NOW() ELSE NULL END,
         resolved_by = CASE WHEN _resolve THEN auth.uid() ELSE NULL END
   WHERE id = _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_client_error(UUID, BOOLEAN) TO authenticated;

-- ------------------------------------------------------------
-- Extend cleanup_old_data to also prune client_errors.
-- Resolved errors → 14 dagen, unresolved → 90 dagen.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  deleted_activity        INT := 0;
  deleted_sessions        INT := 0;
  deleted_audit           INT := 0;
  deleted_failed          INT := 0;
  deleted_errors_resolved INT := 0;
  deleted_errors_old      INT := 0;
BEGIN
  DELETE FROM activity_events
   WHERE created_at < NOW() - INTERVAL '3 days';
  GET DIAGNOSTICS deleted_activity = ROW_COUNT;

  DELETE FROM user_sessions
   WHERE login_at_utc < NOW() - INTERVAL '60 days';
  GET DIAGNOSTICS deleted_sessions = ROW_COUNT;

  DELETE FROM audit_logs
   WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS deleted_audit = ROW_COUNT;

  BEGIN
    DELETE FROM failed_login_attempts
     WHERE created_at < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS deleted_failed = ROW_COUNT;
  EXCEPTION WHEN undefined_table THEN
    deleted_failed := 0;
  END;

  BEGIN
    -- Resolved errors > 14 days old
    DELETE FROM client_errors
     WHERE resolved_at IS NOT NULL
       AND resolved_at < NOW() - INTERVAL '14 days';
    GET DIAGNOSTICS deleted_errors_resolved = ROW_COUNT;

    -- Unresolved errors > 90 days (likely stale, dropped already in production)
    DELETE FROM client_errors
     WHERE resolved_at IS NULL
       AND last_seen_at < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS deleted_errors_old = ROW_COUNT;
  EXCEPTION WHEN undefined_table THEN
    deleted_errors_resolved := 0;
    deleted_errors_old := 0;
  END;

  RETURN jsonb_build_object(
    'deleted_activity_events',         deleted_activity,
    'deleted_user_sessions',           deleted_sessions,
    'deleted_audit_logs',              deleted_audit,
    'deleted_failed_login_attempts',   deleted_failed,
    'deleted_client_errors_resolved',  deleted_errors_resolved,
    'deleted_client_errors_old',       deleted_errors_old,
    'ran_at',                          NOW()
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
