import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, Menu, Newspaper, ShieldCheck, Sparkles, Timer, Trophy, Users, X } from "lucide-react";
import goaltjeLogo from "@/assets/goaltje-logo.png";
import promoHome from "@/assets/promo-home.png";
import promoPool from "@/assets/promo-pool.png";
import promoShare from "@/assets/promo-share.png";
import { useSEO } from "@/lib/seo";

const storyBeats = [
  {
    title: "Maak een poule",
    body: "Start in seconden, kies je regels en maak jouw privé WK 2026 competitie.",
    metric: "100% gratis",
  },
  {
    title: "Voorspel alle wedstrijden",
    body: "Van openingsduel tot finale: voorspel alle 104 wedstrijden met slimme, snelle invoer.",
    metric: "104 matches",
  },
  {
    title: "Volg live scores & ranglijst",
    body: "Zie direct wie stijgt, wie zakt en wie jouw pool domineert tijdens het toernooi.",
    metric: "Live updates",
  },
  {
    title: "Daag vrienden uit en win",
    body: "Deel met link of QR en maak van elke poule een sociale battle om de #1 plek.",
    metric: "Social invite",
  },
];

const featureStack = [
  { title: "Private pools", body: "Alleen jouw vrienden of collega’s in één besloten poule.", image: promoPool },
  { title: "Live leaderboard", body: "Realtime klassement met punten, badges en spanning.", image: promoHome },
  { title: "Invite flow", body: "Nodig direct uit met QR, WhatsApp en deelbare links.", image: promoShare },
];

