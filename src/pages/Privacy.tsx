import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Cookie, Database, UserCheck, Mail, Trash2, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import goaltjeLogo from "@/assets/goaltje-logo.png";

const sections = [
  {
    icon: Database,
    title: "Welke gegevens verzamelen wij?",
    content: [
      "**Account**: E-mailadres, wachtwoord (versleuteld), en optioneel je naam en profielfoto.",
      "**Voorspellingen**: Je ingevoerde scores en puntenstanden binnen poules.",
      "**Sessiegegevens**: Inlogtijdstip en apparaatinformatie (browser/OS) voor beveiliging.",
      "**Technische data**: IP-adres (anoniem), paginaweergaven en prestatiemetingen via Vercel Analytics — alleen als je hiervoor toestemming geeft.",
    ],
  },
  {
    icon: Cookie,
    title: "Cookies",
    content: [
      "**Noodzakelijke cookies** (altijd actief): Authenticatie-sessie (Supabase), cookie-voorkeur. Zonder deze werkt de app niet.",
      "**Functionele cookies** (optioneel): Taalvoorkeur, thema-instelling, PWA-installatiemelding.",
      "**Analytische cookies** (optioneel): Anonieme gebruiksstatistieken via Vercel Analytics om de app te verbeteren. Er worden geen persoonsgegevens gedeeld met derden.",
      "Je kunt je cookie-voorkeuren op elk moment wijzigen via de cookie-banner of je profielpagina.",
    ],
  },
  {
    icon: Shield,
    title: "Hoe beschermen wij je gegevens?",
    content: [
      "Alle data wordt opgeslagen in een beveiligde Supabase-database met Row Level Security (RLS) — je kunt alleen je eigen gegevens zien en wijzigen.",
      "Wachtwoorden worden versleuteld opgeslagen (bcrypt hashing) en zijn nooit zichtbaar voor ons.",
      "Alle verbindingen verlopen via HTTPS/TLS-encryptie.",
      "Wij delen je gegevens **nooit** met derden voor commerciële doeleinden.",
      "**Wij doen niets met je data** — je gegevens worden uitsluitend gebruikt om de Goaltje-app te laten functioneren (voorspellingen, poules, leaderboards). Er vindt geen verkoop, analyse voor marketing, of profilering plaats.",
    ],
  },
  {
    icon: UserCheck,
    title: "Jouw rechten onder de AVG",
    content: [
      "**Recht op inzage**: Je kunt opvragen welke gegevens wij van je bewaren.",
      "**Recht op rectificatie**: Je kunt je naam, e-mail en profielfoto op elk moment wijzigen via je profiel.",
      "**Recht op verwijdering**: Je kunt je account en alle bijbehorende data laten verwijderen door contact met ons op te nemen.",
      "**Recht op bezwaar**: Je kunt analytische cookies weigeren via de cookie-instellingen.",
      "**Recht op dataportabiliteit**: Je kunt een kopie van je gegevens opvragen in een standaardformaat.",
      "**Recht om toestemming in te trekken**: Eerder gegeven toestemming voor cookies kan op elk moment worden ingetrokken.",
    ],
  },
  {
    icon: Globe,
    title: "Diensten van derden",
    content: [
      "**Supabase** (EU/US): Database, authenticatie en bestandsopslag. Privacy policy: supabase.com/privacy.",
      "**Vercel** (US): Hosting en anonieme analytics. Privacy policy: vercel.com/legal/privacy-policy.",
      "Wij maken geen gebruik van Google Analytics, Facebook Pixel, of andere tracking-diensten.",
    ],
  },
  {
    icon: Trash2,
    title: "Bewaartermijnen",
    content: [
      "Accountgegevens worden bewaard zolang je een actief account hebt.",
      "**Inactieve accounts** (geen login gedurende 60 dagen) worden automatisch verwijderd, inclusief alle persoonlijke gegevens, voorspellingen en poule-lidmaatschappen.",
      "Bij handmatige accountverwijdering worden al je persoonlijke gegevens binnen 30 dagen definitief verwijderd.",
      "Anonieme, geaggregeerde statistieken (zoals totale gebruikersaantallen) kunnen bewaard blijven.",
    ],
  },
  {
    icon: Mail,
    title: "Contact",
    content: [
      "Voor vragen over je privacy of om je rechten uit te oefenen, neem contact met ons op:",
      "**E-mail**: rb085@icloud.com",
      "**Verantwoordelijke**: RobertDev.nl, Nederland",
      "Wij reageren binnen 30 dagen op AVG-verzoeken.",
    ],
  },
];

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/nl" className="flex items-center gap-2">
            <img src={goaltjeLogo} alt="Goaltje" className="w-7 h-7" />
            <span className="font-display font-bold text-sm">GOALTJE</span>
          </Link>
          <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Terug
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Title */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold font-display">Privacybeleid</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Laatst bijgewerkt: 27 februari 2026. Dit privacybeleid is van toepassing op goaltje.nl en de Goaltje web-app.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Bij Goaltje nemen wij je privacy serieus. In dit beleid leggen wij uit welke gegevens wij verzamelen,
            waarom wij dat doen, hoe wij ze beschermen, en welke rechten je hebt als gebruiker.
          </p>
        </div>

        {/* Sections */}
        {sections.map((section, i) => (
          <Card key={i} className="border-0 shadow-elevation-2">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <section.icon className="h-4 w-4 text-primary" />
                </div>
                <h2 className="font-display font-bold text-base">{section.title}</h2>
              </div>
              <ul className="space-y-2">
                {section.content.map((item, j) => (
                  <li key={j} className="text-sm text-muted-foreground leading-relaxed pl-4 relative before:content-[''] before:absolute before:left-0 before:top-2 before:h-1.5 before:w-1.5 before:rounded-full before:bg-primary/30">
                    {item.split(/(\*\*.*?\*\*)/).map((part, k) =>
                      part.startsWith("**") && part.endsWith("**")
                        ? <strong key={k} className="text-foreground font-medium">{part.slice(2, -2)}</strong>
                        : <span key={k}>{part}</span>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}

        {/* Final note */}
        <div className="text-center space-y-2 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            Dit privacybeleid kan worden bijgewerkt. Wijzigingen worden op deze pagina gepubliceerd.
          </p>
          <p className="text-xs text-muted-foreground">
            © 2026 RobertDev.nl – GOALTJE
          </p>
        </div>
      </main>
    </div>
  );
}