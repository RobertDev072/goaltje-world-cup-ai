import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "goaltje_onboarded";

const STEPS = [
  {
    icon: "⚽",
    title: "Welkom bij Goaltje! ⚽",
    description:
      "De gratis WK 2026 voorspelapp. Daag je vrienden uit en bewijs dat jij de beste voetbalanalist bent.",
  },
  {
    icon: "🎯",
    title: "Voorspel wedstrijden 🎯",
    description:
      "Vul voor elk duel de verwachte eindstand in vóór de aftrap. Exacte score = 6 pts, doelverschil = 4 pts, juist resultaat = 3 pts.",
  },
  {
    icon: "🏆",
    title: "Maak of join een poule 🏆",
    description:
      "Maak een privépoule en nodig vrienden uit via link of QR-code. Of join een bestaande poule met een uitnodigingscode.",
  },
  {
    icon: "📊",
    title: "Volg de live ranglijst 📊",
    description:
      "Zie realtime wie stijgt en wie zakt. Badges, stats en een live leaderboard houden de spanning erin.",
  },
];

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  const advance = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  };

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="max-w-sm border border-white/10 bg-[#0a1628] text-white shadow-xl [&>button]:text-white/60 [&>button]:hover:text-white">
        <div className="flex flex-col items-center gap-5 pt-2 pb-1">
          {/* Step content with slide animation */}
          <div className="w-full overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex flex-col items-center gap-3 text-center"
              >
                <span className="text-5xl leading-none">{current.icon}</span>
                <h2 className="text-lg font-bold leading-snug">{current.title}</h2>
                <p className="text-sm text-white/70 leading-relaxed">{current.description}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-2">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`block rounded-full transition-all duration-200 ${
                  i === step
                    ? "h-2 w-5 bg-secondary"
                    : "h-2 w-2 bg-white/25"
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex w-full flex-col gap-2">
            <Button
              onClick={advance}
              className="w-full bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/90"
            >
              {isLast ? "Begin!" : "Volgende"}
            </Button>
            {!isLast && (
              <button
                onClick={dismiss}
                className="text-sm text-white/60 hover:text-white transition-colors py-1"
              >
                Overslaan
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
