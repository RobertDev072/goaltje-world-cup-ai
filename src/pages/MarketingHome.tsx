import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Globe,
  Menu,
  MessageCircle,
  Newspaper,
  Shield,
  Smartphone,
  Trophy,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";
import goaltjeLogo from "@/assets/goaltje-logo.png";
import promoHome from "@/assets/promo-home.png";
import promoPool from "@/assets/promo-pool.png";
import promoShare from "@/assets/promo-share.png";
import promoLanding from "@/assets/promo-landing.png";
import { useSEO } from "@/lib/seo";

const steps = [
  { num: "1", title: "Maak een poule", desc: "Binnen 30 seconden live", emoji: "📋" },
  { num: "2", title: "Nodig vrienden uit", desc: "Via link, QR of socials", emoji: "🎉" },
  { num: "3", title: "Voorspel alle wedstrijden", desc: "104 WK-duels van begin tot finale", emoji: "⚽" },
  { num: "4", title: "Win de ranglijst", desc: "Live punten, badges en klassement", emoji: "🏆" },
];

const reasons = [
  { icon: Smartphone, title: "Mobiel-first", desc: "Ontworpen als app-ervaring op elke telefoon" },
  { icon: Zap, title: "Supersnel", desc: "Direct starten in browser, zonder download" },
  { icon: Trophy, title: "3D Goaltje stijl", desc: "Speelse visuals met diepte, glow en confetti" },
  { icon: Globe, title: "Klaar voor WK 2026", desc: "Alle landen, alle wedstrijden en live updates" },
  { icon: Users, title: "Voor vrienden en werk", desc: "Perfect voor kleine groepen en grote teams" },
  { icon: Shield, title: "Veilig & betrouwbaar", desc: "Stabiel platform met privacy op orde" },
];

const faq = [
  {
    q: "Is Goaltje gratis?",
    a: "Ja, Goaltje is 100% gratis te gebruiken voor je WK 2026 poules.",
  },
  {
    q: "Moet ik iets installeren?",
    a: "Nee. Je opent Goaltje direct in je browser, en je kunt het daarna als PWA toevoegen.",
  },
  {
    q: "Kan ik makkelijk delen via WhatsApp en socials?",
    a: "Ja, je kunt uitnodigen met een link, QR-code en social share-knoppen.",
  },
];

