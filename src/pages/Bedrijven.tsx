import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Building2, Users, Smartphone, Shield, Zap, CheckCircle2, ArrowRight, AlertTriangle, Image, Link2, BarChart3, HeadphonesIcon, Lock } from "lucide-react";
import goaltjeLogo from "@/assets/goaltje-logo.png";
import { useSEO } from "@/lib/seo";

const problems = [
  { icon: AlertTriangle, text: "Excel chaos tijdens het WK", color: "text-destructive" },
  { icon: Users, text: "Iedereen gebruikt een andere app", color: "text-warning" },
  { icon: BarChart3, text: "Geen overzicht van deelnemers", color: "text-warning" },
  { icon: Zap, text: "Te ingewikkelde systemen", color: "text-destructive" },
];

const solutionSteps = [
  { num: "1", title: "HR maakt een bedrijfsaccount aan", emoji: "👤" },
  { num: "2", title: "Upload bedrijfslogo en naam", emoji: "🎨" },
  { num: "3", title: "Deel invite link via Teams, Slack of email", emoji: "📨" },
  { num: "4", title: "Medewerkers voorspellen alle 104 WK wedstrijden", emoji: "⚽" },
  { num: "5", title: "Live ranglijst en gezonde competitie op kantoor", emoji: "🏆" },
];

const features = [
  { icon: Image, title: "Eigen bedrijfslogo", desc: "White-label met jullie branding" },
  { icon: BarChart3, title: "Interne ranglijst", desc: "Exclusieve competitie voor het team" },
  { icon: Smartphone, title: "Mobiel toegankelijk", desc: "Werkt op elk apparaat, geen download" },
  { icon: Zap, title: "Geen installatie nodig", desc: "Direct starten via de browser" },
  { icon: Lock, title: "Veilig & betrouwbaar", desc: "GDPR-compliant, data in Europa" },
  { icon: HeadphonesIcon, title: "Snelle support", desc: "Binnen 24 uur reactie" },
];

