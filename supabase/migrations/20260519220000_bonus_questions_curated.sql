-- ============================================================
-- Bonusvragen herzien: dedupe + nieuwe slimme set
--
-- - Verwijdert alle bestaande bonus-voorspellingen + vragen (we
--   zitten nog ver voor het WK; geen verlies)
-- - Plaatst 10 zorgvuldig gekozen vragen, allemaal 10 punten
-- - Sluit op 11 juni 2026, voor de openingswedstrijd
-- - Unique constraint op `question` om herhaalde seeds te blokkeren
-- ============================================================

DELETE FROM public.bonus_predictions;
DELETE FROM public.bonus_questions;

ALTER TABLE public.bonus_questions
  DROP CONSTRAINT IF EXISTS bonus_questions_question_unique;

ALTER TABLE public.bonus_questions
  ADD CONSTRAINT bonus_questions_question_unique UNIQUE (question);

INSERT INTO public.bonus_questions (question, type, points, closes_at) VALUES
  ('Wie wordt wereldkampioen?',                                       'team',   10, '2026-06-11T16:00:00Z'),
  ('Welk team eindigt als verliezend finalist?',                      'team',   10, '2026-06-11T16:00:00Z'),
  ('Wie wint de Gouden Schoen (topscorer)?',                          'player', 10, '2026-06-11T16:00:00Z'),
  ('Wie wint de Gouden Bal (beste speler van het toernooi)?',         'player', 10, '2026-06-11T16:00:00Z'),
  ('Hoeveel doelpunten worden er in totaal in de groepsfase gescoord?','number',10, '2026-06-11T16:00:00Z'),
  ('Hoeveel rode kaarten vallen er in het hele toernooi?',            'number', 10, '2026-06-11T16:00:00Z'),
  ('Hoeveel wedstrijden eindigen na verlenging of penalty''s?',       'number', 10, '2026-06-11T16:00:00Z'),
  ('Welk Afrikaans land komt het verst in het toernooi?',             'team',   10, '2026-06-11T16:00:00Z'),
  ('In welke ronde valt Nederland uit? (groep / 1/16 / 1/8 / 1/4 / 1/2 / finale)', 'text', 10, '2026-06-11T16:00:00Z'),
  ('Welk team wordt de grootste verrassing? (bereikt het verste z''n groep)',      'team',   10, '2026-06-11T16:00:00Z');

NOTIFY pgrst, 'reload schema';
