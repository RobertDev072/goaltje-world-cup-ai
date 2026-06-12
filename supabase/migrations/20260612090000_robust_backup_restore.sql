-- ============================================================
-- Backup robuust maken tegen wijzigende match-id's.
--
-- create_prediction_backup: bewaart nu per voorspelling ook de
-- teamcodes (home/away short_name) + kickoff, zodat herstel de
-- wedstrijd kan terugvinden ook als match-id's veranderen.
--
-- restore_prediction_backup: koppelt voorspellingen aan de juiste
-- match via teamcode-paar + kickoff (fallback op match_id). VEILIG:
-- ON CONFLICT DO NOTHING, verwijdert/overschrijft nooit.
-- ============================================================

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
  -- Voorspellingen + verrijkt met teamcodes en kickoff van de wedstrijd
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb), COUNT(*)
    INTO preds, pcount
  FROM (
    SELECT p.user_id, p.pool_id, p.match_id, p.home_pred, p.away_pred,
           p.winner_pred, p.points_awarded,
           ht.short_name AS home_code,
           at.short_name AS away_code,
           m.kickoff_utc
    FROM predictions p
    JOIN matches m  ON m.id = p.match_id
    LEFT JOIN teams ht ON ht.id = m.home_team_id
    LEFT JOIN teams at ON at.id = m.away_team_id
  ) t;

  SELECT COALESCE(jsonb_agg(to_jsonb(b)), '[]'::jsonb), COUNT(*)
    INTO bonus, bcount FROM bonus_predictions b;

  INSERT INTO prediction_backups (kind, prediction_count, bonus_count, data)
  VALUES (_kind, pcount, bcount,
          jsonb_build_object('predictions', preds, 'bonus_predictions', bonus))
  RETURNING id INTO bid;

  DELETE FROM prediction_backups
   WHERE id IN (SELECT id FROM prediction_backups ORDER BY created_at DESC OFFSET 14);

  RETURN jsonb_build_object('backup_id', bid, 'prediction_count', pcount, 'bonus_count', bcount);
END $$;

GRANT EXECUTE ON FUNCTION public.create_prediction_backup(TEXT) TO authenticated, service_role;

-- ------------------------------------------------------------
-- restore: koppel via teamcode-paar + kickoff, val terug op match_id
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.restore_prediction_backup(_backup_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d JSONB;
  rp INT := 0;
  rb INT := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  SELECT data INTO d FROM prediction_backups WHERE id = _backup_id;
  IF d IS NULL THEN RAISE EXCEPTION 'Backup not found'; END IF;

  ALTER TABLE predictions DISABLE TRIGGER enforce_prediction_lock;
  ALTER TABLE predictions DISABLE TRIGGER validate_prediction_lock;

  WITH src AS (
    SELECT * FROM jsonb_to_recordset(d->'predictions') AS x(
      user_id UUID, pool_id UUID, match_id UUID,
      home_pred INT, away_pred INT, winner_pred TEXT, points_awarded INT,
      home_code TEXT, away_code TEXT, kickoff_utc TIMESTAMPTZ
    )
  ),
  resolved AS (
    SELECT
      s.user_id, s.pool_id, s.home_pred, s.away_pred, s.winner_pred, s.points_awarded,
      -- 1) match via teamcode-paar + kickoff, anders 2) oude match_id als die nog bestaat
      COALESCE(
        (SELECT m.id FROM matches m
           JOIN teams ht ON ht.id = m.home_team_id
           JOIN teams at ON at.id = m.away_team_id
          WHERE ht.short_name = s.home_code
            AND at.short_name = s.away_code
            AND m.kickoff_utc = s.kickoff_utc
          LIMIT 1),
        (SELECT m.id FROM matches m WHERE m.id = s.match_id)
      ) AS resolved_match_id
    FROM src s
  )
  INSERT INTO predictions (user_id, pool_id, match_id, home_pred, away_pred, winner_pred, points_awarded)
  SELECT user_id, pool_id, resolved_match_id, home_pred, away_pred, winner_pred, points_awarded
  FROM resolved
  WHERE resolved_match_id IS NOT NULL
  ON CONFLICT (user_id, pool_id, match_id) DO NOTHING;
  GET DIAGNOSTICS rp = ROW_COUNT;

  ALTER TABLE predictions ENABLE TRIGGER enforce_prediction_lock;
  ALTER TABLE predictions ENABLE TRIGGER validate_prediction_lock;

  INSERT INTO bonus_predictions (user_id, pool_id, question_id, answer, points_awarded)
  SELECT y.user_id, y.pool_id, y.question_id, y.answer, y.points_awarded
  FROM jsonb_to_recordset(d->'bonus_predictions') AS y(
    user_id UUID, pool_id UUID, question_id UUID, answer TEXT, points_awarded INT
  )
  WHERE EXISTS (SELECT 1 FROM bonus_questions q WHERE q.id = y.question_id)
  ON CONFLICT (user_id, pool_id, question_id) DO NOTHING;
  GET DIAGNOSTICS rb = ROW_COUNT;

  RETURN jsonb_build_object('restored_predictions', rp, 'restored_bonus', rb);
END $$;

GRANT EXECUTE ON FUNCTION public.restore_prediction_backup(UUID) TO authenticated;

-- Maak meteen een verse robuuste backup (met teamcodes)
SELECT public.create_prediction_backup('manual');

NOTIFY pgrst, 'reload schema';
