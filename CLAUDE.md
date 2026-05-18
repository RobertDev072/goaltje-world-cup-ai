# CLAUDE.md — Goaltje WK 2026 AI Assistant Guide

This file provides guidance for AI assistants (Claude Code and others) working in this repository. Read it before making any changes.

---

## Project Overview

**Goaltje** is a free FIFA World Cup 2026 prediction pool application. Users create pools, predict outcomes for all 104 WK 2026 matches, view live scores, and compete on leaderboards. The app is primarily in Dutch with a handful of English SEO routes under `/en/`. No Spanish/Portuguese.

**Stack at a glance:**
- Frontend: React 18 + TypeScript + Vite (SWC)
- Backend: Supabase (PostgreSQL + Auth + Edge Functions)
- Styling: Tailwind CSS + shadcn/ui + Radix UI
- State: TanStack React Query v5
- Animations: Framer Motion
- Deployment: Vercel (frontend) + Supabase Cloud (backend)

---

## Branch Strategy (STRIKT)

- Alle wijzigingen gebeuren op de branch `TEST-PRODUCT`
- NOOIT direct committen of pushen naar `main`
- NOOIT een nieuwe feature-branch aanmaken voor een sessie —
  altijd op `TEST-PRODUCT` werken
- Pas na expliciete goedkeuring van de gebruiker mag een merge
  naar `main` gebeuren
- `main` en `TEST-PRODUCT` moeten identiek zijn zodra een feature
  is goedgekeurd (geen losse branches laten slingeren)

Standaard workflow per sessie:
1. Check: `git branch --show-current` → moet `TEST-PRODUCT` zijn
2. Zo niet: `git checkout TEST-PRODUCT`
3. Werk daar, commit daar
4. Merge naar main ALLEEN op uitdrukkelijk verzoek van de gebruiker

---

## Working Style

- Chat altijd in het Nederlands. Code en commentaar in het Engels.
- Bij grote wijzigingen: eerst plan voorleggen, wachten op
  goedkeuring voor de code wijzigt.
- Bij onduidelijkheid: vragen, niet gokken.
- Bij refactors: eerst de diff-strategie tonen, niet meteen
  alle bestanden aanpassen.

---

## Commands

```bash
# Start dev server (port 8080)
npm run dev

# Production build
npm run build

# Development build (with source maps)
npm run build:dev

# Lint
npm run lint

# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Preview production build
npm run preview
```

> **Note:** The project has both `bun.lockb` and `package-lock.json`. Use `npm` for installs unless instructed otherwise. Dev server runs at `http://localhost:8080`.

---

## Repository Structure

```
/
├── src/
│   ├── pages/              # Route-level page components (lazy loaded)
│   │   └── seo/            # SEO-targeted landing pages
│   ├── components/         # Reusable UI components (40+)
│   │   └── ui/             # shadcn/ui primitives (18)
│   ├── contexts/           # React Contexts (AuthContext)
│   ├── hooks/              # Custom React hooks (use-toast, useRealtimeMatches)
│   ├── integrations/
│   │   └── supabase/       # Supabase client + generated DB types
│   ├── lib/                # Utility modules (see "Lib modules" below)
│   ├── assets/             # Images and static assets
│   ├── test/               # Vitest setup and example tests
│   ├── App.tsx             # Root component — routing and global providers
│   └── main.tsx            # React entry point
├── supabase/
│   ├── migrations/         # SQL migration files (60+, applied in order)
│   ├── functions/          # Deno-based Edge Functions (8)
│   └── config.toml         # Supabase project config
├── public/                 # Static assets (PWA icons, robots.txt, sitemap.xml)
├── scripts/                # Standalone Node scripts (e.g. fetch-daily-results.mjs)
├── docs/ at root           # README.md, DOCS.md, FEATURES.md, ANALYSE.md,
│                           # PRODUCTHUNT-LAUNCH.md, LINKEDIN-TEMPLATES.md,
│                           # PROMO-SCRIPTS.md — marketing + analysis, geen code
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json
└── vitest.config.ts
```

### Lib modules

