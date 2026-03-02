import { useLocation, Link } from "react-router-dom";
import { SeoPageLayout } from "./seo/SeoPageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Beer, Zap, Star, Copy } from "lucide-react";
import { useSEO } from "@/lib/seo";

const TEMPLATES = {
  nl: [
    {
      id: "standaard",
      icon: Trophy,
      name: "Standaard WK Poule",
      desc: "Klassieke poule met 48 groepswedstrijden + knock-out. Exacte score = 6pt, doelsaldo = 4pt, winnaar = 3pt.",
      members: "2–100",
      badge: "Populair",
      badgeVariant: "default" as const,
      cta: "Start deze poule",
      href: "/app/new?template=standaard",
      features: ["48 groepswedstrijden", "Knock-out fase", "Live klassement", "WhatsApp delen"],
    },
    {
      id: "kantoor",
      icon: Users,
      name: "Kantoor / Bedrijfspoule",
      desc: "Ideaal voor collega's. Inclusief bedrijfslogo, eigen kleuren en Slack/Teams-ready uitnodigingslinks.",
      members: "5–500",
      badge: "Zakelijk",
      badgeVariant: "secondary" as const,
      cta: "Poule voor team",
      href: "/app/new?template=kantoor&type=bedrijf",
      features: ["Bedrijfsbranding", "CSV-uitnodigingen", "Manager dashboard", "Export Excel"],
    },
    {
      id: "pub",
      icon: Beer,
      name: "Kroeg / Pub Poule",
      desc: "Extra bonusvragen, gele kaart-weddenschap en 'Wie scoort eerst?'. Perfect voor op het terras.",
      members: "4–50",
      badge: "Fun",
      badgeVariant: "outline" as const,
      cta: "Start kroegpoule",
      href: "/app/new?template=pub",
      features: ["Bonusvragen", "Eerste scorer voorspelling", "QR-code poster", "Prijzenpot tracker"],
    },
    {
      id: "pro",
      icon: Star,
      name: "Pro Analyst Poule",
      desc: "Aangepaste puntentelling, handicaps en geavanceerde statistieken voor serieuze voorspellers.",
      members: "2–50",
      badge: "Nieuw",
      badgeVariant: "destructive" as const,
      cta: "Ga pro",
      href: "/app/new?template=pro",
      features: ["Custom scoring", "Handicap systeem", "Statistieken dashboard", "Heatmaps"],
    },
  ],
  en: [
    {
      id: "standard",
      icon: Trophy,
      name: "Standard WK Pool",
      desc: "Classic pool with 48 group matches + knockout. Exact score = 6pt, goal diff = 4pt, winner = 3pt.",
      members: "2–100",
      badge: "Popular",
      badgeVariant: "default" as const,
      cta: "Start this pool",
      href: "/app/new?template=standard&lang=en",
      features: ["48 group matches", "Knockout stage", "Live leaderboard", "WhatsApp sharing"],
    },
    {
      id: "office",
      icon: Users,
      name: "Office / Company Pool",
      desc: "Perfect for colleagues. Includes company branding, custom colors and Slack/Teams-ready invite links.",
      members: "5–500",
      badge: "Business",
      badgeVariant: "secondary" as const,
      cta: "Pool for team",
      href: "/app/new?template=office&type=company&lang=en",
      features: ["Company branding", "CSV invites", "Manager dashboard", "Export Excel"],
    },
    {
      id: "pub",
      icon: Beer,
      name: "Pub / Bar Pool",
      desc: "Extra bonus questions, yellow card bets and 'Who scores first?'. Perfect for watching parties.",
      members: "4–50",
      badge: "Fun",
      badgeVariant: "outline" as const,
      cta: "Start pub pool",
      href: "/app/new?template=pub&lang=en",
      features: ["Bonus questions", "First scorer prediction", "QR code poster", "Prize pot tracker"],
    },
    {
      id: "pro",
      icon: Star,
      name: "Pro Analyst Pool",
      desc: "Custom scoring, handicaps and advanced statistics for serious predictors.",
      members: "2–50",
      badge: "New",
      badgeVariant: "destructive" as const,
      cta: "Go pro",
      href: "/app/new?template=pro&lang=en",
      features: ["Custom scoring", "Handicap system", "Stats dashboard", "Heatmaps"],
    },
  ],
};

export default function Templates() {
  const { pathname } = useLocation();
  const isNl = !pathname.startsWith("/en/templates");
  const lang = isNl ? "nl" : "en";
  const templates = TEMPLATES[lang];

  useSEO({
    title: isNl ? "WK 2026 poule templates – 1-klik starten | Goaltje" : "WK 2026 pool templates – 1-click start | Goaltje",
    description: isNl
      ? "Kies een kant-en-klare WK 2026 poule template en start in 1 klik. Standaard, kantoor, kroeg of pro – voor ieder wat wils."
      : "Choose a ready-made WK 2026 pool template and start in 1 click. Standard, office, pub or pro – something for everyone.",
    canonical: `https://goaltje.nl${pathname}`,
  });

  return (
    <SeoPageLayout lang={lang} altLangPath={isNl ? "/en/templates" : "/templates"}>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: isNl ? "WK 2026 Poule Templates" : "WK 2026 Pool Templates",
            numberOfItems: templates.length,
            itemListElement: templates.map((t, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: t.name,
              description: t.desc,
              url: `https://goaltje.nl${t.href}`,
            })),
          }),
        }}
      />

      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
        {isNl ? "WK 2026 Poule Templates" : "WK 2026 Pool Templates"}
      </h1>
      <p className="text-muted-foreground mb-8 text-lg">
        {isNl
          ? "Kies een template en start je poule in 1 klik. Geen account nodig om te beginnen."
          : "Pick a template and start your pool in 1 click. No account needed to begin."}
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        {templates.map((t) => (
          <Card key={t.id} className="flex flex-col border-border hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-1">
                <t.icon className="h-6 w-6 text-primary" />
                <Badge variant={t.badgeVariant}>{t.badge}</Badge>
              </div>
              <CardTitle className="text-lg">{t.name}</CardTitle>
              <CardDescription>{t.desc}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-3">
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Users className="h-3 w-3" /> {t.members} {isNl ? "spelers" : "players"}
              </p>
              <ul className="grid grid-cols-2 gap-1">
                {t.features.map((f) => (
                  <li key={f} className="text-xs text-muted-foreground flex items-center gap-1">
                    <Zap className="h-3 w-3 text-primary/60" /> {f}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Link to={t.href} className="w-full">
                <Button className="w-full gap-2">
                  <Copy className="h-4 w-4" /> {t.cta}
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="mt-12 text-center">
        <p className="text-muted-foreground mb-4">
          {isNl
            ? "Liever helemaal zelf instellen? Maak een lege poule aan."
            : "Prefer full customization? Create a blank pool."}
        </p>
        <Link to={isNl ? "/app/new" : "/app/new?lang=en"}>
          <Button variant="outline" size="lg">
            {isNl ? "Lege poule maken" : "Create blank pool"}
          </Button>
        </Link>
      </div>
    </SeoPageLayout>
  );
}
