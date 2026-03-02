import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSEO } from "@/lib/seo";
import { SeoPageLayout } from "./SeoPageLayout";
import { ArrowRight, Building2, Users, Trophy, Zap, Shield } from "lucide-react";

const content = {
  nl: {
    title: "WK 2026 bedrijfspoule voor kantoor | Goaltje",
    description: "Organiseer in 2 minuten een WK 2026 bedrijfspoule voor je kantoor. Live klassement, automatische punten en eenvoudig delen met collega's. Probeer Goaltje!",
    h1: "5 simpele regels voor je WK bedrijfspoule",
    intro: "Een WK bedrijfspoule is dé manier om de teamspirit op kantoor te boosten. Met Goaltje organiseer je als HR-manager of teamlead in 2 minuten een professionele poule voor tot 500 collega's.",
    rules: [
      { icon: "⚽", title: "Exacte uitslag = 5 punten", desc: "Voorspel je de exacte score? Dan krijg je de maximale 5 punten." },
      { icon: "✅", title: "Juiste winnaar = 3 punten", desc: "De winnaar goed maar niet de exacte score? 3 punten erbij." },
      { icon: "🎯", title: "Juist doelsaldo = 1 punt", desc: "Het juiste doelverschil voorspeld? Een bonuspunt." },
      { icon: "📊", title: "Live klassement", desc: "Iedereen volgt real-time de stand. Wie staat er bovenaan op jouw afdeling?" },
      { icon: "🏆", title: "Bonusvragen", desc: "Extra vragen zoals 'Wie wordt topscorer?' voor bonuspunten." },
    ],
    benefits: [
      { icon: Building2, text: "Perfect voor bedrijven van 10 tot 500 medewerkers" },
      { icon: Zap, text: "Opzetten in 2 minuten — deel link via Slack of Teams" },
      { icon: Shield, text: "Privé en veilig — alleen uitgenodigde collega's" },
      { icon: Trophy, text: "Automatische puntentelling en live stand" },
    ],
    ctaText: "Poule voor mijn team",
    ctaUrl: "/app/new?type=bedrijf",
    canonical: "https://goaltje.nl/bedrijfspoule-wk-2026-kantoor",
    altPath: "/company-wk-2026-pool-office",
  },
  en: {
    title: "WK 2026 company pool for office | Goaltje",
    description: "Set up a World Cup 2026 company pool for your office in 2 minutes. Live leaderboard, automatic scoring and easy sharing with colleagues. Try Goaltje!",
    h1: "5 simple rules for your WK company pool",
    intro: "A World Cup company pool is the best way to boost team spirit at the office. With Goaltje you set up a professional pool for up to 500 colleagues in 2 minutes as an HR manager or team lead.",
    rules: [
      { icon: "⚽", title: "Exact score = 5 points", desc: "Predict the exact score? You get the maximum 5 points." },
      { icon: "✅", title: "Correct winner = 3 points", desc: "Got the winner right but not the exact score? 3 points added." },
      { icon: "🎯", title: "Correct goal difference = 1 point", desc: "Predicted the right goal difference? A bonus point." },
      { icon: "📊", title: "Live leaderboard", desc: "Everyone follows the standings in real-time. Who's on top in your department?" },
      { icon: "🏆", title: "Bonus questions", desc: "Extra questions like 'Who will be top scorer?' for bonus points." },
    ],
    benefits: [
      { icon: Building2, text: "Perfect for companies of 10 to 500 employees" },
      { icon: Zap, text: "Set up in 2 minutes — share link via Slack or Teams" },
      { icon: Shield, text: "Private and secure — invited colleagues only" },
      { icon: Trophy, text: "Automatic scoring and live standings" },
    ],
    ctaText: "Pool for my team",
    ctaUrl: "/app/new?type=company&lang=en",
    canonical: "https://goaltje.nl/company-wk-2026-pool-office",
    altPath: "/bedrijfspoule-wk-2026-kantoor",
  },
};

export default function BedrijfspouleKantoor() {
  const { pathname } = useLocation();
  const lang = pathname.includes("company") ? "en" : "nl";
  const c = content[lang];

  useSEO({ title: c.title, description: c.description, canonical: c.canonical });

  const howToLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: c.h1,
    description: c.description,
    step: c.rules.map((r, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: r.title,
      text: r.desc,
    })),
  };

  return (
    <SeoPageLayout lang={lang} altLangPath={c.altPath}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }} />

      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-4">{c.h1}</h1>
      <p className="text-lg text-muted-foreground mb-8 leading-relaxed">{c.intro}</p>

      <div className="grid gap-4 mb-10">
        {c.rules.map((rule, i) => (
          <Card key={i} className="border-border">
            <CardContent className="flex gap-4 items-start p-5">
              <span className="text-2xl flex-shrink-0">{rule.icon}</span>
              <div>
                <h2 className="font-bold text-foreground mb-1">{rule.title}</h2>
                <p className="text-sm text-muted-foreground">{rule.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center mb-12">
        <Link to={c.ctaUrl}>
          <Button size="lg" className="gap-2 text-base px-8">
            {c.ctaText} <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <h2 className="text-2xl font-bold text-foreground mb-4">
        {lang === "nl" ? "Waarom Goaltje voor bedrijven?" : "Why Goaltje for companies?"}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {c.benefits.map((b, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
            <b.icon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <span className="text-sm text-muted-foreground">{b.text}</span>
          </div>
        ))}
      </div>
    </SeoPageLayout>
  );
}
