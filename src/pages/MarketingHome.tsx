import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, Zap, Trophy, Users, Building2, CheckCircle2, ArrowRight, Globe, Shield, Menu, X, Newspaper, User } from "lucide-react";
import goaltjeLogo from "@/assets/goaltje-logo.png";
import promoHome from "@/assets/promo-home.png";
import promoPool from "@/assets/promo-pool.png";
import promoShare from "@/assets/promo-share.png";
import { useSEO } from "@/lib/seo";

const steps = [
  { num: "1", title: "Maak een poule aan", desc: "In 30 seconden klaar", emoji: "📋" },
  { num: "2", title: "Deel de link", desc: "Met vrienden of collega's", emoji: "🔗" },
  { num: "3", title: "Voorspel wedstrijden", desc: "Alle 104 WK duels", emoji: "⚽" },
  { num: "4", title: "Bekijk de ranglijst", desc: "Live standen & competitie", emoji: "🏆" },
];

const reasons = [
  { icon: Smartphone, title: "100% mobiel", desc: "Werkt perfect op elke telefoon" },
  { icon: Zap, title: "Geen download nodig", desc: "Direct in je browser, geen app store" },
  { icon: Trophy, title: "Supersnel & eenvoudig", desc: "Intuïtief ontwerp, geen handleiding nodig" },
  { icon: Globe, title: "WK 2026 compleet", desc: "Alle 104 wedstrijden, 48 landen" },
  { icon: Users, title: "Groepen & bedrijven", desc: "Ideaal voor elke groepsgrootte" },
  { icon: Shield, title: "Veilig & betrouwbaar", desc: "Nederlandse hosting, GDPR-proof" },
];

