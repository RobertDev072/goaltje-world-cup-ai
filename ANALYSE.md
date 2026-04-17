# Goaltje WK 2026 — Applicatie Analyse

> Gegenereerd: 17 april 2026 | Versie: post-admin-overhaul

---

## 1. Huidige staat van de applicatie

### Pagina's (`src/pages/`)

| Pagina | Route | Auth | Omschrijving |
|--------|-------|------|-------------|
| `MarketingHome` | `/` | Nee | Landingspagina met uitleg + CTA |
| `Auth` | `/login`, `/signup` | Nee | Inloggen, registreren |
| `ResetPassword` | `/reset-password` | Nee | Wachtwoord herstellen |
| `Matches` | `/app/matches` | Ja | Alle wedstrijden + voorspellingen invullen |
| `MatchDetail` | `/app/matches/:id` | Ja | Wedstrijd detail + statistieken |
| `Pool` | `/app/pool` | Ja | Poule-overzicht, aanmaken |
| `PoolDetail` | `/app/pool/:id` | Ja | Ranglijst + leden + chat |
| `PoolRanking` | `/app/pool/:id/ranking` | Ja | Uitgebreide ranglijst |
| `Leaderboard` | `/app/leaderboard` | Ja | Globale ranglijst |
| `Profile` | `/app/profile` | Ja | Profiel bewerken + instellingen |
| `Bracket` | `/app/bracket` | Ja | WK-schema bracket-weergave |
| `HelpPage` | `/app/help` | Ja | FAQ en uitleg |
| `AdminDashboard` | `/app/admin` | Admin | Volledig admin panel (ERP-layout op desktop) |
| `AdminUsers` | `/app/admin/users` | Admin | Gebruikersbeheer |
| `AdminActivity` | `/app/admin/activity` | Admin | Activiteitenlog (registraties, logins, audit) |
| `JoinPool` | `/join/:code` | Nee | Publieke join-via-invite-link flow |
| SEO-pagina's | `/wk-poule`, `/en/...` | Nee | ~10 SEO-landingspagina's NL + EN |

### Database tabellen

| Tabel | Doel |
|-------|------|
| `matches` | 104 WK 2026 wedstrijden, scores, status, deadlines |
| `teams` | 48 nationale teams met vlaggen |
| `pools` | Voorspelpoules met custom scoringsregels |
| `pool_members` | Lidmaatschap + rollen per poule |
| `predictions` | Gebruikersvoorspellingen per wedstrijd per poule |
| `profiles` | Naam, avatar, email per gebruiker |
| `user_sessions` | Login-sessies met device info + IP |
| `audit_logs` | Uitgebreid auditlogboek (login, logout, pool CRUD, etc.) |
| `match_result_drafts` | Concept-uitslagen vanuit extern script, wacht op admin-bevestiging |
| `bonus_questions` | Bonusvragen (bijv. topscorer, kampioen) |
| `bonus_predictions` | Gebruikersantwoorden op bonusvragen |
| `match_events` | Goals, kaarten, wissels per wedstrijd |
| `pool_messages` | Real-time chat per poule |
| `wk_news_cache` | AI-gegenereerd wedstrijdnieuws (gecached) |
| `user_roles` | Admin/moderator rollen |
| `tenants` | White-label branding configuratie |
| `api_cache` / `api_usage` | Externe API response caching |

### Edge Functions (`supabase/functions/`)

| Functie | Doel |
|---------|------|
| `seed-wc2026` | Seed 104 WK-wedstrijden + 48 teams |
| `seed-test-data` | Testdata aanmaken |
| `admin-status` | Admin metadata endpoint |
| `admin-users` | Gebruiker verwijderen via service role |
| `recalc-all` | Globale puntenherberekening triggeren |
| `log-login` | Login vastleggen met IP (Cloudflare header) |
| `log-event` | Generiek audit event logger (IP + user-agent) |
| `ingest-results` | Ontvangen van uitslagen vanuit extern dagelijks script |

### Utility modules (`src/lib/`)

