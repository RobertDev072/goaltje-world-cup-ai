-- ============================================================
-- Storage hygiene — Fase 2.1
--
-- Free-tier optimaliseren: 500MB limiet, 5K users, WK-piek.
--
-- Retentie (na overleg met user):
--   - activity_events     :  3 days
--   - failed_login_attempts:  7 days  (table created when needed)
--   - user_sessions       : 60 days
--   - audit_logs          : 30 days
--   - client_errors       : 30 days  (dedupe-based, see fase 2.2)
--
-- Cleanup draait dagelijks om 01:00 UTC via pg_cron.
-- ============================================================

-- Required: pg_cron extension. Enable via Dashboard → Database →
-- Extensions if not already on. The CREATE below is a no-op if active.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- ------------------------------------------------------------
-- Single cleanup function (idempotent, safe to re-run).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  deleted_activity INT := 0;
  deleted_sessions INT := 0;
  deleted_audit    INT := 0;
  deleted_failed   INT := 0;
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

  -- failed_login_attempts table is created in fase 2.3 — guard against
  -- table-not-found errors for now.
  BEGIN
    DELETE FROM failed_login_attempts
     WHERE created_at < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS deleted_failed = ROW_COUNT;
  EXCEPTION WHEN undefined_table THEN
    deleted_failed := 0;
  END;

  RETURN jsonb_build_object(
    'deleted_activity_events',      deleted_activity,
    'deleted_user_sessions',        deleted_sessions,
    'deleted_audit_logs',           deleted_audit,
    'deleted_failed_login_attempts', deleted_failed,
    'ran_at',                       NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_old_data() TO postgres;

-- ------------------------------------------------------------
-- Schedule daily at 01:00 UTC (~02:00/03:00 NL afhankelijk van DST).
-- Cancel old schedule if present to keep this migration idempotent.
-- ------------------------------------------------------------
DO $$
DECLARE
  existing_job INT;
BEGIN
  SELECT jobid INTO existing_job
    FROM cron.job
   WHERE jobname = 'cleanup-old-data-daily';

  IF existing_job IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job);
  END IF;

  PERFORM cron.schedule(
    'cleanup-old-data-daily',
    '0 1 * * *',
    'SELECT public.cleanup_old_data()'
  );
EXCEPTION WHEN OTHERS THEN
  -- pg_cron may not be enabled yet; ignore so the migration still applies.
  RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
END $$;

-- ------------------------------------------------------------
-- One-time burst cleanup so we start small.
-- ------------------------------------------------------------
SELECT public.cleanup_old_data();

NOTIFY pgrst, 'reload schema';
