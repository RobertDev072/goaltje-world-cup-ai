import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useSEO } from "@/lib/seo";
import { MapPin, Globe, Trophy, LayoutTemplate, Shield, BookOpen, Users, FileText } from "lucide-react";

const sections = [
  {
    title: "Hoofdpagina's",
    icon: Globe,
    links: [
      { to: "/", label: "Home – Goaltje.nl" },
      { to: "/bedrijven", label: "Bedrijfspoules" },
      { to: "/leaderboard", label: "Live Leaderboard" },
      { to: "/templates", label: "Poule Templates" },
      { to: "/login", label: "Inloggen / Registreren" },
      { to: "/privacy", label: "Privacybeleid" },
    ],
  },
  {
    title: "SEO & Blog",
    icon: BookOpen,
    links: [
      { to: "/wk-2026-poule-maken-met-vrienden", label: "WK 2026 poule maken met vrienden" },
      { to: "/bedrijfspoule-wk-2026-kantoor", label: "Bedrijfspoule WK 2026 kantoor" },
      { to: "/voetbalpoule-regels-puntentelling", label: "Voetbalpoule regels & puntentelling" },
      { to: "/wk-poule-tips-voorspellingen", label: "WK poule tips & voorspellingen" },
    ],
  },
  {
    title: "English Pages",
    icon: Globe,
    links: [
      { to: "/en", label: "Home (English)" },
      { to: "/en/leaderboard", label: "Live Leaderboard (EN)" },
      { to: "/en/templates", label: "Pool Templates (EN)" },
      { to: "/make-wk-2026-pool-with-friends", label: "Make WK 2026 pool with friends" },
      { to: "/company-wk-2026-pool-office", label: "Company WK 2026 pool office" },
      { to: "/football-pool-rules-scoring", label: "Football pool rules & scoring" },
      { to: "/wk-pool-prediction-tips", label: "WK pool prediction tips" },
    ],
  },
  {
    title: "App (ingelogd)",
    icon: Users,
    links: [
      { to: "/app", label: "Dashboard" },
      { to: "/app/matches", label: "Wedstrijden" },
      { to: "/app/pool", label: "Mijn Poules" },
      { to: "/app/bracket", label: "Bracket" },
      { to: "/app/profile", label: "Profiel" },
    ],
  },
];

export default function Sitemap() {
  useSEO({
    title: "Sitemap – Goaltje.nl | Alle pagina's",
    description: "Overzicht van alle pagina's op Goaltje.nl – WK 2026 voorspellingen, poules, leaderboard en meer.",
    canonical: "https://goaltje.nl/sitemap",
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <MapPin className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Sitemap</h1>
        </div>
        <p className="text-muted-foreground mb-10">
          Overzicht van alle pagina's op Goaltje.nl
        </p>

        <div className="grid gap-8">
          {sections.map((section) => (
            <div key={section.title} className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <section.icon className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-card-foreground">{section.title}</h2>
              </div>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-primary hover:underline text-sm"
                    >
                      {link.label}
                    </Link>
                    <span className="text-muted-foreground text-xs ml-2">{link.to}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <a
            href="/sitemap.xml"
            className="text-sm text-muted-foreground hover:text-primary underline"
          >
            📄 sitemap.xml (voor zoekmachines)
          </a>
        </div>
      </div>
    </div>
  );
}
