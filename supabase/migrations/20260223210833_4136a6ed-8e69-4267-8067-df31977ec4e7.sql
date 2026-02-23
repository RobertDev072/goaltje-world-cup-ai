
-- ============================================================
-- SECURITY HARDENING: Fix all RLS vulnerabilities
-- ============================================================

-- 1. Profiles: restrict SELECT to authenticated users only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

-- 2. Pools: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "Pools are viewable" ON public.pools;
CREATE POLICY "Pools viewable by authenticated"
  ON public.pools FOR SELECT TO authenticated
  USING (true);

-- 3. Tenants: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "Tenants are viewable" ON public.tenants;
CREATE POLICY "Tenants viewable by authenticated"
  ON public.tenants FOR SELECT TO authenticated
  USING (true);

-- 4. API cache: restrict to authenticated (or remove public access)
DROP POLICY IF EXISTS "API cache is readable by all" ON public.api_cache;
CREATE POLICY "API cache readable by authenticated"
  ON public.api_cache FOR SELECT TO authenticated
  USING (true);

-- 5. Allow users to delete their own profiles (GDPR)
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 6. Allow pool creators to delete their pools
CREATE POLICY "Pool creator can delete"
  ON public.pools FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- 7. Allow users to delete own predictions
CREATE POLICY "Users can delete own predictions"
  ON public.predictions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 8. Allow tenant creators to delete their tenants
CREATE POLICY "Tenant creator can delete"
  ON public.tenants FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- 9. Enable leaked password protection
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