- `scoring.ts` — point calculation (single source of truth)
- `queryKeys.ts` — centralized React Query keys **and** `staleTimes` constants
- `analytics.ts` — event tracking (respects consent)
- `consent.ts` — `hasAnalyticsConsent()`, cookie/consent helpers
- `errorLogger.ts` — client-side error reporting
- `auditLogger.ts` — admin audit trail helpers
- `predictionStatus.ts` — state helpers (open/filled/missed/locked)
- `timezone.ts` — NL-date/time formatters
- `seo.ts` — meta tags + JSON-LD
- `utils.ts` — `cn()` (clsx + tailwind-merge)

---

## Key Conventions

### TypeScript

- TypeScript is configured loosely: `noImplicitAny: false`, `noUnusedLocals: false`.
- Path alias `@/` resolves to `./src/`. Always use it for imports within `src/`.
- Generated Supabase types live in `src/integrations/supabase/types.ts` — do not edit manually. Regenerate with `supabase gen types typescript`.

### Components

- **Pages** live in `src/pages/` and are lazy-loaded via `React.lazy()` in `App.tsx`.
- **Reusable components** live in `src/components/`. Do not put page-specific logic there.
- **shadcn/ui primitives** live in `src/components/ui/`. Avoid editing these files unless updating the component library.
- Use `cn()` from `src/lib/utils.ts` (a `clsx` + `tailwind-merge` wrapper) for conditional Tailwind classes.

### Data Fetching

- All data fetching uses **TanStack React Query v5** with `useQuery` / `useMutation`.
- **Always use keys from `src/lib/queryKeys.ts`** — never write inline string arrays.
- **Always use `staleTimes.*` constants** — exported from the same `src/lib/queryKeys.ts`.
- Supabase calls go through `src/integrations/supabase/client.ts`.
- Never cache Supabase API responses in the service worker (configured as `NetworkOnly` in `vite.config.ts`).

### Routing

Routes are defined in `src/App.tsx`:
- `/` and public pages — no auth required
- `/app/*` — wrapped in `<AuthGate><AppLayout />`, require authentication
- `/join/:code` — public join-pool flow
- SEO pages — defined in `SEO_ROUTES` array; both Dutch and English variants exist

### Scoring Logic

Scoring rules are defined in `src/lib/scoring.ts` — **the single source of truth for point calculation**.

Default "Classic WK" scoring:
| Outcome | Points |
|---------|--------|
| Exact score | 6 |
| Correct goal difference (not exact) | 4 |
| Correct winner/draw only | 3 |
| Wrong result | 0 |

Rules are **non-stacking** — only the highest matching tier is awarded. Pool admins can customize these values per pool.

### Authentication & Authorization

- Auth state lives in `src/contexts/AuthContext.tsx` via Supabase Auth.
- **Row Level Security (RLS)** is enforced at the database level — users only see data from pools they belong to.
- Admin actions use the `has_role()` database function and are gated by the `user_roles` table.
- Never bypass RLS for convenience. Always structure queries to work within RLS policies.

### Styling

- Tailwind CSS 3 with a custom color palette. **Light theme is the default** (`main.tsx` only adds the `dark` class when the user picked dark mode).
- Navy `#0a1628` is used as accent/primary color (gradient-navy utility, headers, rank tiles) — not as default background.
- Dark mode toggle via `next-themes` (user can switch on Profiel page).
- Animation via both `tailwindcss-animate` and `framer-motion`. Use Framer Motion for complex choreographed animations; use Tailwind's `animate-*` utilities for simple transitions.

### Analytics & Cookie Consent

- Vercel Analytics and Speed Insights are conditionally rendered — only when `hasAnalyticsConsent()` returns `true`.
- Use `src/lib/analytics.ts` for tracking custom events (respects consent automatically).
- Never call `window.gtag` or similar directly; go through the analytics utility.

---

## Database

The database is managed via Supabase with **60+ migration files** in `supabase/migrations/`. Migrations are named with timestamps and applied in order.

### Core Tables

