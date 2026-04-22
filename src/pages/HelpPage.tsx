import { useState } from "react";
import { motion } from "framer-motion";
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Trophy,
  Clock,
  Users,
  Share2,
  Star,
  MessageCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ScoringExamples } from "@/components/ScoringExamples";
import { useSEO } from "@/lib/seo";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const steps = [
  {
    number: 1,
    icon: Star,
    title: "Maak een account aan of log in",
    description: "Registreer gratis of log in met je bestaande account om te beginnen.",
  },
  {
    number: 2,
    icon: Users,
    title: "Maak of join een poule via een invite link",
    description: "Maak je eigen poule aan of gebruik een invite link van een vriend of collega.",
  },
  {
    number: 3,
    icon: Clock,
    title: "Voorspel de uitslag van elke wedstrijd vóór de deadline",
    description: "Geef voor iedere wedstrijd jouw voorspelling in. Dit kan tot de aftrap.",
  },
  {
    number: 4,
    icon: Trophy,
    title: "Volg de live ranglijst en kijk wie de beste voorspeller is",
    description: "Punten worden automatisch bijgewerkt. Bekijk de ranglijst en daag vrienden uit.",
  },
];

const faqs = [
  {
    question: "Wanneer sluit de voorspeldeadline?",
    answer: "Je kunt voorspellen tot de aftrap van de wedstrijd. Na de aftrap is voorspellen geblokkeerd.",
  },
  {
    question: "Kan ik mijn voorspelling nog wijzigen?",
    answer: "Ja, zolang de deadline nog niet verstreken is.",
  },
  {
    question: "Hoe maak ik een poule aan?",
    answer: "Ga naar 'Pool' in de navigatie, klik op 'Nieuwe poule' en deel de invite link.",
  },
  {
    question: "Hoe join ik een poule?",
    answer: "Gebruik de invite link of code die de pool admin met je deelt.",
  },
  {
    question: "Wat zijn bonusvragen?",
    answer: "Bonusvragen zijn extra voorspellingen (bijv. 'Wie wordt topscorer?') die extra punten opleveren.",
  },
  {
    question: "Hoe werkt de ranglijst tiebreaker?",
    answer: "Bij gelijk puntenaantal wint degene met de meeste exacte scores. Daarna telt het doelsaldo.",
  },
  {
    question: "Kan ik meerdere poules hebben?",
    answer: "Ja! Je kunt onbeperkt poules aanmaken of joinen. Wissel tussen poules via de Pool-pagina.",
  },
  {
    question: "Hoe deel ik mijn poule?",
    answer: "In de poule-pagina vind je een deel-knop met QR-code, WhatsApp en directe link.",
  },
];

export default function HelpPage() {
  useSEO({
    title: "Help — Goaltje",
    description:
      "Uitleg over hoe Goaltje werkt: puntensysteem, poules, voorspellingen en meer.",
  });

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq((prev) => (prev === index ? null : index));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Hero header */}
          <motion.div variants={itemVariants} className="text-center space-y-2">
            <div className="flex items-center justify-center gap-3 mb-2">
              <HelpCircle className="h-8 w-8 text-secondary" />
              <h1 className="text-3xl font-bold text-foreground">Help &amp; Uitleg</h1>
            </div>
            <p className="text-muted-foreground text-base">
              Alles wat je nodig hebt om te beginnen
            </p>
          </motion.div>

          {/* How it works */}
          <motion.section variants={itemVariants} className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Hoe werkt Goaltje?</h2>
            <div className="grid gap-3">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <Card
                    key={step.number}
                    className="bg-card/60 border-border/50 backdrop-blur-sm"
                  >
                    <CardContent className="flex items-start gap-4 p-4">
                      <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-secondary/20 text-secondary font-bold text-sm">
                        {step.number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="h-4 w-4 text-secondary flex-shrink-0" />
                          <p className="font-semibold text-foreground text-sm">{step.title}</p>
                        </div>
                        <p className="text-muted-foreground text-sm">{step.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </motion.section>

          {/* Scoring system met concrete voorbeelden */}
          <motion.section variants={itemVariants} className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Puntensysteem</h2>
            <ScoringExamples />
          </motion.section>

          {/* FAQ */}
          <motion.section variants={itemVariants} className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Veelgestelde vragen</h2>
            <div className="space-y-2">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <Card
                    key={index}
                    className="bg-card/60 border-border/50 backdrop-blur-sm overflow-hidden"
                  >
                    <button
                      onClick={() => toggleFaq(index)}
                      className="w-full flex items-center justify-between px-4 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-inset"
                      aria-expanded={isOpen}
                    >
                      <span className="font-medium text-sm text-foreground pr-2">
                        {faq.question}
                      </span>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-secondary flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </button>
                    <motion.div
                      initial={false}
                      animate={isOpen ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 text-sm text-muted-foreground border-t border-border/30 pt-3">
                        {faq.answer}
                      </div>
                    </motion.div>
                  </Card>
                );
              })}
            </div>
          </motion.section>

          {/* CTA */}
          <motion.section variants={itemVariants}>
            <Card className="bg-card/60 border-border/50 backdrop-blur-sm">
              <CardContent className="flex flex-col items-center text-center gap-3 p-6">
                <MessageCircle className="h-8 w-8 text-secondary" />
                <div>
                  <p className="font-semibold text-foreground">Nog vragen?</p>
                  <p className="text-sm text-muted-foreground mt-1">Kom je er niet uit?</p>
                </div>
                <a
                  href="mailto:info@goaltje.nl"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/90 transition-colors"
                >
                  <Share2 className="h-4 w-4" />
                  info@goaltje.nl
                </a>
              </CardContent>
            </Card>
          </motion.section>
        </motion.div>
      </div>
    </div>
  );
}
