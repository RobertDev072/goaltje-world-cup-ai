-- Admin delete helpers (security definer)
CREATE OR REPLACE FUNCTION public.admin_delete_pool(p_pool_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM public.pool_messages WHERE pool_id = p_pool_id;
  DELETE FROM public.bonus_predictions WHERE pool_id = p_pool_id;
  DELETE FROM public.predictions WHERE pool_id = p_pool_id;
  DELETE FROM public.pool_members WHERE pool_id = p_pool_id;
  DELETE FROM public.pools WHERE id = p_pool_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_user_data(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  FOR rec IN SELECT id FROM public.pools WHERE created_by = p_user_id LOOP
    PERFORM public.admin_delete_pool(rec.id);
  END LOOP;

  DELETE FROM public.pool_messages WHERE user_id = p_user_id;
  DELETE FROM public.bonus_predictions WHERE user_id = p_user_id;
  DELETE FROM public.predictions WHERE user_id = p_user_id;
  DELETE FROM public.pool_members WHERE user_id = p_user_id;
  DELETE FROM public.user_sessions WHERE user_id = p_user_id;
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  DELETE FROM public.profiles WHERE user_id = p_user_id;
END;
$$;

