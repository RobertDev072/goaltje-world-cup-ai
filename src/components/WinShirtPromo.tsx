import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Promo-banner: doe mee om het officiële Nederlands Elftal shirt 2026 te winnen.
 * Plek: Home (boven matches) en in de matches-lijst (één keer).
 * Klikt door naar Profile waar de referral-link en voortgang staan.
 * Doel: groei via referrals — boodschap wijst expliciet op "haal vrienden binnen".
 */
export function WinShirtPromo({ compact = false }: { compact?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
    >
      <Link to="/app/profile">
        <Card className="border-0 shadow-md overflow-hidden relative">
          <div className="absolute inset-0 gradient-primary opacity-90" />
          <div className="absolute -right-6 -top-6 opacity-15">
            <Trophy className="h-32 w-32 text-white" />
          </div>
          <CardContent className={compact ? "p-3 relative" : "p-4 relative"}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0 text-white">
                <p className="font-display font-bold text-sm leading-tight">
                  Win het officiële Nederlands Elftal shirt 2026! 🎽
                </p>
                <p className="text-[11px] opacity-90 mt-0.5">
                  {compact
                    ? "Nodig 5 vrienden uit → maak kans op het shirt."
                    : "Nodig 5 vrienden uit en wordt het hoogst in de globale poel om het shirt te winnen."}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-white shrink-0" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