export default function MarketingHome() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeBeat, setActiveBeat] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const storyRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();

  useSEO({
    title: "Goaltje — Premium WK 2026 Voetbalpoule",
    description: "Maak gratis poules, voorspel alle 104 WK-wedstrijden en strijd live met je vrienden om de eerste plek.",
    canonical: "https://goaltje.nl",
  });

  const navLinks = useMemo(
    () => [
      { label: "Hoe het werkt", to: "#story" },
      { label: "Features", to: "#features" },
      { label: "Voor bedrijven", to: "/bedrijven" },
      { label: "Blog", to: "/blog/wk-2026-speelschema" },
    ],
    []
  );

  const { scrollYProgress: pageProgress } = useScroll({
    target: rootRef,
    offset: ["start start", "end end"],
  });
  const orbY = useTransform(pageProgress, [0, 1], reduceMotion ? [0, 0] : [0, -120]);

  const { scrollYProgress: storyProgress } = useScroll({
    target: storyRef,
    offset: ["start end", "end start"],
  });

  useMotionValueEvent(storyProgress, "change", (value) => {
    const next = Math.min(storyBeats.length - 1, Math.max(0, Math.round(value * (storyBeats.length - 1))));
    setActiveBeat(next);
  });

  return (
    <div ref={rootRef} className="relative min-h-screen overflow-x-clip bg-[hsl(var(--lp-bg))] text-white">
      <motion.div style={{ y: orbY }} className="pointer-events-none absolute -top-40 -left-20 h-96 w-96 rounded-full bg-primary/25 blur-[120px]" />
      <motion.div style={{ y: useTransform(orbY, (v) => -v * 0.6) }} className="pointer-events-none absolute top-[25%] -right-40 h-[26rem] w-[26rem] rounded-full bg-secondary/15 blur-[120px]" />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[hsl(var(--lp-surface-dark))/0.76] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={goaltjeLogo} alt="Goaltje" className="h-9 w-9" />
            <span className="font-display text-lg font-bold tracking-wide">GOALTJE</span>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {navLinks.map((link) =>
              link.to.startsWith("#") ? (
                <a key={link.to} href={link.to} className="rounded-xl px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white">
                  {link.label}
                </a>
              ) : (
                <Link key={link.to} to={link.to} className="rounded-xl px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white">
                  {link.label}
                </Link>
              )
            )}
            <Link to="/login">
              <Button className="ml-2 bg-secondary text-secondary-foreground hover:-translate-y-0.5 hover:bg-secondary/90">Inloggen</Button>
            </Link>
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <Link to="/login">
              <Button size="sm" className="bg-secondary text-secondary-foreground">Inloggen</Button>
            </Link>
            <button onClick={() => setMobileMenuOpen((v) => !v)} className="rounded-lg p-2 hover:bg-white/10" aria-label="Open menu">
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-white/10 px-4 py-3 md:hidden">
            <div className="space-y-1">
              {navLinks.map((link) =>
                link.to.startsWith("#") ? (
                  <a key={link.to} href={link.to} onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white">
                    {link.label}
                  </a>
                ) : (
                  <Link key={link.to} to={link.to} onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white">
                    {link.label}
                  </Link>
                )
              )}
            </div>
          </div>
        )}
      </header>

      <section className="relative mx-auto grid min-h-[92vh] w-full max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:py-24">
        <div>
          <motion.p initial={reduceMotion ? false : { y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/90">
            WK 2026 voetbalpoules
          </motion.p>
          <h1 className="text-balance font-display text-4xl font-bold leading-[1.03] md:text-6xl">
            {["Bouw jouw poule.", "Voorspel 104 matches.", "Win van je vrienden."].map((line, i) => (
              <motion.span
                key={line}
                initial={reduceMotion ? false : { y: 42, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: reduceMotion ? 0 : 0.1 + i * 0.14, duration: 0.6 }}
                className={`block ${i === 2 ? "text-secondary" : ""}`}
              >
                {line}
              </motion.span>
            ))}
          </h1>
          <motion.p initial={reduceMotion ? false : { y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="mt-6 max-w-xl text-lg text-white/75">
            Goaltje combineert live scores, ranglijsten en social competitie in één premium WK-ervaring.
          </motion.p>
          <motion.div initial={reduceMotion ? false : { y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/login">
              <Button size="lg" className="group h-12 rounded-xl bg-secondary px-8 text-base font-bold text-secondary-foreground hover:-translate-y-0.5 hover:bg-secondary/90">
                Maak gratis poule
                <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
              </Button>
            </Link>
            <a href="#story">
              <Button size="lg" variant="outline" className="h-12 rounded-xl border-white/30 bg-white/5 px-7 text-base text-white hover:bg-white/15">
                Bekijk hoe het werkt
              </Button>
            </a>
          </motion.div>
        </div>

        <div className="relative mx-auto w-full max-w-md md:max-w-lg">
          <div className="rounded-[2rem] border border-white/15 bg-[hsl(var(--lp-surface-dark))/0.9] p-3 shadow-[var(--lp-shadow-soft)]">
            <img src={promoHome} alt="Goaltje app scherm met voorspellingen" className="h-auto w-full rounded-[1.5rem]" loading="eager" />
          </div>
          {[
            { text: "LIVE Scores", cls: "-left-3 top-6", tint: "text-secondary" },
            { text: "#1 Ranglijst", cls: "-right-4 top-16", tint: "text-primary" },
            { text: "Nodig vrienden uit", cls: "-left-5 bottom-24", tint: "" },
            { text: "Nog 58 dagen", cls: "-right-5 bottom-8", tint: "text-secondary" },
          ].map((chip, i) => (
            <motion.div
              key={chip.text}
              animate={reduceMotion ? undefined : { y: [0, -10, 0], x: [0, i % 2 ? -4 : 4, 0] }}
              transition={{ duration: 3 + i, repeat: Infinity, ease: "easeInOut" }}
              whileHover={{ scale: 1.05 }}
              className={`absolute ${chip.cls} rounded-xl border border-white/15 bg-[hsl(var(--lp-surface))/0.95] px-3 py-2 text-xs font-semibold ${chip.tint}`}
            >
              {chip.text}
            </motion.div>
          ))}
        </div>
      </section>

      <section id="story" ref={storyRef} className="relative border-y border-white/10 bg-[hsl(var(--lp-surface-dark))/0.55] py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-2 lg:items-start">
          <div className="lg:sticky lg:top-24 lg:h-[70vh]">
            <div className="mb-6 h-1 rounded-full bg-white/10">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-primary via-secondary to-primary" style={{ scaleX: useTransform(storyProgress, [0, 1], [0.25, 1]), transformOrigin: "left" }} transition={{ ease: "easeOut", duration: 0.3 }} />
            </div>
            <div className="space-y-4">
              {storyBeats.map((beat, i) => (
                <motion.article
                  key={beat.title}
                  animate={{ opacity: activeBeat === i ? 1 : 0.35, y: activeBeat === i ? 0 : 10 }}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
                >
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-secondary">{beat.metric}</p>
                  <h2 className="font-display text-2xl font-bold">{beat.title}</h2>
                  <p className="mt-3 text-white/75">{beat.body}</p>
                </motion.article>
              ))}
            </div>
          </div>

          <div className="relative min-h-[360px] lg:min-h-[70vh]">
            <div className="lg:sticky lg:top-24">
              <div className="relative min-h-[420px] rounded-3xl border border-white/10 bg-[hsl(var(--lp-surface))/0.6] p-5 backdrop-blur-xl">
                {storyBeats.map((beat, i) => (
                  <motion.div
                    key={beat.title}
                    animate={{ opacity: activeBeat === i ? 1 : 0, y: activeBeat === i ? 0 : 20, scale: activeBeat === i ? 1 : 0.96 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-5 rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-6"
                  >
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs">Stap {i + 1}</div>
                    <h3 className="font-display text-2xl font-bold">{beat.title}</h3>
                    <p className="mt-2 text-sm text-white/70">{beat.body}</p>
                    <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl border border-white/15 bg-white/5 p-3">🏆 Competitief</div>
                      <div className="rounded-xl border border-white/15 bg-white/5 p-3">⚽ WK 2026</div>
                      <div className="rounded-xl border border-white/15 bg-white/5 p-3">📈 Live ranking</div>
                      <div className="rounded-xl border border-white/15 bg-white/5 p-3">🤝 Social invite</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-6xl px-4 py-20">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-white/60">App showcase</p>
            <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">Premium feature stack</h2>
          </div>
          <Sparkles className="h-5 w-5 text-secondary" />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {featureStack.map((item, i) => (
            <motion.article
              key={item.title}
              initial={reduceMotion ? false : { y: 50, opacity: 0, scale: 0.96 }}
              whileInView={{ y: 0, opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.65, delay: i * 0.08 }}
              whileHover={{ scale: 1.02 }}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[hsl(var(--lp-surface-dark))/0.7] p-4 shadow-[var(--lp-shadow-soft)] transition-transform duration-300 hover:-translate-y-1"
              style={{ transform: `rotate(${i === 1 ? "-1.2deg" : i === 2 ? "1.4deg" : "0deg"})` }}
            >
              <img src={item.image} alt={item.title} className="h-72 w-full rounded-2xl object-cover" loading="lazy" />
              <div className="mt-4">
                <h3 className="font-display text-xl font-bold">{item.title}</h3>
                <p className="mt-2 text-sm text-white/70">{item.body}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-[hsl(var(--lp-surface-dark))/0.55]">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-3 px-4 py-10 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center text-sm"><ShieldCheck className="mx-auto mb-2 h-4 w-4 text-secondary" />Gratis starten</div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center text-sm"><Trophy className="mx-auto mb-2 h-4 w-4 text-primary" />104 wedstrijden</div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center text-sm"><Timer className="mx-auto mb-2 h-4 w-4 text-secondary" />Live updates</div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center text-sm"><Users className="mx-auto mb-2 h-4 w-4 text-primary" />Samen spelen</div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 py-20 text-center">
        <div className="rounded-3xl border border-white/15 bg-gradient-to-br from-primary/25 via-[hsl(var(--lp-surface-dark))/0.9] to-secondary/15 px-6 py-12 shadow-[var(--lp-shadow-soft)]">
          <p className="text-xs uppercase tracking-[0.18em] text-white/70">Klaar om te starten?</p>
          <h2 className="mt-4 font-display text-3xl font-bold md:text-5xl">Bouw nu jouw WK 2026 poule</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/75">Maak een gratis pool, nodig je vrienden uit en strijd om de eerste plek met live scores en realtime ranglijst.</p>
          <Link to="/login" className="mt-8 inline-block">
            <Button size="lg" className="group h-12 rounded-xl bg-secondary px-8 text-base font-bold text-secondary-foreground hover:-translate-y-0.5 hover:bg-secondary/90">
              Maak gratis poule
              <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-sm text-white/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 sm:flex-row">
          <p>© 2026 Goaltje</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-white">Privacy</Link>
            <Link to="/bedrijven" className="hover:text-white">Bedrijven</Link>
            <Link to="/login" className="hover:text-white">Inloggen</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