export default function MarketingHome() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useSEO({
    title: "Goaltje — #1 WK 2026 Voorspellings-app",
    description:
      "Maak gratis WK 2026 poules, voorspel alle 104 wedstrijden en deel direct met je vrienden. Mobiel, snel en in unieke Goaltje 3D stijl.",
    canonical: "https://goaltje.nl",
    ogImage: "https://goaltje.nl/og-image.png",
  });

  const navLinks = [
    { label: "Features", to: "#features", icon: Trophy },
    { label: "Screens", to: "#screens", icon: Smartphone },
    { label: "FAQ", to: "#faq", icon: MessageCircle },
    { label: "Voor bedrijven", to: "/bedrijven", icon: Building2 },
    { label: "Blog", to: "/templates", icon: Newspaper },
    { label: "Over ons", to: "/privacy", icon: User },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={goaltjeLogo} alt="Goaltje" className="w-8 h-8" />
            <span className="font-display font-bold text-lg">GOALTJE</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              link.to.startsWith("#") ? (
                <a key={link.to} href={link.to} className="inline-flex">
                  <Button variant="ghost" size="sm" className="text-xs font-medium">
                    <link.icon className="h-3.5 w-3.5 mr-1.5" /> {link.label}
                  </Button>
                </a>
              ) : (
                <Link key={link.to} to={link.to}>
                  <Button variant="ghost" size="sm" className="text-xs font-medium">
                    <link.icon className="h-3.5 w-3.5 mr-1.5" /> {link.label}
                  </Button>
                </Link>
              )
            ))}
            <Link to="/login">
              <Button size="sm" className="h-8 text-xs font-semibold bg-primary text-primary-foreground ml-2">
                Inloggen
              </Button>
            </Link>
          </nav>

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

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t bg-background overflow-hidden"
            >
              <div className="px-4 py-3 space-y-1">
                {navLinks.map((link) =>
                  link.to.startsWith("#") ? (
                    <a
                      key={link.to}
                      href={link.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-sm font-medium transition-colors"
                    >
                      <link.icon className="h-4 w-4 text-muted-foreground" />
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-sm font-medium transition-colors"
                    >
                      <link.icon className="h-4 w-4 text-muted-foreground" />
                      {link.label}
                    </Link>
                  )
                )}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-goaltje-navy via-goaltje-darkblue to-primary">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,#ffffff40,transparent_45%)]" />
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_bottom,#ffda1f40,transparent_40%)]" />

        <motion.div
          className="absolute bottom-10 text-5xl opacity-20 pointer-events-none select-none"
          animate={{ x: ["-10vw", "110vw"], rotate: [0, 1080] }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        >
          ⚽
        </motion.div>

        <div className="max-w-6xl mx-auto px-4 py-16 md:py-28 relative">
          <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold mb-5 leading-tight text-white">
                De <span className="text-secondary">#1 WK 2026</span><br />
                voorspellings-app
              </h1>
              <p className="text-lg md:text-xl text-white/80 max-w-xl mb-10">
                Goaltje met nieuwe 3D look: confetti vibes, snelle poules en sharing die overal strak eruit ziet.
              </p>
              <div className="flex flex-col sm:flex-row items-center md:items-start gap-3">
                <Link to="/login">
                  <Button size="lg" className="bg-secondary text-secondary-foreground h-14 px-10 text-base md:text-lg font-bold shadow-lg hover:shadow-xl hover:bg-secondary/90 transition-all w-full sm:w-auto">
                    🏆 Start jouw poule <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <a href="#screens" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="h-14 px-8 text-base font-semibold border-white/25 text-white bg-white/5 hover:bg-white/10 w-full sm:w-auto">
                    Bekijk preview
                  </Button>
                </a>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotateY: -8 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex-shrink-0 w-64 md:w-80 [transform-style:preserve-3d]"
            >
              <img
                src={promoLanding}
                alt="Goaltje landing preview"
                className="w-full h-auto rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.45)] ring-1 ring-white/20"
                loading="eager"
              />
            </motion.div>
          </div>
        </div>
      </section>

      <section id="features" className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-3">Hoe werkt het?</h2>
            <p className="text-muted-foreground text-center text-sm md:text-base max-w-md mx-auto mb-12">
              Binnen enkele minuten live met je eigen WK poule.
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

      <section id="screens" className="py-16 md:py-24 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-3">Nieuwe 3D ervaring</h2>
            <p className="text-muted-foreground text-center text-sm md:text-base max-w-lg mx-auto mb-12">
              Landing, delen en app-flow in één herkenbare Goaltje-stijl.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-14">
            {[
              { src: promoHome, alt: "Goaltje Home scherm", label: "Voorspellingen" },
              { src: promoPool, alt: "Goaltje Pool scherm", label: "Pool & ranglijst" },
              { src: promoShare, alt: "Goaltje Share scherm", label: "Delen via QR & socials" },
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
                  className="w-full max-w-[240px] mx-auto rounded-2xl shadow-[0_18px_45px_rgba(0,0,0,0.25)] mb-3"
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

      <section id="faq" className="py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-8">Veelgestelde vragen</h2>
          <div className="space-y-4">
            {faq.map((item) => (
              <Card key={item.q} className="border-0 shadow-elevation-1">
                <CardContent className="p-5">
                  <p className="font-semibold mb-1">{item.q}</p>
                  <p className="text-sm text-muted-foreground">{item.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-gradient-to-br from-goaltje-navy via-goaltje-darkblue to-primary text-white text-center">
        <div className="max-w-2xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-4xl font-display font-bold mb-4">Start vandaag nog jullie WK poule</h2>
            <p className="text-white/60 text-sm md:text-base mb-8">100% gratis · Geen creditcard nodig · Klaar in 2 minuten</p>
            <Link to="/login">
              <Button size="lg" className="bg-secondary text-secondary-foreground h-14 px-10 text-base md:text-lg font-bold shadow-xl hover:bg-secondary/90 transition-all">
                Start gratis poule <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <div className="mt-5 flex items-center justify-center gap-5 text-xs text-white/70">
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />Veilig & privé</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />4 talen</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />Live scores</span>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="py-6 border-t bg-background">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src={goaltjeLogo} alt="Goaltje" className="w-5 h-5" />
            <span>© 2026 Goaltje</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#screens" className="hover:text-foreground transition-colors">Screens</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/login" className="hover:text-foreground transition-colors">Inloggen</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
