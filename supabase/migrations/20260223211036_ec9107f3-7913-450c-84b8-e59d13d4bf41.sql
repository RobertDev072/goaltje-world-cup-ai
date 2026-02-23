
-- Further security hardening

-- 1. API cache: restrict to admin only
DROP POLICY IF EXISTS "API cache readable by authenticated" ON public.api_cache;
CREATE POLICY "API cache readable by admins"
  ON public.api_cache FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Pools: only show private pool details to members (public pools visible to all auth users)
DROP POLICY IF EXISTS "Pools viewable by authenticated" ON public.pools;
CREATE POLICY "Pools viewable by members or public"
  ON public.pools FOR SELECT TO authenticated
  USING (
    privacy = 'public' 
    OR created_by = auth.uid()
    OR public.is_pool_member(auth.uid(), id)
  );

-- 3. Tenants: restrict to members of pools in that tenant or creators
DROP POLICY IF EXISTS "Tenants viewable by authenticated" ON public.tenants;
CREATE POLICY "Tenants viewable by creator or admin"
  ON public.tenants FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- 4. User sessions: users can only see own sessions
CREATE POLICY "Users can view own sessions"
  ON public.user_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
