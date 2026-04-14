# CLAUDE.md — Goaltje WK 2026 AI Assistant Guide

This file provides guidance for AI assistants (Claude Code and others) working in this repository. Read it before making any changes.

---

## Project Overview

**Goaltje** is a free FIFA World Cup 2026 prediction pool application. Users create pools, predict outcomes for all 104 WK 2026 matches, view live scores, and compete on leaderboards. The app is primarily in Dutch but supports English, Spanish, and Portuguese.

**Stack at a glance:**
- Frontend: React 18 + TypeScript + Vite (SWC)
- Backend: Supabase (PostgreSQL + Auth + Edge Functions)
- Styling: Tailwind CSS + shadcn/ui + Radix UI
- State: TanStack React Query v5
- Animations: Framer Motion
- Deployment: Vercel (frontend) + Supabase Cloud (backend)

---

## Development Branch

Always develop on the designated feature branch — never push directly to `main` without explicit permission. The current working branch is tracked in the session context.

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
│   ├── components/         # Reusable UI components
│   │   └── ui/             # shadcn/ui primitives
│   ├── contexts/           # React Contexts (AuthContext)
│   ├── hooks/              # Custom React hooks
│   ├── integrations/
│   │   └── supabase/       # Supabase client + generated DB types
│   ├── lib/                # Pure utility modules (scoring, analytics, SEO, etc.)
│   ├── assets/             # Images and static assets
│   ├── test/               # Vitest setup and example tests
│   ├── App.tsx             # Root component — routing and global providers
│   └── main.tsx            # React entry point
├── supabase/
│   ├── migrations/         # SQL migration files (45+, applied in order)
│   ├── functions/          # Deno-based Edge Functions
│   └── config.toml         # Supabase project config
├── public/                 # Static assets (PWA icons, robots.txt, sitemap.xml)
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json
└── vitest.config.ts
```

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
- **Always use stale times from `src/lib/staleTimes`** exported from the same file.
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

- Tailwind CSS 3 with a custom color palette (dark theme, `#0a1628` primary background).
- Dark mode support via `next-themes`.
- Animation via both `tailwindcss-animate` and `framer-motion`. Use Framer Motion for complex choreographed animations; use Tailwind's `animate-*` utilities for simple transitions.

### Analytics & Cookie Consent

- Vercel Analytics and Speed Insights are conditionally rendered — only when `hasAnalyticsConsent()` returns `true`.
- Use `src/lib/analytics.ts` for tracking custom events (respects consent automatically).
- Never call `window.gtag` or similar directly; go through the analytics utility.

---

## Database

The database is managed via Supabase with 45+ migration files in `supabase/migrations/`. Migrations are named with timestamps and applied in order.

### Core Tables

| Table | Purpose |
|-------|---------|
| `matches` | 104 WK 2026 matches with status, scores, deadlines |
| `teams` | 48 national teams with flags |
| `pools` | Prediction pools with custom scoring rules |
| `pool_members` | Pool membership and roles |
| `predictions` | User predictions per match per pool |
| `profiles` | User display names and avatars |
| `bonus_questions` / `bonus_predictions` | Bonus round questions |
| `match_events` | Goals, cards, substitutions |
| `pool_messages` | Real-time pool chat |
| `wk_news_cache` | AI-generated match news cache |
| `user_roles` | Admin/moderator roles |
| `tenants` | White-label branding configuration |
| `api_cache` / `api_usage` | External API response caching |

### Key Database Functions

- `get_pool_leaderboard(pool_id)` — ranked leaderboard with tiebreaker logic
- `get_public_leaderboard()` — public top pools and predictors
- `recalculate_match_points()` — trigger run after match score updates
- `validate_prediction_lock()` — blocks predictions past deadline

### Migration Conventions

- New migrations go in `supabase/migrations/` with a timestamp prefix: `YYYYMMDDHHMMSS_description.sql`
- Always include a comment header explaining the change
- Never modify existing migration files — always add a new one

---

## Edge Functions

Deno-based TypeScript functions in `supabase/functions/`:

| Function | Purpose |
|----------|---------|
| `seed-wc2026` | Seed WK 2026 match data |
| `seed-test-data` | Populate test fixtures |
| `admin-status` | Admin metadata endpoint |
| `admin-users` | User management actions |
| `recalc-all` | Trigger global point recalculation |

Edge functions use `no-verify-jwt` for admin/seed functions. Keep JWT verification on for user-facing functions.

---

## Build & Deployment

### Vite Build

The production build (`npm run build`) produces an ES2020 bundle with manual chunk splitting:

| Chunk | Contents |
|-------|---------|
| `vendor` | React, React DOM, React Router |
| `query` | TanStack React Query |
| `motion` | Framer Motion |
| `supabase` | Supabase JS SDK |
| `ui` | Radix UI components |
| `charts` | Recharts |
| `vercel` | Analytics + Speed Insights |

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

### Scoring rule changes

All scoring logic flows through `src/lib/scoring.ts`. The `calculatePoints()` function is the single source of truth. If a pool has custom rules, they are passed as the `rules` parameter — never hardcode point values elsewhere.

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