| Table | Purpose |
|-------|---------|
| `matches` | 104 WK 2026 matches with status, scores, deadlines |
| `teams` | 48 national teams with flags |
| `pools` | Prediction pools with custom scoring rules |
| `pool_members` | Pool membership and roles |
| `predictions` | User predictions per match per pool |
| `match_result_drafts` | Admin draft-results flow (enter scores before publishing) |
| `profiles` | User display names, avatars, email |
| `bonus_questions` / `bonus_predictions` | Bonus round questions |
| `match_events` | Goals, cards, substitutions |
| `pool_messages` | Real-time pool chat |
| `wk_news_cache` | AI-generated match news cache |
| `user_roles` | Admin/moderator roles |
| `user_sessions` | Login tracking (IP, device) for admin overview |
| `audit_logs` | Admin action audit trail |
| `tenants` | White-label branding configuration |
| `api_cache` / `api_usage` | External API response caching |
| `activity_events` | Live activity feed (login, prediction, ban, …) — realtime-subscribable for admins, 7-day retention |

### Database Functions (32 RPCs)

Grouped by purpose:

**Leaderboard & scoring:**
- `get_pool_leaderboard(pool_id)` — ranked leaderboard with tiebreaker logic
- `get_pool_leaderboard_admin(pool_id)` — admin-variant with extra fields
- `get_public_leaderboard()` — public top pools and predictors
- `get_global_ranking()` — cross-pool global ranking
- `recalculate_match_points()` — run after match score updates
- `validate_prediction_lock()` — blocks predictions past deadline

**Self-learning pool insights (added Apr 2026):**
- `get_pool_consensus(pool_id, match_id)` — vote distribution + top-3 scores
- `get_pool_top_scores(pool_id, match_ids[])` — batch most-voted score per match
- `get_pool_trends(pool_id)` — avg goals, draw-rate, upset count, mood
- `get_pool_recap_feed(pool_id, days)` — daily highlights feed
- `get_pool_leaderboard_badges(pool_id)` — streak + profile per member
- `get_daily_pool_recap(pool_id)` — yesterday: winner + exact-scorers + upset

**Per-user analytics (added Apr 2026):**
- `get_user_predictor_profile(user_id)` — auto-derived profile type + stats
- `get_user_rank_evolution(pool_id, user_id, days)` — sparkline data
- `get_user_stage_accuracy(user_id)` — accuracy per tournament stage
- `get_user_team_bias(user_id)` — over/underestimated teams
- `get_user_week_summary(pool_id, user_id)` — weekly points/rank delta
- `get_user_match_trackrecord(user_id, match_id)` — per-match context
- `get_match_prediction_distribution(match_id)` — pool-wide vote spread

**Admin tooling:**
- `get_admin_stats()`, `get_admin_users()` (incl. country + is_banned)
- `get_admin_overview_stats()` — single roundtrip for overview cards
- `admin_award_bonus_points`, `admin_delete_pool`, `admin_delete_user_data`, `admin_reset_invite_code`
- `admin_set_user_ban(user, ban, reason)` — soft ban with audit trail
- `log_activity_event(type, payload)` — write to activity_events feed
- `user_heartbeat()` — updates last_seen_at on the latest session (used for presence fallback)
- `get_public_stats()`

**Security/helpers:**
- `has_role(user_id, role)` — auth/role check
- `is_pool_member(user_id, pool_id)` — RLS helper used in most policies
- `handle_new_user()`, `update_updated_at_column()` — triggers
- `lookup_pool_by_invite_code`, `toggle_message_reaction`

### Migration Conventions

- New migrations go in `supabase/migrations/` with a timestamp prefix: `YYYYMMDDHHMMSS_description.sql`
- Always include a comment header explaining the change
- Never modify existing migration files — always add a new one
- All custom RPCs end with `NOTIFY pgrst, 'reload schema';` so PostgREST picks them up immediately

---

## Supabase Access

- Claude Code heeft via de Supabase MCP-connector toegang tot
  de database van dit project.
- Voordat je schema-wijzigingen voorstelt: ALTIJD eerst de
  huidige tabellen, kolommen, RLS-policies en functies inspecteren
  via de MCP-connector.
- Migrations eerst lokaal testen met `supabase db reset`.
- Pushen naar remote (`supabase db push`) alleen na expliciete
  goedkeuring van de gebruiker.

---

## Edge Functions

Deno-based TypeScript functions in `supabase/functions/` (8 total):

