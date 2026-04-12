-- Ensure prediction_deadline_utc is optional (computed in app as kickoff - 1h)
ALTER TABLE public.matches
  ALTER COLUMN prediction_deadline_utc DROP DEFAULT;

ALTER TABLE public.matches
  ALTER COLUMN prediction_deadline_utc DROP NOT NULL;

