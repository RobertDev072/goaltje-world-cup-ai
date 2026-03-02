import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Globe, Share2, MessageCircle, Mail } from "lucide-react";
import goaltjeLogo from "@/assets/goaltje-logo.png";

const SEO_PAGES_NL = [
  { path: "/wk-2026-poule-maken-met-vrienden", label: "Poule maken met vrienden" },
  { path: "/bedrijfspoule-wk-2026-kantoor", label: "Bedrijfspoule kantoor" },
  { path: "/voetbalpoule-regels-puntentelling", label: "Regels & puntentelling" },
  { path: "/wk-poule-tips-voorspellingen", label: "Tips & voorspellingen" },
  { path: "/leaderboard", label: "Live klassement" },
  { path: "/templates", label: "Poule templates" },
];

const SEO_PAGES_EN = [
  { path: "/make-wk-2026-pool-with-friends", label: "Make pool with friends" },
  { path: "/company-wk-2026-pool-office", label: "Company pool office" },
  { path: "/football-pool-rules-scoring", label: "Rules & scoring" },
  { path: "/wk-pool-prediction-tips", label: "Prediction tips" },
  { path: "/en/leaderboard", label: "Live leaderboard" },
  { path: "/en/templates", label: "Pool templates" },
];

interface Props {
  lang: "nl" | "en";
  altLangPath: string;
  children: React.ReactNode;
}

export function SeoPageLayout({ lang, altLangPath, children }: Props) {
  const isNl = lang === "nl";
  const pages = isNl ? SEO_PAGES_NL : SEO_PAGES_EN;
  const altPages = isNl ? SEO_PAGES_EN : SEO_PAGES_NL;

  const shareText = isNl
    ? "Doe mee aan mijn WK poule op Goaltje: https://goaltje.nl"
    : "Join my WK pool on Goaltje: https://goaltje.nl";

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const mailUrl = `mailto:?subject=${encodeURIComponent(isNl ? "WK 2026 Poule" : "WK 2026 Pool")}&body=${encodeURIComponent(shareText)}`;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 h-14">
          <Link to="/" className="flex items-center gap-2">
            <img src={goaltjeLogo} alt="Goaltje" className="h-8 w-8" />
            <span className="font-bold text-foreground">Goaltje</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">— WK 2026 Pools</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to={altLangPath}>
              <Button variant="ghost" size="sm" className="gap-1">
                <Globe className="h-4 w-4" />
                {isNl ? "EN" : "NL"}
              </Button>
            </Link>
            <Link to={isNl ? "/app/new" : "/app/new?lang=en"}>
              <Button size="sm">{isNl ? "Maak poule" : "Create pool"}</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 md:py-12">
        {children}

        {/* Share section */}
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            {isNl ? "Deel deze pagina" : "Share this page"}
          </p>
          <div className="flex gap-3">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </Button>
            </a>
            <a href={mailUrl}>
              <Button variant="outline" size="sm" className="gap-2">
                <Mail className="h-4 w-4" /> Email
              </Button>
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                {isNl ? "Nederlands" : "Dutch"}
              </p>
              <ul className="space-y-1">
                {SEO_PAGES_NL.map((p) => (
                  <li key={p.path}>
                    <Link to={p.path} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {p.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">English</p>
              <ul className="space-y-1">
                {SEO_PAGES_EN.map((p) => (
                  <li key={p.path}>
                    <Link to={p.path} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {p.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">© 2026 Goaltje</p>
            <div className="flex gap-3">
              <Link to="/privacy" className="text-xs text-muted-foreground hover:text-foreground">Privacy</Link>
              <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">Home</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