| Function | Purpose |
|----------|---------|
| `seed-wc2026` | Seed WK 2026 match data |
| `seed-test-data` | Populate test fixtures |
| `admin-status` | Admin metadata endpoint |
| `admin-users` | User management actions |
| `recalc-all` | Trigger global point recalculation |
| `ingest-results` | Automated daily result ingestion (called by scripts/fetch-daily-results.mjs) |
| `log-event` | Client-side event logging endpoint |
| `log-login` | Login tracking → `user_sessions` |

Edge functions use `no-verify-jwt` for admin/seed functions. Keep JWT verification on for user-facing functions.

---

## Build & Deployment

### Vite Build

The production build (`npm run build`) produces an ES2020 bundle with manual chunk splitting:

Build uses manual chunk splitting voor vendor, query, motion, supabase,
ui, charts en vercel — zie `vite.config.ts` voor details.

Source maps are **disabled** in production (`sourcemap: false`).

### Vercel Configuration

- SPA rewrites: non-bot traffic → `index.html`
- SEO bot prerendering via Prerender.io
- Cache headers: 1 year for JS/CSS/woff2, 1 week for PNG, no-store for source maps
- Security headers set in `vercel.json`

### PWA

- Service worker auto-updates via `vite-plugin-pwa`
- Supabase API calls are **never cached** by the service worker
- PNG images cached with StaleWhileRevalidate (7 days, max 50 entries)

---

## Testing

- Framework: **Vitest** with jsdom environment
- Setup file: `src/test/setup.ts` (mocks `window.matchMedia`, imports Testing Library matchers)
- Test files: colocated in `src/test/` or alongside source files

Run tests: `npm test`

There is minimal test coverage currently. When adding tests, follow the Vitest + Testing Library pattern established in `src/test/setup.ts`.

---

## Environment Variables

The `.env` file is present in the repo root with Supabase credentials for local/dev use:

```
VITE_SUPABASE_PROJECT_ID
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_URL
```

These are `VITE_` prefixed and therefore exposed to the browser bundle. This is intentional — Supabase's anon key is designed to be public; security is enforced via RLS.

Do **not** commit secrets like service role keys or private API tokens.

---

## SEO Conventions

- The app is primarily Dutch (`nl`) with English (`/en/`) routes.
- Meta tags, JSON-LD structured data, and Open Graph are managed in `src/lib/seo.ts`.
- SEO landing pages are in `src/pages/seo/` — these are thin content pages, not app features.
- `public/robots.txt` and `public/sitemap.xml` are static files, update them when adding significant new routes.

---

## Common Patterns

### Adding a new page

1. Create `src/pages/MyPage.tsx`
2. Add a lazy import in `src/App.tsx`
3. Add a `<Route>` entry in the appropriate section of `<Routes>`
4. If auth-required, nest it under `<Route element={<AuthGate><AppLayout /></AuthGate>}>`

### Adding a new query

1. Add a key factory to `src/lib/queryKeys.ts`
2. Add an appropriate stale time to `staleTimes` in the same file
3. Use `useQuery({ queryKey: queryKeys.myKey(...), staleTime: staleTimes.myTime, queryFn: ... })`

### Adding a database migration

