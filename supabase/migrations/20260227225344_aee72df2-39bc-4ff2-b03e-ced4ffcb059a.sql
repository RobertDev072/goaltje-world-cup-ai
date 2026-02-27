CREATE OR REPLACE FUNCTION public.lookup_pool_by_invite_code(_code text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'id', p.id,
    'name', p.name,
    'tenant_id', p.tenant_id,
    'tenant_name', t.name,
    'tenant_logo_url', t.logo_url,
    'tenant_primary_color', t.primary_color,
    'tenant_secondary_color', t.secondary_color
  )
  INTO result
  FROM public.pools p
  LEFT JOIN public.tenants t ON t.id = p.tenant_id
  WHERE p.invite_code = upper(_code);

  RETURN result;
END;
$$;