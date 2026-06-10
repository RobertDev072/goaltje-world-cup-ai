-- ============================================================
-- Stadiums tabel + matches.stadium_id FK
--
-- Q&B's /stadiums endpoint geeft elke arena als entity met een
-- numeric id. We slaan ze hier op met external_id zodat de sync
-- ze idempotent kan upserten.
--
-- matches.venue (vrije tekst) blijft bestaan als denormalized
-- cache zodat de frontend zonder join nog steeds een venue-string
-- kan tonen — de sync vult 'm bij elke run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.stadiums (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id  TEXT UNIQUE,
  name         TEXT NOT NULL,
  city         TEXT,
  country      TEXT,
  capacity     INT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS stadium_id UUID REFERENCES public.stadiums(id);

CREATE INDEX IF NOT EXISTS idx_matches_stadium_id ON public.matches(stadium_id);

ALTER TABLE public.stadiums ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Stadiums readable by all" ON public.stadiums;
CREATE POLICY "Stadiums readable by all"
  ON public.stadiums FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage stadiums" ON public.stadiums;
CREATE POLICY "Admins manage stadiums"
  ON public.stadiums FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

NOTIFY pgrst, 'reload schema';
