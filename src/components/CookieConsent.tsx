import { useState, useEffect } from "react";
import { getConsent, setConsent } from "@/lib/consent";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, Shield } from "lucide-react";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Small delay so it doesn't flash on load
    const timer = setTimeout(() => {
      if (getConsent() === "pending") setVisible(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleAccept = () => {
    setConsent("granted");
    setVisible(false);
  };

  const handleDecline = () => {
    setConsent("denied");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-20 left-0 right-0 z-50 px-4 pb-2"
        >
          <div className="max-w-lg mx-auto rounded-2xl shadow-elevation-3 border border-border/50 bg-card p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Cookie className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-sm">Cookies & Advertenties</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Wij gebruiken cookies voor advertenties (Google AdSense). 
                  Door te accepteren help je Goaltje gratis te houden. 
                  Je kunt dit later wijzigen in je profiel.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 rounded-xl h-9 text-xs"
                onClick={handleDecline}
              >
                <Shield className="h-3.5 w-3.5 mr-1.5" />
                Weigeren
              </Button>
              <Button
                size="sm"
                className="flex-1 rounded-xl h-9 text-xs gradient-primary text-white border-0"
                onClick={handleAccept}
              >
                <Cookie className="h-3.5 w-3.5 mr-1.5" />
                Accepteren
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground/60 text-center">
              Meer info in ons{" "}
              <a href="/privacy" className="underline hover:text-primary">privacybeleid</a>
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
