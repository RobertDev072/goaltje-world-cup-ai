import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSEO } from "@/lib/seo";
import { SeoPageLayout } from "./SeoPageLayout";
import { Users, Share2, Trophy, Clock, ArrowRight } from "lucide-react";

const content = {
  nl: {
    title: "Maak gratis WK 2026 poule met vrienden | Goaltje",
    description: "Start in 2 minuten een gratis WK 2026 voetbalpoule met vrienden. Deel via WhatsApp, voorspel uitslagen en strijd om de winst. Probeer Goaltje nu!",
    h1: "Hoe maak je een WK 2026 poule met vrienden in 2 minuten?",
    intro: "Het WK 2026 in de VS, Mexico en Canada wordt het grootste voetbaltoernooi ooit — met 48 landen en 104 wedstrijden. Wat is er leuker dan samen met vrienden voorspellen wie wint? Met Goaltje start je in 3 simpele stappen een gratis WK poule.",
    steps: [
      { icon: "1️⃣", title: "Maak een poule aan", desc: "Klik op 'Maak poule', kies een naam en je poule is klaar. Geen account nodig om te starten." },
      { icon: "2️⃣", title: "Nodig vrienden uit", desc: "Deel de unieke WhatsApp-link of QR-code. Vrienden joinen met één klik — geen app download nodig." },
      { icon: "3️⃣", title: "Voorspel alle wedstrijden", desc: "Iedereen voorspelt de uitslagen van alle WK-wedstrijden. Exacte score = 5 punten, juiste winnaar = 3 punten." },
      { icon: "🏆", title: "Volg het live klassement", desc: "Tijdens het WK zie je live wie er bovenaan staat. Rivaal-modus, badges en chat maken het extra spannend." },
    ],
    whyTitle: "Waarom Goaltje voor je vriendenpoule?",
    whyItems: [
      "100% gratis — geen verborgen kosten",
      "Werkt perfect op mobiel (PWA)",
      "Live uitslagen en automatische puntentelling",
      "Deel via WhatsApp in 1 klik",
      "Rivaal-modus: daag je beste vriend uit",
      "Bonus vragen voor extra punten",
    ],
    ctaText: "Start mijn poule",
    ctaUrl: "/app/new",
    canonical: "https://goaltje.nl/wk-2026-poule-maken-met-vrienden",
    altPath: "/make-wk-2026-pool-with-friends",
  },
  en: {
    title: "Make free WK 2026 pool with friends | Goaltje",
    description: "Start a free World Cup 2026 football pool with friends in 2 minutes. Share via WhatsApp, predict scores and compete for the win. Try Goaltje now!",
    h1: "How to make a WK 2026 pool with friends in 2 minutes?",
    intro: "The 2026 World Cup in the US, Mexico and Canada will be the biggest football tournament ever — with 48 countries and 104 matches. What's more fun than predicting together with friends? With Goaltje you start a free WK pool in 3 simple steps.",
    steps: [
      { icon: "1️⃣", title: "Create a pool", desc: "Click 'Create pool', pick a name and your pool is ready. No account needed to start." },
      { icon: "2️⃣", title: "Invite friends", desc: "Share the unique WhatsApp link or QR code. Friends join with one click — no app download needed." },
      { icon: "3️⃣", title: "Predict all matches", desc: "Everyone predicts the scores of all WK matches. Exact score = 5 points, correct winner = 3 points." },
      { icon: "🏆", title: "Follow the live leaderboard", desc: "During the WK you see live who's on top. Rival mode, badges and chat make it extra exciting." },
    ],
    whyTitle: "Why Goaltje for your friend pool?",
    whyItems: [
      "100% free — no hidden costs",
      "Works perfectly on mobile (PWA)",
      "Live scores and automatic point calculation",
      "Share via WhatsApp in 1 click",
      "Rival mode: challenge your best friend",
      "Bonus questions for extra points",
    ],
    ctaText: "Start my pool",
    ctaUrl: "/app/new?lang=en",
    canonical: "https://goaltje.nl/make-wk-2026-pool-with-friends",
    altPath: "/wk-2026-poule-maken-met-vrienden",
  },
};

export default function PoolMakenVrienden() {
  const { pathname } = useLocation();
  const lang = pathname.includes("make-wk") ? "en" : "nl";
  const c = content[lang];

  useSEO({ title: c.title, description: c.description, canonical: c.canonical });

  // JSON-LD HowTo
  const howToLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: c.h1,
    description: c.description,
    step: c.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.title,
      text: s.desc,
    })),
  };

  return (
    <SeoPageLayout lang={lang} altLangPath={c.altPath}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }} />

      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-4">{c.h1}</h1>
      <p className="text-lg text-muted-foreground mb-8 leading-relaxed">{c.intro}</p>

      {/* Steps */}
      <div className="grid gap-4 mb-10">
        {c.steps.map((step, i) => (
          <Card key={i} className="border-border">
            <CardContent className="flex gap-4 items-start p-5">
              <span className="text-2xl flex-shrink-0 mt-0.5">{step.icon}</span>
              <div>
                <h2 className="font-bold text-foreground mb-1">{step.title}</h2>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CTA */}
      <div className="text-center mb-12">
        <Link to={c.ctaUrl}>
          <Button size="lg" className="gap-2 text-base px-8">
            {c.ctaText} <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Why Goaltje */}
      <h2 className="text-2xl font-bold text-foreground mb-4">{c.whyTitle}</h2>
      <ul className="space-y-2 mb-8">
        {c.whyItems.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-muted-foreground">
            <span className="text-primary mt-0.5">✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </SeoPageLayout>
  );
}
