# Goaltje — Technische Documentatie

> WK 2026 Voorspellingen App — Gebouwd met React, Supabase & Vite

---

## Inhoudsopgave

1. [Architectuur Overzicht](#architectuur-overzicht)
2. [Tech Stack](#tech-stack)
3. [Project Structuur](#project-structuur)
4. [Database Schema](#database-schema)
5. [Edge Functions](#edge-functions)
6. [Authenticatie & Autorisatie](#authenticatie--autorisatie)
7. [Scoring Systeem](#scoring-systeem)
8. [Pagina's & Routes](#paginas--routes)
9. [Belangrijke Libraries](#belangrijke-libraries)
10. [Secrets & API Keys](#secrets--api-keys)
11. [Deployment](#deployment)

---

## Architectuur Overzicht

```
┌─────────────────────────────────────────────┐
│              React Frontend                 │
│         (Vite + Tailwind + TypeScript)      │
└──────────────────┬──────────────────────────┘
                   │ Supabase JS SDK
┌──────────────────▼──────────────────────────┐
│              Supabase Backend               │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│  │   Auth   │ │ Postgres │ │  Edge Fns   │ │
│  └──────────┘ └──────────┘ └──────┬──────┘ │
└───────────────────────────────────┼─────────┘
                                    │
                          ┌─────────▼─────────┐
                          │   API-Football    │
                          │  (externe API)    │
                          └───────────────────┘
```

---

## Tech Stack

| Categorie        | Technologie                          |
|------------------|--------------------------------------|
| Framework        | React 18 + TypeScript                |
| Build Tool       | Vite                                 |
| Styling          | Tailwind CSS + shadcn/ui             |
| Backend          | Supabase (PostgreSQL + Edge Functions) |
| State Management | TanStack React Query                 |
| Routing          | React Router DOM v6                  |
| Animaties        | Framer Motion                        |
| Charts           | Recharts                             |
| Forms            | React Hook Form + Zod                |
| QR Codes         | qrcode.react                         |

---

## Project Structuur

```
src/
├── assets/                 # Statische assets (logo, afbeeldingen)
├── components/
│   ├── ui/                 # shadcn/ui componenten (button, card, dialog, etc.)
│   ├── AppLayout.tsx       # Hoofd layout wrapper met navigatie
│   ├── BottomNav.tsx       # Mobiele bottom navigatie
│   └── NavLink.tsx         # Navigatie link component
├── contexts/
│   └── AuthContext.tsx     # Authenticatie context (login state, sessie)
├── hooks/
│   ├── use-mobile.tsx      # Detectie mobiel scherm
│   └── use-toast.ts        # Toast notificatie hook
├── integrations/
│   └── supabase/
│       ├── client.ts       # Supabase client initialisatie
│       └── types.ts        # Auto-gegenereerde database types (NIET BEWERKEN)
├── lib/
│   ├── analytics.ts        # Gebruiksanalyse tracking
│   ├── i18n.ts             # Internationalisatie / vertalingen (NL)
│   ├── scoring.ts          # Client-side scoring berekeningen
│   ├── timezone.ts         # Tijdzone conversie utilities
│   └── utils.ts            # Algemene utility functies
├── pages/
│   ├── AdminDashboard.tsx  # Admin panel (scores, stats, API sync)
│   ├── Auth.tsx            # Login / Registratie pagina
│   ├── Bracket.tsx         # Knockout-fase bracket weergave
│   ├── Index.tsx           # Dashboard na inloggen
│   ├── JoinPool.tsx        # Pool joinen via invite code
│   ├── Landing.tsx         # Marketing landing pagina
│   ├── MatchDetail.tsx     # Wedstrijd detail + voorspelling
│   ├── Matches.tsx         # Overzicht alle wedstrijden
│   ├── NotFound.tsx        # 404 pagina
│   ├── Pool.tsx            # Pool overzicht
│   ├── PoolDetail.tsx      # Pool detail + leaderboard
│   ├── Profile.tsx         # Gebruikersprofiel
│   └── ResetPassword.tsx   # Wachtwoord reset
├── App.tsx                 # Root component met routing
├── main.tsx                # Entry point
└── index.css               # Globale styles + design tokens

supabase/
├── config.toml             # Supabase configuratie
└── functions/
    ├── fetch-scores/
    │   └── index.ts        # Live scores ophalen van API-Football
    └── seed-wc2026/
        └── index.ts        # Database seeden met WK 2026 data
```

---

## Database Schema

### `teams`
WK 2026 deelnemende landen.

| Kolom        | Type      | Beschrijving               |
|--------------|-----------|----------------------------|
| id           | uuid (PK) | Unieke identifier          |
| name         | text      | Volledige landnaam         |
| short_name   | text      | Afkorting (bijv. "NED")    |
| group        | text      | Poulegroep (A-L)           |
| flag_url     | text      | URL naar vlag afbeelding   |
| external_id  | text      | ID bij API-Football        |
| created_at   | timestamptz | Aanmaakdatum             |

### `matches`
Alle WK wedstrijden.

| Kolom        | Type      | Beschrijving               |
|--------------|-----------|----------------------------|
| id           | uuid (PK) | Unieke identifier          |
| home_team_id | uuid (FK) | Thuisteam → teams.id       |
| away_team_id | uuid (FK) | Uitteam → teams.id         |
| home_score   | integer   | Thuisscore (null = niet gespeeld) |
| away_score   | integer   | Uitscore (null = niet gespeeld)   |
| kickoff_utc  | timestamptz | Aftrap tijd (UTC)         |
| status       | text      | `scheduled` / `live` / `finished` |
| stage        | text      | `group` / `round_of_32` / `quarter` / etc. |
| group        | text      | Poulegroep                 |
| venue        | text      | Stadion                    |
| external_id  | text      | ID bij API-Football        |
| last_updated | timestamptz | Laatst bijgewerkt         |

### `pools`
Voorspellingsgroepen.

| Kolom              | Type      | Beschrijving               |
|--------------------|-----------|----------------------------|
| id                 | uuid (PK) | Unieke identifier          |
| name               | text      | Poolnaam                   |
| description        | text      | Omschrijving               |
| created_by         | uuid      | Maker (user_id)            |
| invite_code        | text      | 6-karakter join code       |
| privacy            | text      | `private` / `public`       |
| prize_text         | text      | Prijsomschrijving          |
| scoring_rules_json | jsonb     | Scoring configuratie       |
| tenant_id          | uuid (FK) | Optioneel white-label      |
| created_at         | timestamptz | Aanmaakdatum             |

**Default scoring regels:**
```json
{
  "exact": 5,
  "result": 3,
  "goal_diff": 2
}
```

### `pool_members`
Koppeltabel: welke gebruikers zitten in welke pool.

| Kolom     | Type      | Beschrijving               |
|-----------|-----------|----------------------------|
| id        | uuid (PK) | Unieke identifier          |
| pool_id   | uuid (FK) | → pools.id                 |
| user_id   | uuid      | Gebruiker                  |
| role       | text      | `member` / `admin`         |
| joined_at | timestamptz | Datum gejoind             |

### `predictions`
Voorspellingen per gebruiker per wedstrijd per pool.

| Kolom          | Type      | Beschrijving               |
|----------------|-----------|----------------------------|
| id             | uuid (PK) | Unieke identifier          |
| user_id        | uuid      | Gebruiker                  |
| match_id       | uuid (FK) | → matches.id               |
| pool_id        | uuid (FK) | → pools.id                 |
| home_pred      | integer   | Voorspelde thuisscore      |
| away_pred      | integer   | Voorspelde uitscore        |
| winner_pred    | uuid (FK) | Voorspelde winnaar (knockout) |
| points_awarded | integer   | Berekende punten (default 0) |
| created_at     | timestamptz | Aanmaakdatum             |
| updated_at     | timestamptz | Laatst gewijzigd          |

### `profiles`
Gebruikersprofielen (aangemaakt via trigger bij registratie).

| Kolom      | Type      | Beschrijving               |
|------------|-----------|----------------------------|
| id         | uuid (PK) | Unieke identifier          |
| user_id    | uuid      | Supabase Auth user ID      |
| name       | text      | Weergavenaam               |
| avatar_url | text      | Profielfoto URL            |
| created_at | timestamptz | Aanmaakdatum             |
| updated_at | timestamptz | Laatst gewijzigd          |

### `user_roles`
Admin/moderator rechten.

| Kolom      | Type      | Beschrijving               |
|------------|-----------|----------------------------|
| id         | uuid (PK) | Unieke identifier          |
| user_id    | uuid      | Gebruiker                  |
| role       | app_role  | `admin` / `moderator` / `user` |
| created_at | timestamptz | Aanmaakdatum             |

### `tenants`
White-label branding voor bedrijven.

| Kolom                | Type | Beschrijving               |
|----------------------|------|----------------------------|
| id                   | uuid | Unieke identifier          |
| name                 | text | Bedrijfsnaam               |
| logo_url             | text | Logo URL                   |
| primary_color        | text | Primaire kleur (hex)       |
| secondary_color      | text | Secundaire kleur (hex)     |
| allowed_email_domain | text | Email domein filter        |
| created_by           | uuid | Maker                      |

### `api_cache` & `api_usage`
Caching en rate limiting voor API-Football calls.

---

## Edge Functions

### `fetch-scores`
**Doel:** Live wedstrijdscores ophalen van API-Football.

- **Trigger:** Handmatig via Admin Dashboard ("Sync Fixtures" knop)
- **API:** `https://v3.football.api-sports.io`
- **Secret:** `API_FOOTBALL_KEY`
- **Flow:**
  1. Haalt fixtures op voor WK 2026
  2. Matcht externe IDs met `matches.external_id`
  3. Update scores en status in database
  4. Cache resultaten in `api_cache`
  5. Track API gebruik in `api_usage`

### `seed-wc2026`
**Doel:** Database vullen met alle 48 teams en groepswedstrijden.

- **Trigger:** Eenmalig, handmatig
- **Flow:**
  1. Insert alle WK 2026 teams met groepsindeling
  2. Genereert alle groepswedstrijden
  3. Stelt kickoff tijden en venues in

---

## Authenticatie & Autorisatie

### Auth Flow
1. Gebruiker registreert via email/wachtwoord (Supabase Auth)
2. `handle_new_user()` trigger maakt automatisch een `profiles` record
3. Sessie wordt opgeslagen in localStorage (persistent)
4. `AuthContext.tsx` beheert de sessie state app-breed

### Row Level Security (RLS)

| Tabel          | SELECT                  | INSERT              | UPDATE              | DELETE           |
|----------------|-------------------------|----------------------|---------------------|------------------|
| teams          | ✅ Publiek              | ❌                   | ❌                  | ❌               |
| matches        | ✅ Publiek              | 🔒 Admin only       | 🔒 Admin only      | ❌               |
| pools          | ✅ Publiek              | 🔒 Ingelogd         | 🔒 Creator only    | ❌               |
| pool_members   | 🔒 Poolleden            | 🔒 Eigen user       | ❌                  | 🔒 Eigen user   |
| predictions    | 🔒 Poolleden            | 🔒 Eigen user       | 🔒 Eigen user      | ❌               |
| profiles       | ✅ Publiek              | 🔒 Eigen user       | 🔒 Eigen user      | ❌               |
| user_roles     | 🔒 Admin only           | 🔒 Admin only       | 🔒 Admin only      | 🔒 Admin only   |

### Database Functions
- `has_role(user_id, role)` — Checkt of gebruiker een specifieke rol heeft
- `is_pool_member(user_id, pool_id)` — Checkt pool lidmaatschap
- `get_admin_stats()` — Haalt admin dashboard statistieken op (admin only)

---

## Scoring Systeem

### Puntenberekening
De punten worden **automatisch berekend** door de database trigger `recalculate_match_points()` zodra een wedstrijdscore wordt opgeslagen.

| Scenario                                    | Punten |
|---------------------------------------------|--------|
| **Exacte score** (bijv. 2-1 → 2-1)         | 5      |
| **Juiste uitslag** (winst/gelijk/verlies)   | 3      |
| **Bonus: correct doelsaldo**                | +2     |
| **Fout**                                    | 0      |

### Voorbeelden

| Uitslag | Voorspelling | Punten | Reden                          |
|---------|-------------|--------|--------------------------------|
| 2-1     | 2-1         | 5      | Exacte score                   |
| 2-1     | 3-2         | 3+2=5  | Juiste uitslag + juist doelsaldo (+1) |
| 2-1     | 1-0         | 3      | Juiste uitslag (thuiswinst)    |
| 2-1     | 0-0         | 0      | Fout (gelijk vs thuiswinst)    |
| 2-1     | 0-1         | 0      | Fout (uitwinst vs thuiswinst)  |

### Custom Scoring
Elke pool kan eigen scoring regels instellen via `scoring_rules_json`:
```json
{
  "exact": 10,    // Punten voor exacte score
  "result": 4,    // Punten voor juiste uitslag
  "goal_diff": 1  // Bonus voor juist doelsaldo
}
```

---

## Pagina's & Routes

| Route              | Component          | Auth Vereist | Beschrijving                    |
|--------------------|--------------------|--------------|--------------------------------|
| `/`                | Landing            | Nee          | Marketing pagina               |
| `/auth`            | Auth               | Nee          | Login / Registratie            |
| `/reset-password`  | ResetPassword      | Nee          | Wachtwoord herstellen          |
| `/dashboard`       | Index              | Ja           | Gebruikers dashboard           |
| `/matches`         | Matches            | Ja           | Wedstrijdoverzicht             |
| `/match/:id`       | MatchDetail        | Ja           | Wedstrijd + voorspelling       |
| `/pools`           | Pool               | Ja           | Mijn pools                     |
| `/pool/:id`        | PoolDetail         | Ja           | Pool detail + leaderboard      |
| `/join/:code`      | JoinPool           | Ja           | Pool joinen via code           |
| `/bracket`         | Bracket            | Ja           | Knockout bracket               |
| `/profile`         | Profile            | Ja           | Profiel bewerken               |
| `/admin`           | AdminDashboard     | Ja (admin)   | Admin functies                 |

---

## Belangrijke Libraries

| Library              | Gebruik                                   |
|----------------------|-------------------------------------------|
| `@supabase/supabase-js` | Database, Auth, Edge Functions calls   |
| `@tanstack/react-query`  | Server state caching & synchronisatie |
| `react-router-dom`    | Client-side routing                      |
| `react-hook-form`     | Formulier state management               |
| `zod`                 | Schema validatie                         |
| `framer-motion`       | Animaties en transities                  |
| `recharts`            | Grafieken in admin dashboard             |
| `qrcode.react`        | QR codes voor pool invite links          |
| `date-fns`            | Datum formatting en berekeningen         |
| `lucide-react`        | Iconen                                   |
| `sonner`              | Toast notificaties                       |

---

## Secrets & API Keys

| Secret                    | Beschrijving                        | Locatie       |
|---------------------------|-------------------------------------|---------------|
| `API_FOOTBALL_KEY`        | API-Football.com API key            | Supabase Edge |
| `SUPABASE_URL`            | Supabase project URL                | Auto          |
| `SUPABASE_ANON_KEY`       | Supabase anonymous key              | Auto          |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (edge fns)  | Auto          |
| `LOVABLE_API_KEY`         | Lovable AI Gateway key              | Auto          |

**Frontend environment variables** (`.env`):
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon key (publiek)
- `VITE_SUPABASE_PROJECT_ID` — Project ID

---

## Deployment

- **Frontend:** Gehost via Lovable (automatische deploys)
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Edge Functions:** Automatisch gedeployed bij code wijzigingen
- **Database migraties:** Via Supabase migration tool

### Publiceren
1. Klik op "Publish" in Lovable
2. Frontend wijzigingen vereisen handmatige "Update" klik
3. Backend wijzigingen (Edge Functions, migraties) deployen automatisch

---

## Veelgestelde Vragen

**Q: Waarom worden mijn scores niet opgeslagen?**
A: Check of je admin rechten hebt (`user_roles` tabel). Scores zijn alleen door admins in te voeren.

**Q: Waarom zie ik geen punten na het invoeren van een score?**
A: De `recalculate_match_points()` trigger draait automatisch. Check of de wedstrijd scores (`home_score` + `away_score`) niet NULL zijn.

**Q: Hoe maak ik iemand admin?**
A: Insert een record in `user_roles` met `role = 'admin'` en de juiste `user_id`.

**Q: Kan ik de scoring regels per pool aanpassen?**
A: Ja, wijzig `scoring_rules_json` in de `pools` tabel.

---

*Laatst bijgewerkt: 22 februari 2026*
