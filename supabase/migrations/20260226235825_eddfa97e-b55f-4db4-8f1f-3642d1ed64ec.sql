
CREATE OR REPLACE FUNCTION public.lookup_pool_by_invite_code(_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object('id', p.id, 'name', p.name)
  INTO result
  FROM public.pools p
  WHERE p.invite_code = upper(_code);

  RETURN result;
END;
$$;