export default function MarketingHome() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useSEO({
    title: "Goaltje — Gratis WK 2026 Voetbalpoule | Start in 2 minuten",
    description: "Regel in 2 minuten jullie WK 2026 poule. 100% gratis, mobiel-vriendelijk en perfect voor vriendengroepen én bedrijven. Voorspel alle 104 wedstrijden!",
    canonical: "https://goaltje.nl",
  });

  const navLinks = [
    { label: "Voor bedrijven", to: "/bedrijven", icon: Building2 },
    { label: "Over ons", to: "/nl#founder", icon: User },
    { label: "Blog & WK Nieuws", to: "/nl#blog", icon: Newspaper },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD: WebApplication + HowTo */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebApplication",
                "name": "Goaltje",
                "url": "https://goaltje.nl",
                "description": "Gratis WK 2026 voetbalpoule-app. Maak poules, voorspel alle 104 wedstrijden en volg live scores.",
                "applicationCategory": "SportsApplication",
                "operatingSystem": "Web",
                "offers": { "@type": "Offer", "price": "0", "priceCurrency": "EUR" },
                "author": { "@type": "Organization", "name": "Goaltje", "url": "https://goaltje.nl" },
              },
              {
                "@type": "HowTo",
                "name": "Hoe start je een WK 2026 poule op Goaltje?",
                "description": "In vier simpele stappen je eigen WK poule starten.",
                "step": [
                  { "@type": "HowToStep", "position": 1, "name": "Maak een poule aan", "text": "Registreer gratis en maak in 30 seconden een nieuwe poule aan." },
                  { "@type": "HowToStep", "position": 2, "name": "Deel de link", "text": "Stuur de uitnodigingslink naar vrienden of collega's via WhatsApp, e-mail of social media." },
                  { "@type": "HowToStep", "position": 3, "name": "Voorspel wedstrijden", "text": "Iedereen voorspelt de uitslagen van alle 104 WK 2026 wedstrijden." },
                  { "@type": "HowToStep", "position": 4, "name": "Bekijk de ranglijst", "text": "Volg live de standen en ontdek wie de beste voorspeller is." },
                ],
              },
              {
                "@type": "FAQPage",
                "mainEntity": [
                  {
                    "@type": "Question",
                    "name": "Is Goaltje gratis?",
                    "acceptedAnswer": { "@type": "Answer", "text": "Ja, Goaltje is 100% gratis. Geen creditcard nodig, geen verborgen kosten." },
                  },
                  {
                    "@type": "Question",
                    "name": "Moet ik een app downloaden?",
                    "acceptedAnswer": { "@type": "Answer", "text": "Nee, Goaltje werkt direct in je browser op elk apparaat. Geen download nodig." },
                  },
                  {
                    "@type": "Question",
                    "name": "Hoeveel wedstrijden kan ik voorspellen?",
                    "acceptedAnswer": { "@type": "Answer", "text": "Je kunt alle 104 WK 2026 wedstrijden voorspellen, van de groepsfase tot de finale." },
                  },
                ],
              },
            ],
          }),
        }}
      />
      {/* Header with navigation */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={goaltjeLogo} alt="Goaltje" className="w-8 h-8" />
            <span className="font-display font-bold text-lg">GOALTJE</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to}>
                <Button variant="ghost" size="sm" className="text-xs font-medium">
                  <link.icon className="h-3.5 w-3.5 mr-1.5" /> {link.label}
                </Button>
              </Link>
            ))}
            <Link to="/login">
              <Button size="sm" className="h-8 text-xs font-semibold bg-primary text-primary-foreground ml-2">
                Inloggen
              </Button>
            </Link>
          </nav>

          {/* Mobile menu toggle */}
          <div className="flex md:hidden items-center gap-2">
            <Link to="/login">
              <Button size="sm" className="h-8 text-xs font-semibold bg-primary text-primary-foreground">
                Inloggen
              </Button>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t bg-background overflow-hidden"
            >
              <div className="px-4 py-3 space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-sm font-medium transition-colors"
                  >
                    <link.icon className="h-4 w-4 text-muted-foreground" />
                    {link.label}
                  </Link>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-goaltje-navy via-goaltje-darkblue to-primary">
        {/* Subtle pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }} />
        <motion.div
          className="absolute bottom-8 text-5xl opacity-10 pointer-events-none select-none"
          animate={{ x: ["-10vw", "110vw"], rotate: [0, 1080] }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        >
          ⚽
        </motion.div>

        <div className="max-w-6xl mx-auto px-4 py-16 md:py-28 relative">
          <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
            {/* Left: Text */}
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold mb-5 leading-tight text-white">
                Regel in 2 minuten jullie{" "}
                <span className="text-secondary">WK 2026</span> poule ⚽
              </h1>
              <p className="text-lg md:text-xl text-white/70 max-w-xl mb-10">
                Gratis, mobiel-vriendelijk en perfect voor vriendengroepen én bedrijven.
              </p>
              <div className="flex flex-col sm:flex-row items-center md:items-start gap-3">
                <Link to="/login">
                  <Button size="lg" className="bg-secondary text-secondary-foreground h-14 px-10 text-base md:text-lg font-bold shadow-lg hover:shadow-xl hover:bg-secondary/90 transition-all w-full sm:w-auto">
                    Start gratis poule <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/bedrijven">
                  <Button size="lg" variant="outline" className="h-14 px-8 text-base font-semibold border-white/25 text-white bg-white/5 hover:bg-white/10 w-full sm:w-auto">
                    <Building2 className="mr-2 h-5 w-5" /> Voor bedrijven
                  </Button>
                </Link>
              </div>
            </motion.div>
            {/* Right: Phone mockup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex-shrink-0 w-64 md:w-80"
            >
              <img
                src={promoHome}
                alt="Goaltje app - WK 2026 voorspellingen"
                className="w-full h-auto rounded-3xl shadow-2xl"
                loading="eager"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-3">Hoe werkt het?</h2>
            <p className="text-muted-foreground text-center text-sm md:text-base max-w-md mx-auto mb-12">
              In vier simpele stappen je eigen WK poule.
            </p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="border-0 shadow-elevation-2 h-full text-center hover:shadow-elevation-3 transition-shadow">
                  <CardContent className="p-5 md:p-6">
                    <div className="text-4xl mb-3">{step.emoji}</div>
                    <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold mb-3">
                      {step.num}
                    </div>
                    <h3 className="font-display font-bold text-sm md:text-base mb-1">{step.title}</h3>
                    <p className="text-muted-foreground text-xs">{step.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Goaltje + Screenshots */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-3">Waarom Goaltje?</h2>
            <p className="text-muted-foreground text-center text-sm md:text-base max-w-lg mx-auto mb-12">
              Alles wat je nodig hebt voor de perfecte WK ervaring.
            </p>
          </motion.div>

          {/* App screenshots showcase */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-14">
            {[
              { src: promoHome, alt: "Goaltje Home - WK 2026 wedstrijden voorspellen", label: "Voorspellingen" },
              { src: promoPool, alt: "Goaltje Poule - Ranglijst en statistieken", label: "Poule & Ranglijst" },
              { src: promoShare, alt: "Goaltje Delen - QR code en social sharing", label: "Delen via QR" },
            ].map((img, i) => (
              <motion.div
                key={img.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  className="w-full max-w-[240px] mx-auto rounded-2xl shadow-elevation-3 mb-3"
                  loading="lazy"
                />
                <p className="text-xs font-display font-semibold text-muted-foreground">{img.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {reasons.map((reason, i) => (
              <motion.div
                key={reason.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Card className="border-0 shadow-elevation-1 h-full hover:shadow-elevation-2 transition-shadow">
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <reason.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-sm mb-1">{reason.title}</h3>
                      <p className="text-muted-foreground text-xs leading-relaxed">{reason.desc}</p>
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
              Start vandaag nog jullie WK poule
            </h2>
            <p className="text-white/60 text-sm md:text-base mb-8">
              100% gratis · Geen creditcard nodig · Klaar in 2 minuten
            </p>
            <Link to="/login">
              <Button size="lg" className="bg-secondary text-secondary-foreground h-14 px-10 text-base md:text-lg font-bold shadow-xl hover:bg-secondary/90 transition-all">
                Start gratis poule <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <p className="mt-6 text-white/40 text-xs">
              Al een account?{" "}
              <Link to="/login" className="text-white/70 underline hover:text-white">
                Inloggen
              </Link>
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
            <Link to="/nl#founder" className="hover:text-foreground transition-colors">Over ons</Link>
            <Link to="/nl#blog" className="hover:text-foreground transition-colors">Blog</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/bedrijven" className="hover:text-foreground transition-colors">Bedrijven</Link>
            <Link to="/login" className="hover:text-foreground transition-colors">Inloggen</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}