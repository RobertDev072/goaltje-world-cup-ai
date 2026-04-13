-- Fix admin_delete_user_data to work when called via service role key
-- (auth.uid() is null in service role context; security is enforced by the edge function)

CREATE OR REPLACE FUNCTION public.admin_delete_user_data(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
BEGIN
  -- Allow if called via service role (auth.uid() IS NULL) or by an admin user
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Delete all pools created by this user (inline to avoid nested admin check)
  FOR rec IN SELECT id FROM public.pools WHERE created_by = p_user_id LOOP
    DELETE FROM public.pool_messages    WHERE pool_id = rec.id;
    DELETE FROM public.bonus_predictions WHERE pool_id = rec.id;
    DELETE FROM public.predictions       WHERE pool_id = rec.id;
    DELETE FROM public.pool_members      WHERE pool_id = rec.id;
    DELETE FROM public.pools             WHERE id = rec.id;
  END LOOP;

  -- Delete remaining user data
  DELETE FROM public.pool_messages     WHERE user_id = p_user_id;
  DELETE FROM public.bonus_predictions WHERE user_id = p_user_id;
  DELETE FROM public.predictions       WHERE user_id = p_user_id;
  DELETE FROM public.pool_members      WHERE user_id = p_user_id;
  DELETE FROM public.user_sessions     WHERE user_id = p_user_id;
  DELETE FROM public.user_roles        WHERE user_id = p_user_id;
  DELETE FROM public.profiles          WHERE user_id = p_user_id;
END;
$$;
