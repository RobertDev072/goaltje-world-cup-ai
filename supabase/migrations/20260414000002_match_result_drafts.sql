-- match_result_drafts: staging table for auto-fetched match results awaiting admin confirmation
CREATE TABLE IF NOT EXISTS public.match_result_drafts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    UUID        NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  home_score  INTEGER     NOT NULL,
  away_score  INTEGER     NOT NULL,
  source      TEXT        NOT NULL DEFAULT 'script',   -- 'script' | 'manual'
  note        TEXT,                                     -- e.g. "bron: ESPN, betrouwbaarheid: hoog"
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  status      TEXT        NOT NULL DEFAULT 'pending'    -- 'pending' | 'confirmed' | 'rejected'
);

-- Only one pending draft per match at a time
CREATE UNIQUE INDEX IF NOT EXISTS match_result_drafts_match_id_pending
  ON public.match_result_drafts(match_id)
  WHERE status = 'pending';

-- RLS: admins only
ALTER TABLE public.match_result_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read match_result_drafts"
  ON public.match_result_drafts FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin insert match_result_drafts"
  ON public.match_result_drafts FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin update match_result_drafts"
  ON public.match_result_drafts FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));
