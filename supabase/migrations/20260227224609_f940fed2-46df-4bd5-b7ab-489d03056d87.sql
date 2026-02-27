CREATE POLICY "Pool members can view tenant" ON public.tenants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pools p
      JOIN public.pool_members pm ON pm.pool_id = p.id
      WHERE p.tenant_id = tenants.id
      AND pm.user_id = auth.uid()
    )
  );