-- ============================================================
-- Globale poel "Goaltje WK Globaal"
--
-- - Markeert één poel als globaal (pools.is_global)
-- - Maakt 'm aan als 'ie nog niet bestaat
-- - Trigger op nieuwe profiles: auto-enroll in globale poel
-- - Backfill bestaande users
-- - RPC award_global_top20_bonus(): admin-only, kent +50 bonuspunten
--   toe aan de top 20 via een synthetisch bonus-vraag-record. Dat
--   loopt door de bestaande leaderboard-aggregatie en is dus zonder
--   verdere code-aanpassing zichtbaar.
-- ============================================================

ALTER TABLE public.pools
  ADD COLUMN IF NOT EXISTS is_global BOOLEAN NOT NULL DEFAULT false;

-- Vaste UUID zodat de poel terugvindbaar is vanuit de frontend.
INSERT INTO public.pools (id, name, invite_code, is_global, created_by)
SELECT
  '00000000-0000-4000-8000-000000000001'::uuid,
  'Goaltje WK Globaal',
  'GLOBAAL2026',
  true,
  COALESCE(
    (SELECT user_id FROM public.user_roles WHERE role = 'admin' LIMIT 1),
    (SELECT user_id FROM public.profiles ORDER BY created_at ASC LIMIT 1)
  )
WHERE NOT EXISTS (SELECT 1 FROM public.pools WHERE is_global = true);

-- Backfill: alle bestaande profiles als lid van de globale poel
INSERT INTO public.pool_members (pool_id, user_id, role)
SELECT
  (SELECT id FROM public.pools WHERE is_global = true LIMIT 1),
  pr.user_id,
  'member'
FROM public.profiles pr
WHERE NOT EXISTS (
  SELECT 1 FROM public.pool_members pm
  WHERE pm.user_id = pr.user_id
    AND pm.pool_id = (SELECT id FROM public.pools WHERE is_global = true LIMIT 1)
)
ON CONFLICT DO NOTHING;

-- Trigger: nieuwe profiles → auto-enroll
CREATE OR REPLACE FUNCTION public.auto_enroll_global_pool()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  global_id UUID;
BEGIN
  SELECT id INTO global_id FROM pools WHERE is_global = true LIMIT 1;
  IF global_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO pool_members (pool_id, user_id, role)
  VALUES (global_id, NEW.user_id, 'member')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_enroll_global_pool ON public.profiles;
CREATE TRIGGER trg_auto_enroll_global_pool
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_enroll_global_pool();

-- Synthetisch bonus-vraag-record voor de top-20 +50 punten regeling.
-- Closes_at in het verleden = al gesloten (gebruikers zien deze vraag
-- niet in de Bracket-UI omdat ze al gesloten is; alleen het effect
-- op punten telt).
INSERT INTO public.bonus_questions (id, question, type, points, closes_at)
VALUES (
  '00000000-0000-4000-8000-000000000099',
  '[SYSTEM] Top 20 globaal — bonusplaats',
  'team', 50, '2026-01-01T00:00:00Z'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- award_global_top20_bonus: admin draait dit na afloop van het WK
-- om +50 bonuspunten te verdelen aan de top 20 in de globale poel.
-- ============================================================
CREATE OR REPLACE FUNCTION public.award_global_top20_bonus()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  global_pool_id UUID;
  bonus_qid      UUID := '00000000-0000-4000-8000-000000000099';
  awarded        INT := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  SELECT id INTO global_pool_id FROM pools WHERE is_global = true LIMIT 1;
  IF global_pool_id IS NULL THEN
    RAISE EXCEPTION 'Global pool not found';
  END IF;

  -- Wis vorige top-20 toekenning (idempotent)
  DELETE FROM bonus_predictions
   WHERE question_id = bonus_qid AND pool_id = global_pool_id;

  -- Insert nieuwe top-20: rank op basis van regulier prediction-totaal
  WITH top20 AS (
    SELECT pm.user_id,
           COALESCE(SUM(p.points_awarded), 0) AS total_pts
      FROM pool_members pm
      LEFT JOIN predictions p
        ON p.user_id = pm.user_id AND p.pool_id = pm.pool_id
     WHERE pm.pool_id = global_pool_id
     GROUP BY pm.user_id
     ORDER BY total_pts DESC
     LIMIT 20
  )
  INSERT INTO bonus_predictions (pool_id, user_id, question_id, answer, points_awarded)
  SELECT global_pool_id, user_id, bonus_qid, 'TOP_20', 50
    FROM top20;

  GET DIAGNOSTICS awarded = ROW_COUNT;
  RETURN awarded;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_global_top20_bonus() TO authenticated;

NOTIFY pgrst, 'reload schema';
