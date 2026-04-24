-- Prediction sync — backwards-compat (na fase 1).
--
-- Tot nu toe sloeg MatchDetail elke voorspelling onvoorwaardelijk op in alle
-- pools van de user (zie comment in src/pages/MatchDetail.tsx). Met de nieuwe
-- opt-in toggle (bulk_predict_enabled, default false) zou dat plotseling stoppen
-- voor bestaande multi-pool users.
--
-- Daarom: voor elke user die nu in 2 of meer pools zit, zetten we de flag
-- automatisch aan en markeren we de onboarding als gezien — zodat hun
-- bestaande gedrag identiek blijft en ze geen modal hoeven door te klikken.
--
-- Idempotent: alleen rijen die nog op default (false) staan worden geraakt.

UPDATE public.profiles p
SET bulk_predict_enabled = true,
    sync_onboarded        = true,
    updated_at            = now()
WHERE NOT p.bulk_predict_enabled
  AND (
    SELECT COUNT(*) FROM public.pool_members pm
    WHERE pm.user_id = p.user_id
  ) >= 2;
