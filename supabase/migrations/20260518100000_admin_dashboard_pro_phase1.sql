-- ============================================================
-- Admin Dashboard Pro — Phase 1
--   - Login analytics (country, presence)
--   - User ban support
--   - Activity events feed (live, realtime-subscribable)
--   - Updated admin RPCs
-- ============================================================

-- ------------------------------------------------------------
-- 1. Extend user_sessions: country + last_seen_at
-- ------------------------------------------------------------
ALTER TABLE public.user_sessions
  ADD COLUMN IF NOT EXISTS country     TEXT,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_sessions_last_seen
  ON public.user_sessions(last_seen_at DESC NULLS LAST);

-- ------------------------------------------------------------
-- 2. Extend profiles: ban support
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS banned_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS banned_reason TEXT;

-- ------------------------------------------------------------
-- 3. activity_events — live feed table
--    Stores every notable action; realtime-subscribable by admins.
--    Auto-cleanup of rows > 7 days handled in cleanup edge function.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  TEXT NOT NULL,                -- e.g. login, prediction_submitted, pool_joined, pool_created, admin_action
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_events_created_desc
  ON public.activity_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_events_type_created
  ON public.activity_events(event_type, created_at DESC);

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read activity_events"  ON public.activity_events;
CREATE POLICY "Admins read activity_events"
  ON public.activity_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users insert own activity"  ON public.activity_events;
CREATE POLICY "Users insert own activity"
  ON public.activity_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins delete activity"  ON public.activity_events;
CREATE POLICY "Admins delete activity"
  ON public.activity_events FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Realtime publication (so admin dashboard can subscribe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'activity_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_events;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- publication may not exist on local; safe to ignore
  NULL;
END $$;

-- ------------------------------------------------------------
-- 4. Helper: insert activity event (called from triggers/code)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_activity_event(
  _event_type TEXT,
  _payload    JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.activity_events (event_type, user_id, payload)
  VALUES (_event_type, auth.uid(), COALESCE(_payload, '{}'::jsonb))
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_activity_event(TEXT, JSONB) TO authenticated;

-- ------------------------------------------------------------
-- 5. Updated get_admin_users RPC — incl. country + is_banned
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_admin_users();
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE(
  id              UUID,
  name            TEXT,
  email           TEXT,
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ,
  login_count     BIGINT,
  last_login_at   TIMESTAMPTZ,
  last_device     TEXT,
  last_ip         TEXT,
  last_country    TEXT,
  pool_count      BIGINT,
  is_banned       BOOLEAN,
  is_admin        BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id                                              AS id,
    p.name,
    p.email,
    p.avatar_url,
    p.created_at,
    COUNT(DISTINCT s.id)::bigint                           AS login_count,
    MAX(s.login_at_utc)                                    AS last_login_at,
    (SELECT s2.device_info FROM user_sessions s2
       WHERE s2.user_id = p.user_id
       ORDER BY s2.login_at_utc DESC LIMIT 1)              AS last_device,
    (SELECT s3.ip_address FROM user_sessions s3
       WHERE s3.user_id = p.user_id
       ORDER BY s3.login_at_utc DESC LIMIT 1)              AS last_ip,
    (SELECT s4.country FROM user_sessions s4
       WHERE s4.user_id = p.user_id AND s4.country IS NOT NULL
       ORDER BY s4.login_at_utc DESC LIMIT 1)              AS last_country,
    COUNT(DISTINCT pm.pool_id)::bigint                     AS pool_count,
    COALESCE(p.is_banned, FALSE)                           AS is_banned,
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = p.user_id AND ur.role = 'admin'
    )                                                      AS is_admin
  FROM profiles p
  LEFT JOIN user_sessions s  ON s.user_id  = p.user_id
  LEFT JOIN pool_members  pm ON pm.user_id = p.user_id
  GROUP BY p.user_id, p.name, p.email, p.avatar_url, p.created_at, p.is_banned
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_users() TO authenticated;

-- ------------------------------------------------------------
-- 6. Admin overview stats — single roundtrip for overview cards
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_admin_overview_stats();
CREATE OR REPLACE FUNCTION public.get_admin_overview_stats()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  SELECT jsonb_build_object(
    'total_users',          (SELECT COUNT(*) FROM profiles),
    'banned_users',         (SELECT COUNT(*) FROM profiles WHERE is_banned),
    'total_pools',          (SELECT COUNT(*) FROM pools),
    'predictions_today',    (SELECT COUNT(*) FROM predictions
                              WHERE created_at >= CURRENT_DATE),
    'logins_today',         (SELECT COUNT(*) FROM user_sessions
                              WHERE login_at_utc >= CURRENT_DATE),
    'logins_7d',            (SELECT COUNT(*) FROM user_sessions
                              WHERE login_at_utc >= NOW() - INTERVAL '7 days'),
    'unique_users_7d',      (SELECT COUNT(DISTINCT user_id) FROM user_sessions
                              WHERE login_at_utc >= NOW() - INTERVAL '7 days'),
    'unique_users_30d',     (SELECT COUNT(DISTINCT user_id) FROM user_sessions
                              WHERE login_at_utc >= NOW() - INTERVAL '30 days'),
    'active_pools_7d',      (SELECT COUNT(DISTINCT pool_id) FROM predictions
                              WHERE created_at >= NOW() - INTERVAL '7 days'),
    'matches_pending_result', (SELECT COUNT(*) FROM matches
                                WHERE status IN ('scheduled','live')
                                  AND kickoff_utc < NOW() - INTERVAL '2 hours')
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_overview_stats() TO authenticated;

-- ------------------------------------------------------------
-- 7. Ban / unban user
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_user_ban(
  _user_id UUID,
  _ban     BOOLEAN,
  _reason  TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot ban yourself';
  END IF;

  UPDATE profiles
     SET is_banned     = _ban,
         banned_at     = CASE WHEN _ban THEN NOW() ELSE NULL END,
         banned_reason = CASE WHEN _ban THEN _reason ELSE NULL END
   WHERE user_id = _user_id;

  -- Audit
  INSERT INTO audit_logs (user_id, event_type, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    CASE WHEN _ban THEN 'user_banned' ELSE 'user_unbanned' END,
    'profile',
    _user_id,
    jsonb_build_object('reason', _reason, 'target_user_id', _user_id)
  );

  -- Live activity
  INSERT INTO activity_events (event_type, user_id, payload)
  VALUES (
    CASE WHEN _ban THEN 'admin_user_banned' ELSE 'admin_user_unbanned' END,
    auth.uid(),
    jsonb_build_object('target_user_id', _user_id, 'reason', _reason)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_ban(UUID, BOOLEAN, TEXT) TO authenticated;

-- ------------------------------------------------------------
-- 8. Heartbeat — update last_seen_at on latest session
--    Called from client every ~60s while tab is focused.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_heartbeat()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  UPDATE user_sessions
     SET last_seen_at = NOW()
   WHERE id = (
     SELECT id FROM user_sessions
      WHERE user_id = auth.uid()
      ORDER BY login_at_utc DESC
      LIMIT 1
   );
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_heartbeat() TO authenticated;

NOTIFY pgrst, 'reload schema';
