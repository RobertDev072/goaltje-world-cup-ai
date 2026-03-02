import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSEO } from "@/lib/seo";
import { SeoPageLayout } from "./SeoPageLayout";
import { ArrowRight, Lightbulb } from "lucide-react";

const content = {
  nl: {
    title: "Tips winnen WK 2026 poule | Goaltje",
    description: "Top 5 tips om je WK 2026 poule te winnen. Slimme voorspelstrategieën, veelgemaakte fouten en bewezen tactieken voor je voetbalpoule.",
    h1: "Top 5 tips om je WK poule te winnen",
    intro: "Wil je je vriendenpoule of bedrijfspoule winnen? Deze 5 bewezen strategieën helpen je om meer punten te scoren dan je concurrenten.",
    tips: [
      {
        title: "1. Voorspel lage scores bij groepswedstrijden",
        desc: "De meeste WK-groepswedstrijden eindigen in 1-0, 2-1 of 1-1. Vermijd voorspellingen als 4-2 of 5-0 — die komen bijna nooit voor in de groepsfase. Kies vaker 1-0 of 2-1 voor de favoriet.",
      },
      {
        title: "2. Volg de favorieten, maar niet blindelings",
        desc: "Topteams als Brazilië, Frankrijk en Argentinië winnen meestal hun groepswedstrijden. Maar in de knock-outfase zijn verrassingen veel vaker. Durf af te wijken van de favoriet bij een kwartfinale of halve finale.",
      },
      {
        title: "3. Gebruik bonusvragen strategisch",
        desc: "Bonuspunten kunnen het verschil maken. Kies voor bonusvragen niet altijd de voor de hand liggende optie. Als iedereen Mbappé als topscorer kiest, verdien je er weinig mee bij een goed antwoord.",
      },
      {
        title: "4. Vul alles in vóór de deadline",
        desc: "Bij gelijke stand wint degene die het eerst heeft ingevuld (tiebreaker). Vul je voorspellingen dus zo vroeg mogelijk in. Je kunt ze altijd nog aanpassen tot aan de deadline.",
      },
      {
        title: "5. Durf af te wijken bij knock-outwedstrijden",
        desc: "In de knock-outfase maakt een verrassing het verschil. Als 90% een favoriet kiest en jij de underdog, en die wint — dan spring je in de stand. Neem een berekend risico bij één of twee wedstrijden.",
      },
    ],
    bonus: {
      title: "Bonustip: Check de Goaltje insights",
      desc: "Goaltje toont je slimme inzichten per wedstrijd: hoe anderen voorspellen, welke trends er zijn en waar je extra punten kunt pakken. Gebruik dit in je voordeel!",
    },
    ctaText: "Start mijn poule",
    ctaUrl: "/app/new",
    canonical: "https://goaltje.nl/wk-poule-tips-voorspellingen",
    altPath: "/wk-pool-prediction-tips",
  },
  en: {
    title: "Tips to win WK 2026 pool | Goaltje",
    description: "Top 5 tips to win your World Cup 2026 pool. Smart prediction strategies, common mistakes and proven tactics for your football pool.",
    h1: "Top 5 tips to win your WK pool",
    intro: "Want to win your friend pool or company pool? These 5 proven strategies help you score more points than your competitors.",
    tips: [
      {
        title: "1. Predict low scores for group matches",
        desc: "Most World Cup group matches end 1-0, 2-1 or 1-1. Avoid predictions like 4-2 or 5-0 — they almost never happen in the group stage. Choose 1-0 or 2-1 for the favorite more often.",
      },
      {
        title: "2. Follow the favorites, but not blindly",
        desc: "Top teams like Brazil, France and Argentina usually win their group matches. But in the knockout stage surprises are much more common. Dare to deviate from the favorite in a quarter-final or semi-final.",
      },
      {
        title: "3. Use bonus questions strategically",
        desc: "Bonus points can make the difference. For bonus questions don't always pick the obvious option. If everyone picks Mbappé as top scorer, you gain little from a correct answer.",
      },
      {
        title: "4. Submit everything before the deadline",
        desc: "When points are tied, the person who submitted first wins (tiebreaker). So fill in your predictions as early as possible. You can always adjust them until the deadline.",
      },
      {
        title: "5. Dare to deviate in knockout matches",
        desc: "In the knockout stage a surprise makes the difference. If 90% picks a favorite and you pick the underdog, and they win — you jump in the standings. Take a calculated risk on one or two matches.",
      },
    ],
    bonus: {
      title: "Bonus tip: Check Goaltje insights",
      desc: "Goaltje shows you smart insights per match: how others predict, what trends there are and where you can grab extra points. Use this to your advantage!",
    },
    ctaText: "Start my pool",
    ctaUrl: "/app/new?lang=en",
    canonical: "https://goaltje.nl/wk-pool-prediction-tips",
    altPath: "/wk-poule-tips-voorspellingen",
  },
};

export default function PouleTips() {
  const { pathname } = useLocation();
  const lang = pathname.includes("prediction-tips") ? "en" : "nl";
  const c = content[lang];

  useSEO({ title: c.title, description: c.description, canonical: c.canonical });

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: c.h1,
    description: c.description,
    author: { "@type": "Person", name: "Goaltje" },
    publisher: { "@type": "Organization", name: "Goaltje", url: "https://goaltje.nl" },
  };

  return (
    <SeoPageLayout lang={lang} altLangPath={c.altPath}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />

      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-4">{c.h1}</h1>
      <p className="text-lg text-muted-foreground mb-8 leading-relaxed">{c.intro}</p>

      <div className="space-y-6 mb-10">
        {c.tips.map((tip, i) => (
          <Card key={i} className="border-border">
            <CardContent className="p-5">
              <h2 className="font-bold text-foreground mb-2">{tip.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{tip.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bonus tip highlight */}
      <div className="rounded-xl bg-primary/5 border border-primary/20 p-5 mb-10">
        <div className="flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-foreground mb-1">{c.bonus.title}</h3>
            <p className="text-sm text-muted-foreground">{c.bonus.desc}</p>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Link to={c.ctaUrl}>
          <Button size="lg" className="gap-2 text-base px-8">
            {c.ctaText} <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </SeoPageLayout>
  );
}
