-- ============================================================
-- leave_pool: laat eigenaar veilig vertrekken
--
-- Voorheen: alleen niet-eigenaren konden de poule verlaten omdat
-- eigenaarschap geen overdracht had. Nu:
--   - Niet-eigenaar: gewone delete van membership + eigen predictions
--   - Eigenaar met >0 andere leden: rol overdragen aan langst-actieve
--     andere admin; valt terug op langst-actieve gewone lid; daarna
--     vertrek zoals een gewoon lid
--   - Eigenaar als enig lid: hele poule + predictions verwijderen
-- ============================================================

CREATE OR REPLACE FUNCTION public.leave_pool(_pool_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid          UUID := auth.uid();
  my_role      TEXT;
  other_count  INT;
  new_owner_id UUID;
  pool_deleted BOOLEAN := false;
  ownership_transferred BOOLEAN := false;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO my_role
    FROM pool_members
   WHERE pool_id = _pool_id AND user_id = uid;

  IF my_role IS NULL THEN
    RAISE EXCEPTION 'You are not a member of this pool';
  END IF;

  SELECT COUNT(*) INTO other_count
    FROM pool_members
   WHERE pool_id = _pool_id AND user_id <> uid;

  -- Eigenaar (owner/admin met aanmaak-rol) verlaat
  IF my_role IN ('owner', 'admin') THEN
    IF other_count = 0 THEN
      -- Hele poule opdoeken
      DELETE FROM predictions       WHERE pool_id = _pool_id;
      DELETE FROM bonus_predictions  WHERE pool_id = _pool_id;
      DELETE FROM pool_messages      WHERE pool_id = _pool_id;
      DELETE FROM pool_members       WHERE pool_id = _pool_id;
      DELETE FROM pools              WHERE id      = _pool_id;
      pool_deleted := true;
    ELSE
      -- Eigenaarschap overdragen: voorkeur voor andere admin,
      -- anders langst-actieve member
      SELECT user_id INTO new_owner_id
        FROM pool_members
       WHERE pool_id = _pool_id AND user_id <> uid AND role = 'admin'
       ORDER BY joined_at ASC
       LIMIT 1;

      IF new_owner_id IS NULL THEN
        SELECT user_id INTO new_owner_id
          FROM pool_members
         WHERE pool_id = _pool_id AND user_id <> uid
         ORDER BY joined_at ASC
         LIMIT 1;
      END IF;

      UPDATE pool_members
         SET role = 'admin'
       WHERE pool_id = _pool_id AND user_id = new_owner_id;

      DELETE FROM predictions       WHERE pool_id = _pool_id AND user_id = uid;
      DELETE FROM bonus_predictions  WHERE pool_id = _pool_id AND user_id = uid;
      DELETE FROM pool_messages      WHERE pool_id = _pool_id AND user_id = uid;
      DELETE FROM pool_members       WHERE pool_id = _pool_id AND user_id = uid;
      ownership_transferred := true;
    END IF;
  ELSE
    -- Gewoon lid
    DELETE FROM predictions       WHERE pool_id = _pool_id AND user_id = uid;
    DELETE FROM bonus_predictions  WHERE pool_id = _pool_id AND user_id = uid;
    DELETE FROM pool_messages      WHERE pool_id = _pool_id AND user_id = uid;
    DELETE FROM pool_members       WHERE pool_id = _pool_id AND user_id = uid;
  END IF;

  RETURN jsonb_build_object(
    'pool_deleted', pool_deleted,
    'ownership_transferred', ownership_transferred,
    'new_owner_id', new_owner_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_pool(UUID) TO authenticated;
NOTIFY pgrst, 'reload schema';
