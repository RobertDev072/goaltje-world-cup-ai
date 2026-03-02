import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Smartphone, Zap, Trophy, Users, Building2, CheckCircle2, ArrowRight, Globe, Shield } from "lucide-react";
import goaltjeLogo from "@/assets/goaltje-logo.png";

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
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={goaltjeLogo} alt="Goaltje" className="w-8 h-8" />
            <span className="font-display font-bold text-lg">GOALTJE</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/bedrijven">
              <Button variant="ghost" size="sm" className="text-xs font-medium hidden sm:inline-flex">
                <Building2 className="h-3.5 w-3.5 mr-1" /> Voor bedrijven
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

        <div className="max-w-5xl mx-auto px-4 py-20 md:py-32 text-center relative">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <img src={goaltjeLogo} alt="Goaltje" className="w-20 h-20 md:w-28 md:h-28 mx-auto mb-6" loading="eager" />
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold mb-5 leading-tight text-white max-w-3xl mx-auto">
              Regel in 2 minuten jullie{" "}
              <span className="text-secondary">WK 2026</span> poule ⚽
            </h1>
            <p className="text-lg md:text-xl text-white/70 max-w-xl mx-auto mb-10">
              Gratis, mobiel-vriendelijk en perfect voor vriendengroepen én bedrijven.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
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

      {/* Why Goaltje */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-3">Waarom Goaltje?</h2>
            <p className="text-muted-foreground text-center text-sm md:text-base max-w-lg mx-auto mb-12">
              Alles wat je nodig hebt voor de perfecte WK ervaring.
            </p>
          </motion.div>
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
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/bedrijven" className="hover:text-foreground transition-colors">Bedrijven</Link>
            <Link to="/login" className="hover:text-foreground transition-colors">Inloggen</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}