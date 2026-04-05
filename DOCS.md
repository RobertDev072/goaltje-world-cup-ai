# Goaltje — WK 2026 Voetbalpoule Platform

> **De #1 WK 2026 voorspellings-app.** Gratis poules maken, alle 104 wedstrijden voorspellen, live scores volgen en je vrienden uitdagen.

---

## 🏆 Waarom Goaltje?

| Feature | Goaltje | Andere apps |
|---------|---------|-------------|
| **Volledig gratis** | ✅ | ❌ Vaak betaald |
| **104 wedstrijden** | ✅ Alle WK wedstrijden | ⚠️ Vaak alleen groepsfase |
| **Live scores** | ✅ Real-time via API | ❌ Handmatig |
| **Installeerbaar als app** | ✅ PWA op elke telefoon | ❌ Alleen website |
| **Google login** | ✅ 1-klik registratie | ⚠️ Niet altijd |
| **QR-code delen** | ✅ Direct scannen & joinen | ❌ |
| **Custom scoring** | ✅ Per poule instelbaar | ❌ Vast systeem |
| **Meertalig** | ✅ NL, EN, ES, PT | ❌ Meestal 1 taal |
| **Webview-ready** | ✅ DreamFlow compatible | ❌ |
| **White-label** | ✅ Bedrijfsbranding | ❌ |

---

## 🚀 Tech Stack

| Categorie | Technologie |
|-----------|-------------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui + Framer Motion |
| Backend | Supabase (PostgreSQL + Edge Functions + Auth) |
| State | TanStack React Query |
| Routing | React Router DOM v6 |
| Analytics | Vercel Analytics + Speed Insights |
| QR Codes | qrcode.react |
| Charts | Recharts |
| Deploy | Vercel + Supabase Cloud |

---

## 📱 Features

### 🔮 Voorspellingen
- Voorspel alle 104 WK 2026 wedstrijden
- Deadline per wedstrijd (automatisch vergrendeld bij aftrap)
- Knockout-fase met winnaar-voorspelling

### 📊 Slim Puntensysteem
| Scenario | Punten |
|----------|--------|
| **Exacte score** (2-1 → 2-1) | 6 |
| **Juist doelverschil** (2-1 → 3-2) | 4 |
| **Juiste uitslag** (thuiswinst/gelijk/uitwinst) | 3 |
| **Fout** | 0 |

> Alleen de hoogste score telt — geen stapeling. Per poule aanpasbaar.

### 🏅 Leaderboard & Tiebreakers
1. Totaal punten
2. Aantal exacte scores
3. Correcte resultaten
4. Totaal voorspelde goals
5. Vroegste voorspelling

### 👥 Poules
- Onbeperkt poules maken en joinen
- 6-karakter invite code + QR-code delen
- WhatsApp, Facebook, Instagram & TikTok sharing
- Rival-modus: kies je directe concurrent
- Pool chat met emoji-reacties

### ⚽ Live Match Center
- Real-time scores via API-Football
- Doelpunten, kaarten en wissels per wedstrijd
- AI-gegenereerde wedstrijdnieuws

### 🏟️ Knockout Bracket
- Visuele bracket van Ronde van 32 tot Finale
- Automatisch bijgewerkt met resultaten

### 🎖️ Badges & Achievements
- Verdien badges voor prestaties
- Streak tracking en nauwkeurigheidsbadges

### 🔔 Smart Insights
- "Catch-up calculator" — hoeveel punten heb je nodig?
- Wedstrijdsuggesties en trends

---

## 🔐 Authenticatie

- **Email + wachtwoord** registratie
- **Google OAuth** — 1-klik login
- Automatische profielaanmaak via database trigger
- Wachtwoord reset via email
- Sessie tracking per apparaat

---

## 🛡️ Beveiliging

