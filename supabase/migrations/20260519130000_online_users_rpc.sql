-- ============================================================
-- Heartbeat-based "who is online" (replaces Supabase Realtime
-- presence which was blocked by private-channel RLS).
--
-- The frontend calls user_heartbeat() every 60s while tab is
-- visible — this writes last_seen_at on the latest session.
-- get_online_users() returns everyone seen in the last N minutes.
-- ============================================================

-- Backfill any missing column from older migrations + add current_route
ALTER TABLE public.user_sessions
  ADD COLUMN IF NOT EXISTS ip_address    TEXT,
  ADD COLUMN IF NOT EXISTS current_route TEXT;

CREATE OR REPLACE FUNCTION public.get_online_users(_minutes INT DEFAULT 2)
RETURNS TABLE(
  user_id      UUID,
  name         TEXT,
  email        TEXT,
  avatar_url   TEXT,
  last_seen_at TIMESTAMPTZ,
  country      TEXT,
  device_info  TEXT,
  current_route TEXT,
  is_admin     BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (s.user_id)
    s.user_id,
    p.name,
    p.email,
    p.avatar_url,
    s.last_seen_at,
    s.country,
    s.device_info,
    s.current_route,
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = s.user_id AND ur.role = 'admin'
    ) AS is_admin
  FROM user_sessions s
  LEFT JOIN profiles p ON p.user_id = s.user_id
  WHERE s.last_seen_at IS NOT NULL
    AND s.last_seen_at >= NOW() - (_minutes || ' minutes')::INTERVAL
  ORDER BY s.user_id, s.last_seen_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_online_users(INT) TO authenticated;

-- Extend heartbeat so frontend can pass the current route in one call.
DROP FUNCTION IF EXISTS public.user_heartbeat();
DROP FUNCTION IF EXISTS public.user_heartbeat(TEXT);

CREATE OR REPLACE FUNCTION public.user_heartbeat(_route TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;

  UPDATE user_sessions
     SET last_seen_at  = NOW(),
         current_route = COALESCE(_route, current_route)
   WHERE id = (
     SELECT id FROM user_sessions
      WHERE user_id = auth.uid()
      ORDER BY login_at_utc DESC
      LIMIT 1
   );
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_heartbeat(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
