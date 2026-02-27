CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT json_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'total_pools', (SELECT count(*) FROM public.pools),
    'total_predictions', (SELECT count(*) FROM public.predictions)
  );
$$;