| Module | Doel |
|--------|------|
| `scoring.ts` | Puntenberekening — enige bron van waarheid |
| `queryKeys.ts` | TanStack Query keys + stale times |
| `analytics.ts` | Event tracking (respecteert cookieconsent) |
| `consent.ts` | Cookie consent beheer |
| `seo.ts` | Meta tags, JSON-LD, Open Graph |
| `timezone.ts` | NL datum/tijd formatting |
| `predictionStatus.ts` | Deadline-logica voor voorspellingen |
| `errorLogger.ts` | Client-side foutopslag (localStorage) |
| `auditLogger.ts` | Helpers voor audit events naar log-event functie |

---

## 2. Wat ontbreekt

### Kritiek (blokkerende functionaliteit)

- **Automatische score-synchronisatie** — De `ingest-results` + `scripts/fetch-daily-results.mjs` infrastructuur is gebouwd maar nog niet operationeel (vereist cron + `INGEST_SECRET` instellen). Zonder dit moeten scores handmatig ingevoerd worden.
- **Email notificaties** — Geen e-mailsysteem: geen "match begint over 1 uur"-reminder, geen "ranglijst bijgewerkt"-melding, geen bevestigingsmail na pouledeelname.
- **Push notificaties** — PWA heeft service worker maar geen Web Push. Gebruikers missen live-score updates tenzij ze de app actief open hebben.

### Belangrijk (beïnvloedt gebruikerservaring)

- **Live score ticker** — Geen realtime scorebalk bovenin de app tijdens WK-wedstrijden. `useRealtimeMatches` hook bestaat, maar is niet prominent getoond.
- **Match countdown** — Geen zichtbare afteltimer bij aankomende wedstrijden ("nog 2u 15m" tot aftrap).
- **Voorspelling vergrendeling feedback** — Wanneer een deadline is verstreken, is de melding niet altijd duidelijk genoeg op mobiel.
- **Bonusvragen UX** — Bonusvragen zijn verborgen in een aparte tab; gebruikers missen ze snel.
- **Poule-uitnodiging via WhatsApp/socials** — Invite-link is aanwezig maar er is geen native deel-knop (navigator.share API).
- **Profiel foto uploaden** — Alleen URL invoeren; geen directe upload vanuit de app.
- **Offline modus** — PWA is geconfigureerd maar bij geen internet-verbinding is de app volledig onbruikbaar (geen gecachte weergave van ranglijst/matches).

### Wenselijk (kwaliteitsverbetering)

- **Email wijzigen** — Gebruikers kunnen hun naam wijzigen maar niet hun emailadres.
- **Account verwijderen** — Geen self-service account-verwijdering (GDPR-relevant).
- **Poule statistieken** — Geen grafieken van puntenverloop per week binnen een poule.
- **Wedstrijd statistieken voor gebruikers** — Admins zien voorspellingsverdeling; gewone gebruikers niet.
- **Notificaties centrum** — Geen meldingengeschiedenis (bijv. "Jij hebt 6 punten gekregen voor Nederland-Argentinië").
- **Dark/Light mode toggle** — App gebruikt dark mode maar er is geen toggle voor gebruikers die liever light mode willen.

---

## 3. Verbeterpunten voor bestaande onderdelen

### Admin Dashboard
- ✅ ERP-sidebar layout op desktop (recent gebouwd)
- ✅ Gebruikersoverzicht met IP/device/last login (recent gebouwd)
- ✅ Audit log (recent gebouwd)
- **Ontbreekt nog:** bulk acties (bijv. meerdere gebruikers verwijderen), exportknop voor gebruikerslijst (CSV)
- **Ontbreekt nog:** directe link per gebruiker naar hun voorspellingen

### Ranglijst
- `get_pool_leaderboard()` herberekent bij elke query — overweeg een gecachte materialized view voor grote poules (100+ leden)
- Geen paginering op publieke ranglijst bij veel deelnemers

