-- ============================================================
-- Admin gebruikersoverzicht: IP tracking + get_admin_users RPC
-- ============================================================

-- 1. Voeg ip_address kolom toe aan user_sessions
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- 2. Admins kunnen user_sessions verwijderen (bij gebruiker verwijderen)
DROP POLICY IF EXISTS "Admins can delete all sessions" ON public.user_sessions;
CREATE POLICY "Admins can delete all sessions"
  ON public.user_sessions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. RPC: Haal alle gebruikers op voor admin dashboard
--    Returns: gebruikers uit profiles + sessie-info + poule-tellingen
DROP FUNCTION IF EXISTS public.get_admin_users();
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE(
  id           uuid,
  name         text,
  avatar_url   text,
  created_at   timestamptz,
  login_count  bigint,
  last_login_at timestamptz,
  last_device  text,
  last_ip      text,
  pool_count   bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id                                   AS id,
    p.name,
    p.avatar_url,
    p.created_at,
    COUNT(DISTINCT s.id)::bigint               AS login_count,
    MAX(s.login_at_utc)                         AS last_login_at,
    (
      SELECT s2.device_info
      FROM user_sessions s2
      WHERE s2.user_id = p.user_id
      ORDER BY s2.login_at_utc DESC
      LIMIT 1
    )                                           AS last_device,
    (
      SELECT s3.ip_address
      FROM user_sessions s3
      WHERE s3.user_id = p.user_id
      ORDER BY s3.login_at_utc DESC
      LIMIT 1
    )                                           AS last_ip,
    COUNT(DISTINCT pm.pool_id)::bigint          AS pool_count
  FROM profiles p
  LEFT JOIN user_sessions s  ON s.user_id  = p.user_id
  LEFT JOIN pool_members  pm ON pm.user_id = p.user_id
  GROUP BY p.user_id, p.name, p.avatar_url, p.created_at
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_users() TO authenticated;