export default function Bedrijven() {
  useSEO({
    title: "Bedrijfspoule WK 2026 — Goaltje voor Bedrijven & Organisaties",
    description: "Organiseer eenvoudig een professionele WK 2026 bedrijfspoule met eigen branding. Ideaal voor HR, teambuilding en kantoorcompetitie. Gratis starten.",
    canonical: "https://goaltje.nl/bedrijven",
  });

  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD: Service + FAQ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Service",
                "name": "Goaltje Bedrijfspoule",
                "description": "Professionele WK 2026 bedrijfspoule met eigen branding, interne ranglijst en eenvoudig beheer voor HR managers.",
                "provider": { "@type": "Organization", "name": "Goaltje", "url": "https://goaltje.nl" },
                "serviceType": "Team Building / Employee Engagement",
                "areaServed": { "@type": "Country", "name": "Netherlands" },
                "offers": { "@type": "Offer", "price": "0", "priceCurrency": "EUR", "description": "Gratis bedrijfspoule" },
              },
              {
                "@type": "FAQPage",
                "mainEntity": [
                  {
                    "@type": "Question",
                    "name": "Wat kost een bedrijfspoule bij Goaltje?",
                    "acceptedAnswer": { "@type": "Answer", "text": "Een bedrijfspoule bij Goaltje is volledig gratis. Geen verborgen kosten." },
                  },
                  {
                    "@type": "Question",
                    "name": "Kan ik ons bedrijfslogo toevoegen?",
                    "acceptedAnswer": { "@type": "Answer", "text": "Ja, je kunt je bedrijfslogo en naam uploaden voor een white-label ervaring." },
                  },
                  {
                    "@type": "Question",
                    "name": "Hoe delen medewerkers de poule?",
                    "acceptedAnswer": { "@type": "Answer", "text": "Deel de invite link via Microsoft Teams, Slack, e-mail of een QR-code. Geen app download nodig." },
                  },
                ],
              },
            ],
          }),
        }}
      />
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={goaltjeLogo} alt="Goaltje" className="w-8 h-8" />
            <span className="font-display font-bold text-lg">GOALTJE</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-xs font-medium hidden sm:inline-flex">
                ← Terug naar home
              </Button>
            </Link>
            <Link to="/login">
              <Button size="sm" className="h-8 text-xs font-semibold bg-primary text-primary-foreground">
                Inloggen
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-goaltje-navy via-[hsl(220,60%,12%)] to-goaltje-darkblue">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }} />
        <div className="max-w-5xl mx-auto px-4 py-20 md:py-32 text-center relative">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-medium mb-6">
              <Building2 className="h-3.5 w-3.5" /> Voor bedrijven & organisaties
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold mb-5 leading-tight text-white max-w-4xl mx-auto">
              Maak van WK 2026 hét{" "}
              <span className="text-secondary">kantoor evenement</span> ⚽
            </h1>
            <p className="text-lg md:text-xl text-white/60 max-w-xl mx-auto mb-10">
              Organiseer eenvoudig een professionele bedrijfspoule met eigen branding.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href="mailto:info@goaltje.nl?subject=Demo%20bedrijfspoule">
                <Button size="lg" className="bg-secondary text-secondary-foreground h-14 px-10 text-base font-bold shadow-lg hover:bg-secondary/90 transition-all w-full sm:w-auto">
                  Plan gratis demo
                </Button>
              </a>
              <Link to="/login">
                <Button size="lg" variant="outline" className="h-14 px-8 text-base font-semibold border-white/25 text-white bg-white/5 hover:bg-white/10 w-full sm:w-auto">
                  Start bedrijfspoule <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Problems */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-3">Herkenbaar?</h2>
            <p className="text-muted-foreground text-center text-sm max-w-md mx-auto mb-12">
              Elke WK-editie dezelfde problemen op kantoor.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {problems.map((p, i) => (
              <motion.div
                key={p.text}
                initial={{ opacity: 0, x: i % 2 === 0 ? -16 : 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="border-0 shadow-elevation-2 border-l-4 border-l-destructive/30">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                      <p.icon className={`h-5 w-5 ${p.color}`} />
                    </div>
                    <p className="font-display font-semibold text-sm">{p.text}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Steps */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-3">De oplossing: Goaltje</h2>
            <p className="text-muted-foreground text-center text-sm max-w-md mx-auto mb-12">
              In 5 stappen een professionele bedrijfspoule.
            </p>
          </motion.div>
          <div className="space-y-4">
            {solutionSteps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Card className="border-0 shadow-elevation-1">
                  <CardContent className="p-4 md:p-5 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl gradient-navy flex items-center justify-center shrink-0 text-2xl">
                      {step.emoji}
                    </div>
                    <div className="flex items-center gap-3 flex-1">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                        {step.num}
                      </span>
                      <p className="font-display font-semibold text-sm md:text-base">{step.title}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-3">Features voor bedrijven</h2>
            <p className="text-muted-foreground text-center text-sm max-w-md mx-auto mb-12">
              Alles wat HR nodig heeft, zonder gedoe.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Card className="border-0 shadow-elevation-1 h-full hover:shadow-elevation-2 transition-shadow">
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <f.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-sm mb-1">{f.title}</h3>
                      <p className="text-muted-foreground text-xs leading-relaxed">{f.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-goaltje-navy via-goaltje-darkblue to-primary text-white text-center">
        <div className="max-w-2xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-4xl font-display font-bold mb-4">
              Klaar om jullie bedrijfspoule te starten?
            </h2>
            <p className="text-white/60 text-sm md:text-base mb-8">
              Plan een korte demo van 15 minuten of start direct.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href="mailto:info@goaltje.nl?subject=Demo%20bedrijfspoule">
                <Button size="lg" className="bg-secondary text-secondary-foreground h-14 px-10 text-base font-bold shadow-xl hover:bg-secondary/90 transition-all w-full sm:w-auto">
                  Plan gratis demo
                </Button>
              </a>
              <Link to="/login">
                <Button size="lg" variant="outline" className="h-14 px-8 text-base font-semibold border-white/25 text-white bg-white/5 hover:bg-white/10 w-full sm:w-auto">
                  Start bedrijfspoule <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-white/40 text-xs">
              100% gratis · Geen creditcard nodig
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 border-t bg-background">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src={goaltjeLogo} alt="Goaltje" className="w-5 h-5" />
            <span>© 2026 Goaltje · RobertDev.nl</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link to="/login" className="hover:text-foreground transition-colors">Inloggen</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}