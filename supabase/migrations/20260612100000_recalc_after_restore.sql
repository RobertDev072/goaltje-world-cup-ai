-- ============================================================
-- Herbereken punten automatisch na een restore.
--
-- Reden: een backup bewaart points_awarded zoals ze op dat moment
-- waren. Als matches na de backup gecorrigeerd zijn (score-fix,
-- status-wijziging), zouden teruggezette voorspellingen oude
-- punten houden. Daarom: na de restore alle aangeraakte matches
-- recalculeren op basis van de ACTUELE matches.home_score /
-- away_score / status.
--
-- Aanpak:
--   1) Nieuwe helper recalc_match_predictions(_match_id) die de
--      scoring-logica één-op-één uit de bestaande trigger
--      recalculate_match_points() repliceert, maar callable is
--      vanuit andere RPCs (de trigger zelf is BEFORE UPDATE en
--      kan dus niet direct worden aangeroepen).
--   2) restore_prediction_backup() verzamelt de match-ids van
--      teruggezette voorspellingen en roept de helper daarvoor
--      aan na de insert.
-- ============================================================

CREATE OR REPLACE FUNCTION public.recalc_match_predictions(_match_id UUID)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  m            RECORD;
  pred         RECORD;
  pool_rules   JSONB;
  pts          INT;
  pred_diff    INT;
  actual_diff  INT;
  pred_result  INT;
  actual_result INT;
  touched      INT := 0;
BEGIN
  SELECT id, home_score, away_score, status
    INTO m
  FROM public.matches WHERE id = _match_id;

  IF m.id IS NULL THEN
    RETURN 0;
  END IF;

  -- Geen geldige uitslag → alle punten op 0
  IF m.status IN ('cancelled', 'void', 'postponed')
     OR m.home_score IS NULL OR m.away_score IS NULL THEN
    UPDATE public.predictions
       SET points_awarded = 0
     WHERE match_id = m.id
       AND points_awarded IS DISTINCT FROM 0;
    GET DIAGNOSTICS touched = ROW_COUNT;
    RETURN touched;
  END IF;

  FOR pred IN
    SELECT p.id, p.home_pred, p.away_pred, p.pool_id, p.points_awarded
      FROM public.predictions p
     WHERE p.match_id = m.id
       AND p.home_pred IS NOT NULL
       AND p.away_pred IS NOT NULL
  LOOP
    SELECT scoring_rules_json INTO pool_rules
      FROM public.pools WHERE id = pred.pool_id;

    pts := 0;

    IF pred.home_pred = m.home_score AND pred.away_pred = m.away_score THEN
      pts := COALESCE((pool_rules->>'exact')::INT, 6);
    ELSE
      pred_diff     := pred.home_pred - pred.away_pred;
      actual_diff   := m.home_score   - m.away_score;
      pred_result   := SIGN(pred_diff);
      actual_result := SIGN(actual_diff);

      IF pred_result = actual_result THEN
        IF pred_diff = actual_diff THEN
          pts := COALESCE((pool_rules->>'goal_diff')::INT, 4);
        ELSE
          pts := COALESCE((pool_rules->>'result')::INT, 3);
        END IF;
      END IF;
    END IF;

    IF pred.points_awarded IS DISTINCT FROM pts THEN
      UPDATE public.predictions
         SET points_awarded = pts
       WHERE id = pred.id;
      touched := touched + 1;
    END IF;
  END LOOP;

  RETURN touched;
END $$;

GRANT EXECUTE ON FUNCTION public.recalc_match_predictions(UUID) TO authenticated, service_role;

