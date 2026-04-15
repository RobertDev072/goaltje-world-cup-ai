import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import {
  Building2, Users, Smartphone, Shield, Zap, CheckCircle2,
  ArrowRight, AlertTriangle, Image, Link2, BarChart3, HeadphonesIcon,
  Lock, Loader2, Menu, X,
} from "lucide-react";
import goaltjeLogo from "@/assets/goaltje-logo.png";
import promoPool2 from "@/assets/promo-pool2.png";
import promoLanding from "@/assets/promo-landing.png";
import { useSEO } from "@/lib/seo";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { SocialShareSheet } from "@/components/SocialShareSheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const problems = [
  { icon: AlertTriangle, text: "Excel chaos tijdens het WK", color: "text-destructive" },
  { icon: Users, text: "Iedereen gebruikt een andere app", color: "text-warning" },
  { icon: BarChart3, text: "Geen overzicht van deelnemers", color: "text-warning" },
  { icon: Zap, text: "Te ingewikkelde systemen", color: "text-destructive" },
];

const solutionSteps = [
  { num: "1", title: "HR maakt een bedrijfsaccount aan", emoji: "👤" },
  { num: "2", title: "Upload bedrijfslogo en naam", emoji: "🎨" },
  { num: "3", title: "Deel invite link via Teams, Slack of email", emoji: "📨" },
  { num: "4", title: "Medewerkers voorspellen alle 104 WK wedstrijden", emoji: "⚽" },
  { num: "5", title: "Live ranglijst en gezonde competitie op kantoor", emoji: "🏆" },
];

const features = [
  { icon: Image, title: "Eigen bedrijfslogo", desc: "White-label met jullie branding" },
  { icon: BarChart3, title: "Interne ranglijst", desc: "Exclusieve competitie voor het team" },
  { icon: Smartphone, title: "Mobiel toegankelijk", desc: "Werkt op elk apparaat, geen download" },
  { icon: Zap, title: "Geen installatie nodig", desc: "Direct starten via de browser" },
  { icon: Lock, title: "Veilig & betrouwbaar", desc: "GDPR-compliant, data in Europa" },
  { icon: HeadphonesIcon, title: "Snelle support", desc: "Binnen 24 uur reactie" },
];

function CompanyOnboardingForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdPool, setCreatedPool] = useState<{ name: string; invite_code: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Log eerst in", description: "Je moet ingelogd zijn om een bedrijfspoule aan te maken.", variant: "destructive" });
      navigate("/login");
      return;
    }

    if (!companyName.trim() || !contactName.trim() || !contactEmail.trim()) {
      toast({ title: "Vul alle velden in", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .insert({ name: companyName.trim(), created_by: user.id })
        .select()
        .single();
      if (tenantError) throw tenantError;

      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const path = `tenant-logos/${tenant.id}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("public")
          .upload(path, logoFile, { upsert: true });
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from("public").getPublicUrl(path);
          await supabase.from("tenants").update({ logo_url: publicUrl }).eq("id", tenant.id);
        }
      }

      const { data: pool, error: poolError } = await supabase
        .from("pools")
        .insert({
          name: `${companyName.trim()} WK 2026`,
          created_by: user.id,
          tenant_id: tenant.id,
          description: `Bedrijfspoule van ${companyName.trim()} — ${employeeCount || "?"} medewerkers`,
          privacy: "private",
        })
        .select()
        .single();
      if (poolError) throw poolError;

      await supabase.from("pool_members").insert({
        pool_id: pool.id,
        user_id: user.id,
        role: "admin",
      });

      setCreatedPool({ name: pool.name, invite_code: pool.invite_code });
      toast({ title: "Bedrijfspoule aangemaakt! 🎉", description: "Deel de uitnodiging met je collega's." });
    } catch (err: any) {
      toast({ title: "Fout bij aanmaken", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const appOrigin = import.meta.env.PROD ? "https://goaltje.nl" : window.location.origin;
  const poolLink = createdPool ? `${appOrigin}/join/${createdPool.invite_code}` : "";

  const inputClass = "h-11 border-white/20 bg-white/[0.08] text-white placeholder:text-white/35 focus-visible:border-secondary focus-visible:ring-secondary/30";
  const labelClass = "text-xs font-semibold text-white/80";

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-[hsl(var(--lp-surface-dark))/0.85] p-6 shadow-[var(--lp-shadow-soft)] backdrop-blur-xl">
          <div className="mb-4 text-center">
            <h3 className="font-display text-lg font-bold text-white">Start bedrijfspoule</h3>
            <p className="text-xs text-white/60">In 2 minuten klaar</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="companyName" className={labelClass}>Bedrijfsnaam *</Label>
              <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Bijv. Acme B.V." required maxLength={100} className={inputClass} />
            </div>
            <div>
              <Label htmlFor="contactName" className={labelClass}>Contactpersoon *</Label>
              <Input id="contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Jouw naam" required maxLength={100} className={inputClass} />
            </div>
            <div>
              <Label htmlFor="contactEmail" className={labelClass}>E-mailadres *</Label>
              <Input id="contactEmail" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="hr@bedrijf.nl" required maxLength={255} className={inputClass} />
            </div>
            <div>
              <Label htmlFor="employeeCount" className={labelClass}>Aantal medewerkers (optioneel)</Label>
              <Input id="employeeCount" type="number" min={1} max={10000} value={employeeCount} onChange={(e) => setEmployeeCount(e.target.value)} placeholder="Bijv. 100" className={inputClass} />
            </div>
            <div>
              <Label htmlFor="logoFile" className={labelClass}>Bedrijfslogo (optioneel)</Label>
              <input
                id="logoFile"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-xl border border-white/20 bg-white/[0.08] px-3 py-2 text-sm text-white/80 file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-xs file:font-semibold file:text-secondary-foreground cursor-pointer"
              />
              <p className="mt-1 text-xs text-white/40">PNG, JPG of SVG. Max 2MB.</p>
            </div>
            <Button type="submit" className="h-12 w-full bg-secondary text-base font-bold text-secondary-foreground hover:-translate-y-0.5 hover:bg-secondary/90 transition-all" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Aanmaken...</> : "🏆 Maak bedrijfspoule aan"}
            </Button>
          </form>
          {!user && (
            <p className="mt-3 text-center text-xs text-white/50">
              Je moet <Link to="/login" className="font-semibold text-secondary hover:underline">ingelogd</Link> zijn om een poule aan te maken.
            </p>
          )}
        </div>
      </motion.div>

      <Dialog open={!!createdPool} onOpenChange={() => setCreatedPool(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center font-display">
              <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-primary" />
              Bedrijfspoule aangemaakt! 🎉
            </DialogTitle>
          </DialogHeader>
          {createdPool && (
            <div className="space-y-4 pt-2">
              <div className="text-center">
                <p className="mb-2 text-sm text-muted-foreground">Deel deze link met je collega's:</p>
                <div className="rounded-xl bg-muted p-3 text-center font-mono text-sm font-bold tracking-wider">
                  {createdPool.invite_code}
                </div>
              </div>
              <SocialShareSheet
                poolName={createdPool.name}
                inviteCode={createdPool.invite_code}
                poolLink={poolLink}
                shareText={`🏆 Doe mee met "${createdPool.name}" op Goaltje!\n\n⚽ Voorspel alle 104 WK 2026 wedstrijden\n📊 Live ranglijst\n🎯 Gratis meedoen!\n\n🔗 Code: ${createdPool.invite_code}\n${poolLink}`}
              />
              <Button className="w-full" onClick={() => navigate(`/app/pool`)}>
                Ga naar mijn poules
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Bedrijven() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useSEO({
    title: "Bedrijfspoule WK 2026 — Goaltje voor Bedrijven & Organisaties",
    description: "Organiseer eenvoudig een professionele WK 2026 bedrijfspoule met eigen branding. Ideaal voor HR, teambuilding en kantoorcompetitie. Gratis starten.",
    canonical: "https://goaltje.nl/bedrijven",
  });

  const navLinks = [
    { label: "Home", to: "/" },
    { label: "Blog", to: "/blog/wk-2026-speelschema" },
  ];

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[hsl(var(--lp-bg))] text-white">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Service",
                "name": "Goaltje Bedrijfspoule",
                "description": "Professionele WK 2026 bedrijfspoule met eigen branding, interne ranglijst en eenvoudig beheer voor HR managers.",
                "provider": { "@type": "Organization", "name": "Goaltje", "url": "https://goaltje.nl" },
                "serviceType": "Team Building / Employee Engagement",
                "areaServed": { "@type": "Country", "name": "Netherlands" },
                "offers": { "@type": "Offer", "price": "0", "priceCurrency": "EUR", "description": "Gratis bedrijfspoule" },
              },
              {
                "@type": "FAQPage",
                "mainEntity": [
                  { "@type": "Question", "name": "Wat kost een bedrijfspoule bij Goaltje?", "acceptedAnswer": { "@type": "Answer", "text": "Een bedrijfspoule bij Goaltje is volledig gratis. Geen verborgen kosten." } },
                  { "@type": "Question", "name": "Kan ik ons bedrijfslogo toevoegen?", "acceptedAnswer": { "@type": "Answer", "text": "Ja, je kunt je bedrijfslogo en naam uploaden voor een white-label ervaring." } },
                  { "@type": "Question", "name": "Hoe delen medewerkers de poule?", "acceptedAnswer": { "@type": "Answer", "text": "Deel de invite link via Microsoft Teams, Slack, e-mail of een QR-code. Geen app download nodig." } },
                ],
              },
            ],
          }),
        }}
      />

      {/* Ambient orbs */}
      <div className="pointer-events-none absolute -top-40 -left-20 h-96 w-96 rounded-full bg-primary/25 blur-[120px]" />
      <div className="pointer-events-none absolute top-[35%] -right-40 h-[26rem] w-[26rem] rounded-full bg-secondary/15 blur-[120px]" />

      {/* Header — matches MarketingHome */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[hsl(var(--lp-surface-dark))/0.76] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={goaltjeLogo} alt="Goaltje" className="h-9 w-9" />
            <span className="font-display text-lg font-bold tracking-wide">GOALTJE</span>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to} className="rounded-xl px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white">
                {link.label}
              </Link>
            ))}
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
              {navLinks.map((link) => (
                <Link key={link.to} to={link.to} onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative border-b border-white/10 py-16 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col items-center gap-10 md:flex-row md:gap-16">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="flex-1 text-center md:text-left"
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white/80">
                <Building2 className="h-3.5 w-3.5" /> Voor bedrijven &amp; organisaties
              </div>
              <h1 className="mb-5 max-w-4xl font-display text-3xl font-bold leading-tight md:text-5xl lg:text-6xl">
                Maak van WK 2026 hét{" "}
                <span className="text-secondary">kantoor evenement</span> ⚽
              </h1>
              <p className="mb-10 max-w-xl text-lg text-white/60 md:text-xl">
                Organiseer eenvoudig een professionele bedrijfspoule. Een bedrijfsprofiel met logo en branding mag, maar is niet verplicht.
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row md:items-start">
                <a href="#start-form">
                  <Button size="lg" className="h-14 w-full bg-secondary px-10 text-base font-bold text-secondary-foreground shadow-lg hover:-translate-y-0.5 hover:bg-secondary/90 transition-all sm:w-auto">
                    Start nu — gratis
                  </Button>
                </a>
                <a href="mailto:info@goaltje.nl?subject=Demo%20bedrijfspoule">
                  <Button size="lg" variant="outline" className="h-14 w-full border-white/25 bg-white/5 px-8 text-base font-semibold text-white hover:bg-white/15 sm:w-auto">
                    Plan gratis demo <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </a>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="w-56 flex-shrink-0 md:w-72"
            >
              <div className="rounded-[2rem] border border-white/15 bg-[hsl(var(--lp-surface-dark))/0.9] p-3 shadow-[var(--lp-shadow-soft)]">
                <img src={promoPool2} alt="Goaltje bedrijfspoule" className="h-auto w-full rounded-[1.5rem]" loading="eager" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-white/10 bg-[hsl(var(--lp-surface-dark))/0.55]">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-3 px-4 py-10 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center text-sm"><Shield className="mx-auto mb-2 h-4 w-4 text-secondary" />100% gratis</div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center text-sm"><Users className="mx-auto mb-2 h-4 w-4 text-primary" />Onbeperkt deelnemers</div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center text-sm"><Zap className="mx-auto mb-2 h-4 w-4 text-secondary" />In 2 minuten klaar</div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center text-sm"><Link2 className="mx-auto mb-2 h-4 w-4 text-primary" />Geen download nodig</div>
        </div>
      </section>

      {/* Problems */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-4">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-12 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/60">Herkenbaar?</p>
            <h2 className="font-display text-2xl font-bold md:text-3xl">Elke WK-editie dezelfde problemen op kantoor.</h2>
          </motion.div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {problems.map((p, i) => (
              <motion.div key={p.text} initial={{ opacity: 0, x: i % 2 === 0 ? -16 : 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
                    <p.icon className={`h-5 w-5 ${p.color}`} />
                  </div>
                  <p className="font-display text-sm font-semibold">{p.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Steps */}
      <section className="border-y border-white/10 bg-[hsl(var(--lp-surface-dark))/0.55] py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-4">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-12 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/60">De oplossing</p>
            <h2 className="font-display text-2xl font-bold md:text-3xl">In 5 stappen een professionele bedrijfspoule.</h2>
          </motion.div>
          <div className="space-y-4">
            {solutionSteps.map((step, i) => (
              <motion.div key={step.num} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-2xl">{step.emoji}</div>
                  <div className="flex flex-1 items-center gap-3">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">{step.num}</span>
                    <p className="font-display text-sm font-semibold md:text-base">{step.title}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Onboarding Form */}
      <section id="start-form" className="scroll-mt-16 py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-4">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-8 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/60">Direct starten</p>
            <h2 className="font-display text-2xl font-bold md:text-3xl">Start jouw bedrijfspoule 🚀</h2>
            <p className="mt-2 text-sm text-white/60">Maak in 2 minuten een bedrijfspoule aan. Gratis.</p>
          </motion.div>
          <CompanyOnboardingForm />
        </div>
      </section>

      {/* App Preview */}
      <section className="border-y border-white/10 bg-[hsl(var(--lp-surface-dark))/0.55] py-12 md:py-16">
        <div className="mx-auto max-w-3xl px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex flex-col items-center gap-8 md:flex-row">
            <div className="rounded-[2rem] border border-white/15 bg-[hsl(var(--lp-surface-dark))/0.9] p-3 shadow-[var(--lp-shadow-soft)]">
              <img src={promoLanding} alt="Goaltje landing pagina op mobiel" className="w-44 rounded-[1.5rem] md:w-52" loading="lazy" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold md:text-xl">Direct aan de slag</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/65">
                Medewerkers openen gewoon de link in hun browser — geen app download, geen account van de IT-afdeling nodig.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-4">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-12 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/60">App showcase</p>
            <h2 className="font-display text-2xl font-bold md:text-3xl">Features voor bedrijven</h2>
            <p className="mt-2 text-sm text-white/60">Alles wat HR nodig heeft, zonder gedoe.</p>
          </motion.div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                <div className="flex h-full items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07]">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold">{f.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-white/60">{f.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="mx-auto w-full max-w-4xl px-4 py-20 text-center">
        <div className="rounded-3xl border border-white/15 bg-gradient-to-br from-primary/25 via-[hsl(var(--lp-surface-dark))/0.9] to-secondary/15 px-6 py-12 shadow-[var(--lp-shadow-soft)]">
          <p className="text-xs uppercase tracking-[0.18em] text-white/70">Klaar om te starten?</p>
          <h2 className="mt-4 font-display text-2xl font-bold md:text-4xl">Klaar om jullie bedrijfspoule te starten?</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-white/60 md:text-base">Plan een korte demo van 15 minuten of start direct.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="#start-form">
              <Button size="lg" className="h-12 w-full bg-secondary px-8 text-base font-bold text-secondary-foreground shadow-xl hover:-translate-y-0.5 hover:bg-secondary/90 transition-all sm:w-auto">
                Start bedrijfspoule
              </Button>
            </a>
            <a href="mailto:info@goaltje.nl?subject=Demo%20bedrijfspoule">
              <Button size="lg" variant="outline" className="h-12 w-full border-white/25 bg-white/5 px-8 text-base font-semibold text-white hover:bg-white/15 sm:w-auto">
                Plan gratis demo <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </a>
          </div>
          <p className="mt-6 text-xs text-white/40">100% gratis · Geen creditcard nodig</p>
        </div>
      </section>

      {/* Footer — matches MarketingHome */}
      <footer className="border-t border-white/10 py-8 text-sm text-white/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <img src={goaltjeLogo} alt="Goaltje" className="h-5 w-5" />
            <p>© 2026 Goaltje</p>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <Link to="/login" className="hover:text-white transition-colors">Inloggen</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