- **Row Level Security (RLS)** op alle tabellen
- Gebruikers zien alleen data van hun eigen poules
- Admin-functies afgeschermd via `has_role()` check
- Validatie-triggers blokkeren voorspellingen na deadline
- Geen raw SQL — alles via typed Supabase SDK

---

## 🌍 SEO & Marketing

- **4 talen**: Nederlands, Engels, Spaans, Portugees
- **JSON-LD**: WebApplication, Organization, SportsEvent, FAQPage
- **Open Graph**: Geoptimaliseerde social media previews
- **Sitemap + robots.txt**: Zoekmachine-geoptimaliseerd
- **Hreflang tags**: Correcte taalverwijzingen
- **Performance**: Lazy loading, code splitting, aggressive caching

---

## 📦 Architectuur

```
┌──────────────────────────────────────────────────┐
│           React Frontend (Vite PWA)              │
│     Tailwind + shadcn/ui + Framer Motion         │
│     Vercel Analytics + Speed Insights            │
└─────────────────────┬────────────────────────────┘
                      │ Supabase JS SDK
┌─────────────────────▼────────────────────────────┐
│              Supabase Backend                    │
│  ┌──────────┐ ┌──────────┐ ┌───────────────────┐│
│  │   Auth   │ │ Postgres │ │   Edge Functions  ││
│  │ (Google+ │ │  + RLS   │ │ fetch-scores      ││
│  │  Email)  │ │          │ │ seed-wc2026       ││
│  └──────────┘ └──────────┘ │ match-news        ││
│                            │ recalc-all        ││
│                            └───────────────────┘│
└──────────────────────────────────────────────────┘
                      │
            ┌─────────▼─────────┐
            │   API-Football    │
            │  (live scores)    │
            └───────────────────┘
```

---

## 🗄️ Database Tabellen

| Tabel | Beschrijving | RLS |
|-------|-------------|-----|
| `teams` | 48 WK 2026 landen | Publiek leesbaar |
| `matches` | 104 wedstrijden | Publiek leesbaar, admin schrijfbaar |
| `pools` | Voorspellingsgroepen | Leden + publieke pools |
| `pool_members` | Pool-lidmaatschap | Alleen eigen pool |
| `predictions` | Voorspellingen | Alleen eigen pool |
| `profiles` | Gebruikersprofielen | Publiek leesbaar |
| `bonus_questions` | Bonusvragen | Publiek leesbaar |
| `bonus_predictions` | Bonusantwoorden | Eigen pool |
| `match_events` | Goals, kaarten, wissels | Publiek leesbaar |
| `pool_messages` | Chat berichten | Eigen pool |
| `wk_news_cache` | AI wedstrijdnieuws | Publiek leesbaar |
| `user_roles` | Admin/moderator | Alleen admins |
| `user_sessions` | Login tracking | Eigen sessies |
| `tenants` | White-label config | Eigen tenant |

---

## 🚀 Deployment

### Frontend (Vercel)
- Automatische deploys via Vercel
- Aggressive caching: JS/CSS 1 jaar, images 1 week
- Security headers: X-Frame-Options, Referrer-Policy
- SPA rewrites via vercel.json

### Backend (Supabase)
- Edge Functions deployen automatisch
- Database migraties via migration tool
- Secrets beheerd via Supabase dashboard

### PWA
- Installeerbaar op iOS en Android
- Offline caching via service worker
- 192x192 en 512x512 iconen

---

## 👤 Over de Maker

**Robert Cavalcante Rocha** — Full-stack developer en voetbalfan.

- 🌐 [robertdev.nl](https://robertdev.nl)
- 📧 robert@robertdev.nl
- 🇳🇱🇧🇷 Nederlands-Braziliaans

> *"Ik bouw Goaltje omdat ik geloof dat het WK beleven met vrienden het mooiste is aan voetbal. Geen ingewikkelde apps, geen betaalmuren — gewoon puur plezier."*

---

## 📄 Licentie

© 2025-2026 Goaltje by RobertDev.nl. Alle rechten voorbehouden.