1. Create `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. Write the SQL with a header comment
3. Apply locally: `supabase db reset` or `supabase migration up`
4. Regenerate types if schema changed: `supabase gen types typescript --local > src/integrations/supabase/types.ts`
5. (Optional) Gebruiker kan de SQL ook direct in Supabase Studio SQL Editor plakken — handig voor hotfixes. De Supabase MCP-connector kan de huidige schema inspecteren om te checken of alles gerund is.
6. Eindig altijd met `NOTIFY pgrst, 'reload schema';` als je een nieuwe RPC/functie toevoegt

### Scoring rule changes

All scoring logic flows through `src/lib/scoring.ts`. The `calculatePoints()` function is the single source of truth. If a pool has custom rules, they are passed as the `rules` parameter — never hardcode point values elsewhere.

---

## Pool Insights Features (added Apr 2026)

Een reeks zelflerende features die zich verbergen bij onvoldoende data en zichtbaar worden zodra er voorspellingen + afgeronde matches zijn. Alles 100% afgeleid uit `predictions` + `matches` tabellen — geen externe API's.

### Components → RPC mapping

| Component | Zichtbaar op | RPC die het gebruikt | Drempel |
|---|---|---|---|
| `PoolHeaderCard` | Home | `poolMemberCount` + `tournamentFinishedCount` + `poolOpenPredictions` | altijd |
| `TournamentProgress` | Home | count van finished matches | altijd |
| `LiveMatchBanner` | Home | — (client-side minuten uit `kickoff_utc`) | alleen bij `status='live'` |
| `PoolConsensus` | MatchDetail | `get_pool_consensus` | ≥ 2 voorspellingen |
| `MatchCard` poule-tipt chip | MatchCard (home + matches) | `get_pool_top_scores` (batch) | ≥ 2 voorspellingen |
| `DailyPoolRecap` | Home + PoolDetail + Insights | `get_daily_pool_recap` | ≥ 1 finished match gisteren |
| `PredictorProfile` | Profile + Insights | `get_user_predictor_profile` | altijd (toont 🌱 bij < 3 preds) |
| `WeekSummary` | Insights | `get_user_week_summary` | finished matches laatste 7 dagen |
| `UserAnalytics` (sparkline + per-fase) | Profile + Insights | `get_user_rank_evolution` + `get_user_stage_accuracy` | finished matches met rang-variatie |
| `TeamBias` | Insights | `get_user_team_bias` | ≥ 2 matches per team |
| `PoolTrends` | PoolDetail insights-tab + Insights | `get_pool_trends` | ≥ 1 voorspelling |
| `PoolRecapFeed` | PoolDetail insights-tab + Insights | `get_pool_recap_feed` | afgeronde matches laatste 7 dagen |
| `MatchTrackrecord` | MatchDetail | `get_user_match_trackrecord` | user heeft historie met dezelfde fase/teams |
| `VirtualizedLeaderboard` + badges + rivaal | PoolRanking | `get_pool_leaderboard_badges` | ≥ 3 leden voor filters |
| `ScoringExamples` | HelpPage + MarketingHome | — (statisch) | altijd |

### Nieuwe route

- `/app/insights` → `Insights.tsx` — verzamelt alle persoonlijke + pool-inzichten in één pagina, vervangt de Help-tab in de bottom nav (Help blijft bereikbaar via Profiel-menu).

### Seed-SQL voor testen pre-WK

Een DO-block in `supabase/migrations/` kan gebruikt worden om een test-pool te vullen met voorspellingen zodat de insights triggeren zonder op het WK te wachten. Zie eerdere sessie-logs.

---

## What Not To Do

- Do not edit `src/integrations/supabase/types.ts` manually — it is generated.
- Do not add caching to Supabase API calls in the service worker.
- Do not hardcode point values outside `src/lib/scoring.ts`.
- Do not bypass RLS policies — add proper policies to migrations instead.
- Do not push to `main` without explicit permission.
- Do not commit `.env` with real secrets to a public repo — the current `.env` contains dev credentials only.
- Do not use inline query key arrays — always use `queryKeys.*` from `src/lib/queryKeys.ts`.
- Do not add analytics calls that bypass `src/lib/analytics.ts` (consent must be respected).
- Do not create a new feature branch per session — always work on TEST-PRODUCT
- Do not merge TEST-PRODUCT into main without explicit user approval

---

## CLAUDE.md Onderhoud (zelf bijhouden)

Deze CLAUDE.md is een levend document. Claude Code is verantwoordelijk
voor het actueel houden ervan:

- Als er een nieuwe feature, pattern of conventie wordt toegevoegd
  die relevant is voor toekomstige sessies → voeg het toe aan CLAUDE.md.
- Als een beschreven pattern niet meer klopt (code verwijderd,
  library vervangen, structuur gewijzigd) → update de betreffende sectie.
- Als een "What Not To Do"-regel achterhaald blijkt → herzie of verwijder.
- Bij élke niet-triviale wijziging: eindig de sessie met de check
  "Is er iets in CLAUDE.md dat bijgewerkt moet worden?" en doe dat
  dan direct.

Houd het document kort en concreet — voeg niet alles toe, alleen wat
tijd bespaart in toekomstige sessies.
