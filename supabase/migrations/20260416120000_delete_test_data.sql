-- Verwijder testdata: test poule en Testspeler 1-60 gebruikers
-- Stap 1: verwijder alles gekoppeld aan de test poule
DO $$
DECLARE
  v_pool_id uuid;
  v_user_id uuid;
BEGIN
  -- Zoek de test poule
  SELECT id INTO v_pool_id FROM public.pools WHERE name ILIKE '%test%' LIMIT 1;

  IF v_pool_id IS NOT NULL THEN
    DELETE FROM public.pool_messages   WHERE pool_id = v_pool_id;
    DELETE FROM public.bonus_predictions WHERE pool_id = v_pool_id;
    DELETE FROM public.predictions     WHERE pool_id = v_pool_id;
    DELETE FROM public.pool_members    WHERE pool_id = v_pool_id;
    DELETE FROM public.pools           WHERE id = v_pool_id;
  END IF;

  -- Verwijder Testspeler profielen (en hun data)
  FOR v_user_id IN
    SELECT user_id FROM public.profiles WHERE name ILIKE 'Testspeler%'
  LOOP
    DELETE FROM public.pool_messages   WHERE user_id = v_user_id;
    DELETE FROM public.bonus_predictions WHERE user_id = v_user_id;
    DELETE FROM public.predictions     WHERE user_id = v_user_id;
    DELETE FROM public.pool_members    WHERE user_id = v_user_id;
    DELETE FROM public.user_roles      WHERE user_id = v_user_id;
    DELETE FROM public.profiles        WHERE user_id = v_user_id;
  END LOOP;
END;
$$;
