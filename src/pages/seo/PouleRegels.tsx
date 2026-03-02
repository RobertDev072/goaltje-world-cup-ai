import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSEO } from "@/lib/seo";
import { SeoPageLayout } from "./SeoPageLayout";
import { ArrowRight } from "lucide-react";

const content = {
  nl: {
    title: "WK poule regels & puntentelling | Goaltje",
    description: "Alles over WK poule regels en puntentelling. Leer hoe punten worden berekend: exacte score, winnaar, doelsaldo en bonusvragen. Standaard WK-poule regels uitgelegd.",
    h1: "Standaard WK-poule puntentelling",
    intro: "Hoe werkt de puntentelling in een WK 2026 poule? Hieronder leggen we de standaard regels uit die de meeste voetbalpoules gebruiken — en die Goaltje automatisch voor je berekent.",
    sections: [
      {
        title: "Puntentelling per wedstrijd",
        rows: [
          { label: "Exacte uitslag voorspeld", points: "5 punten", example: "Voorspelling: 2-1, Uitslag: 2-1" },
          { label: "Juiste winnaar (of gelijk)", points: "3 punten", example: "Voorspelling: 3-1, Uitslag: 2-0" },
          { label: "Juist doelsaldo", points: "1 punt", example: "Voorspelling: 3-1, Uitslag: 4-2 (verschil: +2)" },
          { label: "Helemaal fout", points: "0 punten", example: "Voorspelling: 2-0, Uitslag: 0-1" },
        ],
      },
      {
        title: "Bonusvragen",
        description: "Naast wedstrijdvoorspellingen kun je bonuspunten verdienen met extra vragen zoals: Wie wordt wereldkampioen? Wie wordt topscorer? Welk land scoort de meeste goals?",
      },
      {
        title: "Gelijke stand (tiebreaker)",
        description: "Bij gelijke puntenstand wordt gekeken naar: 1) Aantal exacte scores, 2) Aantal juiste winnaars, 3) Wie het eerst heeft ingevuld.",
      },
    ],
    ctaText: "Start mijn poule",
    ctaUrl: "/app/new",
    canonical: "https://goaltje.nl/voetbalpoule-regels-puntentelling",
    altPath: "/football-pool-rules-scoring",
  },
  en: {
    title: "WK pool rules & scoring | Goaltje",
    description: "Everything about World Cup pool rules and scoring. Learn how points are calculated: exact score, winner, goal difference and bonus questions.",
    h1: "Standard World Cup pool scoring",
    intro: "How does scoring work in a WK 2026 pool? Below we explain the standard rules most football pools use — and that Goaltje calculates automatically for you.",
    sections: [
      {
        title: "Scoring per match",
        rows: [
          { label: "Exact score predicted", points: "5 points", example: "Prediction: 2-1, Result: 2-1" },
          { label: "Correct winner (or draw)", points: "3 points", example: "Prediction: 3-1, Result: 2-0" },
          { label: "Correct goal difference", points: "1 point", example: "Prediction: 3-1, Result: 4-2 (diff: +2)" },
          { label: "Completely wrong", points: "0 points", example: "Prediction: 2-0, Result: 0-1" },
        ],
      },
      {
        title: "Bonus questions",
        description: "Besides match predictions you can earn bonus points with extra questions like: Who will be world champion? Who will be top scorer? Which country scores the most goals?",
      },
      {
        title: "Tiebreaker",
        description: "When points are tied, the order is decided by: 1) Number of exact scores, 2) Number of correct winners, 3) Who submitted first.",
      },
    ],
    ctaText: "Start my pool",
    ctaUrl: "/app/new?lang=en",
    canonical: "https://goaltje.nl/football-pool-rules-scoring",
    altPath: "/voetbalpoule-regels-puntentelling",
  },
};

export default function PouleRegels() {
  const { pathname } = useLocation();
  const lang = pathname.includes("football-pool") ? "en" : "nl";
  const c = content[lang];

  useSEO({ title: c.title, description: c.description, canonical: c.canonical });

  return (
    <SeoPageLayout lang={lang} altLangPath={c.altPath}>
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-4">{c.h1}</h1>
      <p className="text-lg text-muted-foreground mb-8 leading-relaxed">{c.intro}</p>

      {c.sections.map((section, i) => (
        <div key={i} className="mb-8">
          <h2 className="text-xl font-bold text-foreground mb-3">{section.title}</h2>
          {"rows" in section && section.rows ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-3 font-semibold text-foreground">{lang === "nl" ? "Resultaat" : "Result"}</th>
                    <th className="text-left p-3 font-semibold text-foreground">{lang === "nl" ? "Punten" : "Points"}</th>
                    <th className="text-left p-3 font-semibold text-foreground hidden sm:table-cell">{lang === "nl" ? "Voorbeeld" : "Example"}</th>
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row, j) => (
                    <tr key={j} className="border-t border-border">
                      <td className="p-3 text-muted-foreground">{row.label}</td>
                      <td className="p-3 font-bold text-primary">{row.points}</td>
                      <td className="p-3 text-muted-foreground hidden sm:table-cell text-xs">{row.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground leading-relaxed">{section.description}</p>
          )}
        </div>
      ))}

      <div className="text-center mt-10">
        <Link to={c.ctaUrl}>
          <Button size="lg" className="gap-2 text-base px-8">
            {c.ctaText} <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </SeoPageLayout>
  );
}
