
-- Bonus questions table for tournament-wide predictions
CREATE TABLE public.bonus_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  type text NOT NULL DEFAULT 'team', -- team, player, number
  options_json jsonb, -- optional preset options
  correct_answer text, -- filled at tournament end
  points integer NOT NULL DEFAULT 10,
  closes_at timestamptz NOT NULL, -- when predictions lock
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bonus_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bonus questions are public" ON public.bonus_questions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage bonus questions" ON public.bonus_questions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Bonus predictions per user per pool
CREATE TABLE public.bonus_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pool_id uuid NOT NULL REFERENCES public.pools(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.bonus_questions(id) ON DELETE CASCADE,
  answer text NOT NULL,
  points_awarded integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, pool_id, question_id)
);

ALTER TABLE public.bonus_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Insert own bonus predictions" ON public.bonus_predictions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update own bonus predictions" ON public.bonus_predictions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "View bonus predictions in own pools" ON public.bonus_predictions
  FOR SELECT TO authenticated USING (public.is_pool_member(auth.uid(), pool_id));

-- Seed default bonus questions (lock at tournament start)
INSERT INTO public.bonus_questions (question, type, points, closes_at) VALUES
  ('Wie wordt wereldkampioen?', 'team', 15, '2026-06-11T16:00:00Z'),
  ('Wie wordt topscorer van het toernooi?', 'player', 10, '2026-06-11T16:00:00Z'),
  ('Hoeveel goals worden er in totaal gescoord?', 'number', 10, '2026-06-11T16:00:00Z'),
  ('Welk team is de grootste verrassing (verste ronde)?', 'team', 10, '2026-06-11T16:00:00Z');
