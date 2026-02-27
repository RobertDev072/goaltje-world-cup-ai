import { useState, useEffect } from "react";
import { getConsent, setConsent, type ConsentCategories } from "@/lib/consent";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, Shield, Settings2, ChevronDown, ChevronUp, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [functional, setFunctional] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (getConsent() === "pending") setVisible(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleAcceptAll = () => {
    setConsent("granted", { analytics: true, functional: true });
    setVisible(false);
  };

  const handleAcceptSelected = () => {
    setConsent("granted", { analytics, functional });
    setVisible(false);
  };

  const handleDecline = () => {
    setConsent("denied");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px]"
            onClick={() => {}} // Prevent dismissal by clicking backdrop
          />

          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[61] px-4 pb-4 sm:pb-6"
          >
            <div className="max-w-lg mx-auto rounded-2xl shadow-elevation-3 border border-border/50 bg-card p-5 space-y-4">
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Cookie className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-sm">Wij respecteren je privacy 🔒</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Wij gebruiken cookies om de website goed te laten werken en om te begrijpen hoe je de app gebruikt.
                    Je kunt per categorie kiezen welke cookies je toestaat.
                  </p>
                </div>
              </div>

              {/* Cookie categories (expandable) */}
              <div>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  Cookie-instellingen
                  {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>

                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 space-y-3 border border-border/50 rounded-xl p-3">
                        {/* Necessary - always on */}
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <Label className="text-xs font-semibold flex items-center gap-1.5">
                              <Check className="h-3 w-3 text-success" />
                              Noodzakelijk
                            </Label>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Inloggen, sessies, beveiliging. Altijd actief.
                            </p>
                          </div>
                          <Switch checked disabled className="opacity-60" />
                        </div>

                        <div className="border-t border-border/30" />

                        {/* Functional */}
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <Label htmlFor="func-toggle" className="text-xs font-semibold cursor-pointer">
                              Functioneel
                            </Label>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Taalvoorkeur, thema, installatiemelding.
                            </p>
                          </div>
                          <Switch
                            id="func-toggle"
                            checked={functional}
                            onCheckedChange={setFunctional}
                          />
                        </div>

                        <div className="border-t border-border/30" />

                        {/* Analytics */}
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <Label htmlFor="analytics-toggle" className="text-xs font-semibold cursor-pointer">
                              Analytisch
                            </Label>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Anoniem gebruik meten om de app te verbeteren (Vercel Analytics).
                            </p>
                          </div>
                          <Switch
                            id="analytics-toggle"
                            checked={analytics}
                            onCheckedChange={setAnalytics}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl h-10 text-xs"
                  onClick={handleDecline}
                >
                  <Shield className="h-3.5 w-3.5 mr-1.5" />
                  Weigeren
                </Button>
                {showDetails && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-xl h-10 text-xs"
                    onClick={handleAcceptSelected}
                  >
                    <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                    Selectie opslaan
                  </Button>
                )}
                <Button
                  size="sm"
                  className="flex-1 rounded-xl h-10 text-xs gradient-primary text-white border-0"
                  onClick={handleAcceptAll}
                >
                  <Cookie className="h-3.5 w-3.5 mr-1.5" />
                  Alles accepteren
                </Button>
              </div>

              {/* Legal footer */}
              <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed">
                Door op "Alles accepteren" te klikken ga je akkoord met het opslaan van cookies op je apparaat.
                Lees ons{" "}
                <a href="/privacy" className="underline hover:text-primary">privacybeleid</a>
                {" "}voor meer informatie. © 2026 RobertDev.nl – GOALTJE
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}