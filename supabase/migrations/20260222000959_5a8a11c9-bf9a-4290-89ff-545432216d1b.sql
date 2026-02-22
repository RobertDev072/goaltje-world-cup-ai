
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Only admins can view roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can manage roles
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create user_sessions table for login tracking
CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  login_at_utc timestamptz NOT NULL DEFAULT now(),
  device_info text
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can insert their own sessions
CREATE POLICY "Users can insert own sessions"
  ON public.user_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Only admins can read all sessions
CREATE POLICY "Admins can read all sessions"
  ON public.user_sessions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_login_at ON public.user_sessions(login_at_utc);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- Create admin stats function (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'users_today', (SELECT count(*) FROM public.profiles WHERE created_at >= CURRENT_DATE),
    'users_7d', (SELECT count(*) FROM public.profiles WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
    'users_30d', (SELECT count(*) FROM public.profiles WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'),
    'logins_today', (SELECT count(DISTINCT user_id) FROM public.user_sessions WHERE login_at_utc >= CURRENT_DATE),
    'logins_7d', (SELECT count(DISTINCT user_id) FROM public.user_sessions WHERE login_at_utc >= CURRENT_DATE - INTERVAL '7 days'),
    'logins_30d', (SELECT count(DISTINCT user_id) FROM public.user_sessions WHERE login_at_utc >= CURRENT_DATE - INTERVAL '30 days'),
    'total_pools', (SELECT count(*) FROM public.pools),
    'pools_today', (SELECT count(*) FROM public.pools WHERE created_at >= CURRENT_DATE),
    'pools_7d', (SELECT count(*) FROM public.pools WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
    'pools_30d', (SELECT count(*) FROM public.pools WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'),
    'avg_members_per_pool', (SELECT COALESCE(round(avg(cnt)::numeric, 1), 0) FROM (SELECT count(*) cnt FROM public.pool_members GROUP BY pool_id) sub),
    'total_predictions', (SELECT count(*) FROM public.predictions),
    'predictions_today', (SELECT count(*) FROM public.predictions WHERE created_at >= CURRENT_DATE),
    'predictions_7d', (SELECT count(*) FROM public.predictions WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
    'predictions_30d', (SELECT count(*) FROM public.predictions WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'),
    'predictors_7d', (SELECT count(DISTINCT user_id) FROM public.predictions WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
    'predictors_30d', (SELECT count(DISTINCT user_id) FROM public.predictions WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'),
    'top_pools', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
      SELECT p.name, count(pm.id) as member_count
      FROM public.pools p LEFT JOIN public.pool_members pm ON pm.pool_id = p.id
      GROUP BY p.id, p.name ORDER BY member_count DESC LIMIT 10
    ) t),
    'newest_pools', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
      SELECT name, created_at FROM public.pools ORDER BY created_at DESC LIMIT 5
    ) t)
  ) INTO result;

  RETURN result;
END;
$$;
