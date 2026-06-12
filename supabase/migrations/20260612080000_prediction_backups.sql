-- ============================================================
-- Eigen dagelijkse backup van voorspellingen (Free plan = geen
-- Supabase backups). Snapshot van predictions + bonus_predictions
-- in een tabel, downloadbaar + herstelbaar vanuit het admin-dashboard.
--
-- VEILIG: niets hierin verwijdert ooit voorspellingen. create maakt
-- een kopie; restore zet ALLEEN ontbrekende rijen terug (ON CONFLICT
-- DO NOTHING) en raakt bestaande voorspellingen niet aan.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.prediction_backups (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  kind             TEXT NOT NULL DEFAULT 'auto',   -- 'auto' | 'manual'
  prediction_count INT NOT NULL DEFAULT 0,
  bonus_count      INT NOT NULL DEFAULT 0,
  data             JSONB NOT NULL
);

ALTER TABLE public.prediction_backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read backups" ON public.prediction_backups;
CREATE POLICY "Admins read backups" ON public.prediction_backups
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ------------------------------------------------------------
-- create_prediction_backup: maak een snapshot + bewaar 14 nieuwste
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_prediction_backup(_kind TEXT DEFAULT 'auto')
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  preds  JSONB;
  bonus  JSONB;
  pcount INT;
  bcount INT;
  bid    UUID;
BEGIN
  SELECT COALESCE(jsonb_agg(to_jsonb(p)), '[]'::jsonb), COUNT(*)
    INTO preds, pcount FROM predictions p;
  SELECT COALESCE(jsonb_agg(to_jsonb(b)), '[]'::jsonb), COUNT(*)
    INTO bonus, bcount FROM bonus_predictions b;

  INSERT INTO prediction_backups (kind, prediction_count, bonus_count, data)
  VALUES (_kind, pcount, bcount,
          jsonb_build_object('predictions', preds, 'bonus_predictions', bonus))
  RETURNING id INTO bid;

  -- Retentie: hou de 14 nieuwste backups
  DELETE FROM prediction_backups
   WHERE id IN (SELECT id FROM prediction_backups ORDER BY created_at DESC OFFSET 14);

  RETURN jsonb_build_object('backup_id', bid, 'prediction_count', pcount, 'bonus_count', bcount);
END $$;

GRANT EXECUTE ON FUNCTION public.create_prediction_backup(TEXT) TO authenticated, service_role;

-- ------------------------------------------------------------
-- list_prediction_backups: lichte lijst (zonder de zware data-kolom)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_prediction_backups()
RETURNS TABLE(id UUID, created_at TIMESTAMPTZ, kind TEXT, prediction_count INT, bonus_count INT)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, created_at, kind, prediction_count, bonus_count
  FROM prediction_backups
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.list_prediction_backups() TO authenticated;

-- ------------------------------------------------------------
-- get_prediction_backup: volledige data van 1 backup (voor download)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_prediction_backup(_backup_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  SELECT data INTO d FROM prediction_backups WHERE id = _backup_id;
  RETURN d;
END $$;

GRANT EXECUTE ON FUNCTION public.get_prediction_backup(UUID) TO authenticated;

-- ------------------------------------------------------------
-- restore_prediction_backup: zet ONTBREKENDE voorspellingen terug.
-- VEILIG: ON CONFLICT DO NOTHING — overschrijft/verwijdert nooit iets.
-- Lock-triggers tijdelijk uit zodat ook voorspellingen voor verstreken
-- wedstrijden hersteld kunnen worden.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.restore_prediction_backup(_backup_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d JSONB;
  restored_preds INT := 0;
  restored_bonus INT := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  SELECT data INTO d FROM prediction_backups WHERE id = _backup_id;
  IF d IS NULL THEN RAISE EXCEPTION 'Backup not found'; END IF;

  ALTER TABLE predictions DISABLE TRIGGER enforce_prediction_lock;
  ALTER TABLE predictions DISABLE TRIGGER validate_prediction_lock;

  INSERT INTO predictions (user_id, pool_id, match_id, home_pred, away_pred, winner_pred, points_awarded)
  SELECT x.user_id, x.pool_id, x.match_id, x.home_pred, x.away_pred, x.winner_pred, x.points_awarded
  FROM jsonb_to_recordset(d->'predictions') AS x(
    user_id UUID, pool_id UUID, match_id UUID,
    home_pred INT, away_pred INT, winner_pred TEXT, points_awarded INT
  )
  -- alleen rijen waarvan de match nog bestaat
  WHERE EXISTS (SELECT 1 FROM matches m WHERE m.id = x.match_id)
  ON CONFLICT (user_id, pool_id, match_id) DO NOTHING;
  GET DIAGNOSTICS restored_preds = ROW_COUNT;

  ALTER TABLE predictions ENABLE TRIGGER enforce_prediction_lock;
  ALTER TABLE predictions ENABLE TRIGGER validate_prediction_lock;

  INSERT INTO bonus_predictions (user_id, pool_id, question_id, answer, points_awarded)
  SELECT y.user_id, y.pool_id, y.question_id, y.answer, y.points_awarded
  FROM jsonb_to_recordset(d->'bonus_predictions') AS y(
    user_id UUID, pool_id UUID, question_id UUID, answer TEXT, points_awarded INT
  )
  WHERE EXISTS (SELECT 1 FROM bonus_questions q WHERE q.id = y.question_id)
  ON CONFLICT (user_id, pool_id, question_id) DO NOTHING;
  GET DIAGNOSTICS restored_bonus = ROW_COUNT;

  RETURN jsonb_build_object(
    'restored_predictions', restored_preds,
    'restored_bonus', restored_bonus
  );
END $$;

GRANT EXECUTE ON FUNCTION public.restore_prediction_backup(UUID) TO authenticated;

-- Maak meteen een eerste backup
SELECT public.create_prediction_backup('initial');

NOTIFY pgrst, 'reload schema';