### Voorspellingspagina (`Matches`)
- Invullen van alle 104 voorspellingen is lang scrollen; filter op "nog niet ingevuld" zou helpen
- Geen bulk-invul optie ("vul alle resterende als gelijkspel")

### Chat (`pool_messages`)
- Geen moderatie-mogelijkheid voor poule-admins (alleen globale admins kunnen berichten verwijderen)
- Geen reacties of emoji-reacties op berichten
- Berichten laden één keer; geen automatisch refresh tenzij realtime Supabase subscription actief is

### MatchDetail
- `wk_news_cache` AI-nieuws werkt maar de edge function die het genereert is niet in de repo (`fetch-scores`, `match-news` zijn geconfigureerd maar de functies ontbreken)

---

## 4. Technische schuld

| Probleem | Bestand | Ernst |
|---------|---------|-------|
| `src/integrations/supabase/types.ts` bevat geen `match_result_drafts`, `audit_logs` — moet geregenereerd | `types.ts` | Hoog |
| Migraties 20260417000001/2/3 en 20260414000002 staan in de repo maar zijn **niet applied** op productie-DB | `supabase/migrations/` | Kritiek |
| `any` types overal in admin queries — geen type-safety op query results | `AdminDashboard.tsx`, `AdminUsers.tsx` | Midden |
| `AdminDashboard.tsx` is 1985+ regels — te groot voor één component | `AdminDashboard.tsx` | Midden |
| `errorLogger.ts` slaat fouten op in localStorage — geen server-side foutrapportage | `errorLogger.ts` | Laag |
| Fetch-scores / match-news edge functions zijn geconfigureerd maar niet aanwezig in repo | `supabase/functions/` | Hoog |
| `scripts/fetch-daily-results.mjs` vereist `@anthropic-ai/sdk` als externe dependency — niet in `package.json` | `scripts/` | Midden |

---

## 5. Aanbevelingen voor developers

### Direct uitvoeren

1. **Run openstaande migraties** in Supabase SQL Editor:
   - `20260417000001_admin_user_overview.sql` (ip_address kolom)
   - `20260417000002_profiles_add_email.sql` (email + backfill)
   - `20260417000003_audit_logs.sql` (audit tabel)
   - `20260414000002_match_result_drafts.sql` (draft systeem)

2. **Deploy edge functions:**
   ```bash
   supabase functions deploy log-event
   supabase functions deploy log-login
   supabase functions deploy ingest-results
   ```

3. **Stel INGEST_SECRET in** via Supabase Dashboard → Settings → Edge Functions

4. **Regenereer types:**
   ```bash
   supabase gen types typescript --project-id piahvmeitbcibtsjagur > src/integrations/supabase/types.ts
   ```

5. **Installeer script dependency:**
   ```bash
   npm install @anthropic-ai/sdk --save-dev
   ```

### Korte termijn (1-2 weken)

- **Split AdminDashboard.tsx** op in tab-componenten: `AdminOverviewTab`, `AdminScoresTab`, `AdminPoolsTab`, etc. Elk ~150-200 regels.
- **Voeg `queryKeys` toe** voor de nieuwe admin queries (nu inline strings in AdminUsers/AdminActivity).
- **Stel Sentry of Vercel Error Tracking in** — `errorLogger.ts` is alleen client-side localStorage.
- **CI/CD pipeline** — voeg een GitHub Actions workflow toe die `npx tsc --noEmit` + `npm test` draait bij elke push.

### Middellange termijn (1 maand)

- **Web Push notificaties** — Stel FCM/VAPID in via Supabase Edge Function; notificeer gebruikers wanneer score is bijgewerkt.
- **Email via Resend of Supabase** — Welkomstmail bij registratie, ranglijst-update na wedstrijdspeelronde.
- **Materialized view** voor leaderboard bij grote poules.
- **Account verwijderen** (GDPR) — Self-service via profiel + admin-bevestiging.

---

## 6. Aanbevelingen voor gebruikerservaring

### Hoog prioriteit

