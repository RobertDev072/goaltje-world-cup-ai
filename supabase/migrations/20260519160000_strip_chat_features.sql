-- ============================================================
-- Pool chat strippen — Fase 2.2b
--
-- - reactions_json kolom: niet meer in gebruik in UI → drop
-- - reply_to_id kolom: niet meer in gebruik in UI → drop
-- - expires_at generated kolom: leftover, nergens gebruikt → drop
-- - toggle_message_reaction RPC: niet meer in gebruik → drop
-- - Cleanup: pool_messages > 1 dag oud verwijderen (UI toont alleen
--   laatste 5 min; 1 dag is ruime buffer voor admin-moderatie)
-- ============================================================

DROP FUNCTION IF EXISTS public.toggle_message_reaction(UUID, TEXT);

ALTER TABLE public.pool_messages
  DROP COLUMN IF EXISTS reactions_json,
  DROP COLUMN IF EXISTS reply_to_id,
  DROP COLUMN IF EXISTS expires_at;

-- Extend cleanup_old_data so daily cron removes old chat messages.
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
  deleted_chat            INT := 0;
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
    DELETE FROM client_errors
     WHERE resolved_at IS NOT NULL
       AND resolved_at < NOW() - INTERVAL '14 days';
    GET DIAGNOSTICS deleted_errors_resolved = ROW_COUNT;

    DELETE FROM client_errors
     WHERE resolved_at IS NULL
       AND last_seen_at < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS deleted_errors_old = ROW_COUNT;
  EXCEPTION WHEN undefined_table THEN
    deleted_errors_resolved := 0;
    deleted_errors_old := 0;
  END;

  DELETE FROM pool_messages
   WHERE created_at < NOW() - INTERVAL '1 day';
  GET DIAGNOSTICS deleted_chat = ROW_COUNT;

  RETURN jsonb_build_object(
    'deleted_activity_events',         deleted_activity,
    'deleted_user_sessions',           deleted_sessions,
    'deleted_audit_logs',              deleted_audit,
    'deleted_failed_login_attempts',   deleted_failed,
    'deleted_client_errors_resolved',  deleted_errors_resolved,
    'deleted_client_errors_old',       deleted_errors_old,
    'deleted_pool_messages',           deleted_chat,
    'ran_at',                          NOW()
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