-- ------------------------------------------------------------
-- restore_prediction_backup met automatische recalc na herstel
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.restore_prediction_backup(_backup_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d             JSONB;
  rp            INT := 0;
  rb            INT := 0;
  matches_recalced INT := 0;
  preds_updated    INT := 0;
  mid              UUID;
  delta            INT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  SELECT data INTO d FROM prediction_backups WHERE id = _backup_id;
  IF d IS NULL THEN RAISE EXCEPTION 'Backup not found'; END IF;

  ALTER TABLE predictions DISABLE TRIGGER enforce_prediction_lock;
  ALTER TABLE predictions DISABLE TRIGGER validate_prediction_lock;

  -- Resolve elke voorspelling naar een match: 1) via teamcode-paar
  -- + kickoff, 2) fallback op het oude match_id als die nog bestaat.
  -- Snapshot-punten worden bewust NIET teruggezet (= 0); zo dwingen
  -- we een herberekening uit de actuele matches.
  WITH src AS (
    SELECT * FROM jsonb_to_recordset(d->'predictions') AS x(
      user_id UUID, pool_id UUID, match_id UUID,
      home_pred INT, away_pred INT, winner_pred TEXT, points_awarded INT,
      home_code TEXT, away_code TEXT, kickoff_utc TIMESTAMPTZ
    )
  ),
  resolved AS (
    SELECT
      s.user_id, s.pool_id, s.home_pred, s.away_pred, s.winner_pred,
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
  ),
  inserted AS (
    INSERT INTO predictions (user_id, pool_id, match_id, home_pred, away_pred, winner_pred, points_awarded)
    SELECT user_id, pool_id, resolved_match_id, home_pred, away_pred, winner_pred, 0
    FROM resolved
    WHERE resolved_match_id IS NOT NULL
    ON CONFLICT (user_id, pool_id, match_id) DO NOTHING
    RETURNING match_id
  )
  SELECT COUNT(*) INTO rp FROM inserted;

  -- Verzamel de unieke matches die zojuist nieuwe voorspellingen kregen,
  -- zodat we hun puntentelling kunnen herberekenen vanuit de actuele score.
  CREATE TEMP TABLE IF NOT EXISTS _restore_touched_matches (match_id UUID PRIMARY KEY) ON COMMIT DROP;
  TRUNCATE _restore_touched_matches;

  WITH src AS (
    SELECT * FROM jsonb_to_recordset(d->'predictions') AS x(
      user_id UUID, pool_id UUID, match_id UUID,
      home_pred INT, away_pred INT, winner_pred TEXT, points_awarded INT,
      home_code TEXT, away_code TEXT, kickoff_utc TIMESTAMPTZ
    )
  )
  INSERT INTO _restore_touched_matches (match_id)
  SELECT DISTINCT COALESCE(
    (SELECT m.id FROM matches m
       JOIN teams ht ON ht.id = m.home_team_id
       JOIN teams at ON at.id = m.away_team_id
      WHERE ht.short_name = s.home_code
        AND at.short_name = s.away_code
        AND m.kickoff_utc = s.kickoff_utc
      LIMIT 1),
    (SELECT m.id FROM matches m WHERE m.id = s.match_id)
  )
  FROM src s
  WHERE COALESCE(
    (SELECT m.id FROM matches m
       JOIN teams ht ON ht.id = m.home_team_id
       JOIN teams at ON at.id = m.away_team_id
      WHERE ht.short_name = s.home_code
        AND at.short_name = s.away_code
        AND m.kickoff_utc = s.kickoff_utc
      LIMIT 1),
    (SELECT m.id FROM matches m WHERE m.id = s.match_id)
  ) IS NOT NULL
  ON CONFLICT DO NOTHING;

  ALTER TABLE predictions ENABLE TRIGGER enforce_prediction_lock;
  ALTER TABLE predictions ENABLE TRIGGER validate_prediction_lock;

  -- Bonus terugzetten (alleen ontbrekende)
  INSERT INTO bonus_predictions (user_id, pool_id, question_id, answer, points_awarded)
  SELECT y.user_id, y.pool_id, y.question_id, y.answer, y.points_awarded
  FROM jsonb_to_recordset(d->'bonus_predictions') AS y(
    user_id UUID, pool_id UUID, question_id UUID, answer TEXT, points_awarded INT
  )
  WHERE EXISTS (SELECT 1 FROM bonus_questions q WHERE q.id = y.question_id)
  ON CONFLICT (user_id, pool_id, question_id) DO NOTHING;
  GET DIAGNOSTICS rb = ROW_COUNT;

  -- Herbereken punten per betrokken match
  FOR mid IN SELECT match_id FROM _restore_touched_matches LOOP
    delta := public.recalc_match_predictions(mid);
    IF delta > 0 THEN
      matches_recalced := matches_recalced + 1;
      preds_updated    := preds_updated + delta;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'restored_predictions', rp,
    'restored_bonus',       rb,
    'matches_recalced',     matches_recalced,
    'predictions_repointed', preds_updated
  );
END $$;

GRANT EXECUTE ON FUNCTION public.restore_prediction_backup(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