| Verbetering | Impact | Moeite |
|-------------|--------|--------|
| Native share-knop voor poule-uitnodiging (WhatsApp, kopiëren) | Hoog | Laag |
| Filter "nog niet ingevuld" op Matches-pagina | Hoog | Laag |
| Countdown-timer bij aankomende wedstrijden | Midden | Laag |
| "Jij hebt X punten verdiend" push/in-app notificatie | Hoog | Midden |
| Live score balk bovenin app tijdens wedstrijden | Hoog | Midden |

### Middel prioriteit

| Verbetering | Impact | Moeite |
|-------------|--------|--------|
| Profiel foto uploaden (niet alleen URL) | Midden | Midden |
| Poule puntenverloop grafiek per week | Midden | Midden |
| Eigen voorspellingsverdeling zien (zoals admin) | Midden | Laag |
| Donker/licht mode toggle | Laag | Laag |

---

## 7. Performance aandachtspunten

### Bundle

- Huidige chunks zijn goed gesplitst (vendor/query/motion/supabase/ui/charts/vercel)
- `AdminDashboard.tsx` > 50KB ongecomprimeerd door inline data — refactoring naar tabcomponenten reduceert initial parse time
- Framer Motion wordt geladen voor alle pages — overweeg dynamic import voor animaties alleen op pagina's die ze gebruiken

### Database queries

- `get_admin_stats` RPC wordt elke 60 seconden gerefreshed — acceptabel maar kan naar 5 minuten voor minder actieve uren
- `get_pool_leaderboard` herberekent live — bij 100+ leden in een populaire poule kan dit traag worden; overweeg een gecachte `points_cache` kolom in `pool_members`
- Predictions query laadt alle 104 wedstrijden + alle voorspellingen — gebruik paginering of lazy loading per groepsfase

### Realtime

- `useRealtimeMatches` hook is aanwezig maar gebruik is beperkt — bij veel gelijktijdige gebruikers tijdens WK kan Supabase realtime betalingslimiet bereikt worden; monitor gebruik

---

## 8. Security checklist

| Check | Status | Actie |
|-------|--------|-------|
| RLS op alle tabellen | ✅ Goed | — |
| `has_role()` functie voor admin checks | ✅ Goed | — |
| Supabase anon key in frontend (by design) | ✅ Acceptabel | Geen actie nodig |
| `INGEST_SECRET` voor ingest-results | ⚠️ Moet ingesteld worden | Stel in via Supabase dashboard |
| Service role key nooit in frontend | ✅ Goed | — |
| Edge functions met `verify_jwt=false` minimaal gehouden | ✅ Goed | Alleen seed/log/ingest |
| CORS headers in edge functions | ✅ Goed | — |
| XSS: geen dangerouslySetInnerHTML | ✅ Goed | — |
| SQL injection: alleen ORM/RPC gebruik | ✅ Goed | — |
| IP-adres logging (privacy) | ⚠️ Let op | Vermeld in privacyverklaring |
| GDPR account-verwijdering | ❌ Ontbreekt | Implementeer self-service delete |
| Rate limiting op auth endpoints | ✅ Supabase gebouwd | — |

---

## 9. Routekaart suggestie

```
Week 1  → Migraties uitvoeren + edge functions deployen + INGEST_SECRET
Week 1  → Cron instellen voor fetch-daily-results.mjs
Week 2  → AdminDashboard splitsen in tab-componenten
Week 2  → Types regenereren + queryKeys voor admin
Week 3  → Native share-knop + "nog niet ingevuld" filter
Week 3  → Countdown timer bij wedstrijden
Week 4  → Push notificaties infrastructuur (VAPID/FCM)
Week 5  → Email notificaties (welkom + ranglijst-update)
Week 6  → GDPR account-verwijdering + privacy-update
Week 7  → Poule puntenverloop grafiek
Doorlopend → CI/CD pipeline + error monitoring
```

---

*Dit document bijhouden bij elke grote feature-toevoeging. Gegenereerd op basis van codebase-analyse op 17 april 2026.*
