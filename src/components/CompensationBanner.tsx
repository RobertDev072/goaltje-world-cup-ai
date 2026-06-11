import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Gift, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Eenmalige compensatie-melding na de storing van 11 juni 2026.
 * Iedereen kreeg +10 punten in al hun poules. Banner is dismissbaar
 * (onthouden via localStorage) zodat 'ie maar één keer hoeft te worden
 * weggeklikt. Bump de _KEY als je later een nieuwe melding wilt tonen.
 */
const DISMISS_KEY = "compensation_banner_2026_06_11";

export function CompensationBanner() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === "1",
  );

  if (dismissed) return null;

  const close = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
      >
        <Card className="border-0 shadow-md overflow-hidden relative">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-3 flex items-start gap-3 text-white">
            <div className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
              <Gift className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0 pr-5">
              <p className="font-display font-bold text-sm leading-tight">
                Je hebt +10 punten gekregen! 🎁
              </p>
              <p className="text-[11px] opacity-95 mt-0.5">
                Vanochtend was er een technische storing. Als excuus hebben we
                iedereen <b>+10 punten</b> gegeven in al je poules. Sorry voor het
                ongemak — en veel plezier met het WK! ⚽
              </p>
            </div>
            <button
              onClick={close}
              aria-label="Sluiten"
              className="absolute top-2 right-2 text-white/80 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
