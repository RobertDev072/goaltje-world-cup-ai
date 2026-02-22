import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Trophy, Target, BarChart3, QrCode, Building2, Tv, ChevronDown, Globe } from "lucide-react";
import goaltjeLogo from "@/assets/goaltje-logo.png";
import { type Lang, LANGS, t, getSavedLang, saveLang } from "@/lib/i18n";

const features = [
  { icon: Tv, key: "live" },
  { icon: Target, key: "predict" },
  { icon: BarChart3, key: "ranking" },
  { icon: QrCode, key: "qr" },
  { icon: Building2, key: "business" },
];

const faqKeys = ["1", "2", "3", "4"];

export default function Landing() {
  const { lang: paramLang } = useParams<{ lang: string }>();
  const navigate = useNavigate();
  const [lang, setLang] = useState<Lang>(getSavedLang());
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [showLangMenu, setShowLangMenu] = useState(false);

  useEffect(() => {
    if (paramLang && ["nl", "en", "es", "pt"].includes(paramLang)) {
      setLang(paramLang as Lang);
      saveLang(paramLang as Lang);
    }
  }, [paramLang]);

  const switchLang = (newLang: Lang) => {
    setLang(newLang);
    saveLang(newLang);
    setShowLangMenu(false);
    navigate(`/${newLang}`);
  };

  // Set document meta
  useEffect(() => {
    document.title = t(lang, "meta_title");
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", t(lang, "meta_description"));
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", t(lang, "meta_title"));
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", t(lang, "meta_description"));
    document.documentElement.lang = lang;
  }, [lang]);

  const currentLang = LANGS.find(l => l.code === lang)!;

  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Goaltje",
            url: window.location.origin,
            description: t(lang, "meta_description"),
            publisher: {
              "@type": "Organization",
              name: "RobertDev.nl",
              url: "https://robertdev.nl",
            },
          }),
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={goaltjeLogo} alt="Goaltje" className="w-10 h-10" />
            <span className="font-display font-bold text-xl">GOALTJE</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm font-medium hover:bg-muted/80 transition-colors"
              >
                <Globe className="h-4 w-4" />
                {currentLang.flag} {currentLang.code.toUpperCase()}
                <ChevronDown className="h-3 w-3" />
              </button>
              {showLangMenu && (
                <div className="absolute right-0 mt-1 bg-card rounded-xl shadow-xl border p-1 min-w-[160px] z-50">
                  {LANGS.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => switchLang(l.code)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        lang === l.code ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"
                      }`}
                    >
                      <span>{l.flag}</span> {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Link to="/auth">
              <Button size="sm" variant="outline" className="font-semibold">Login</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Ccircle cx='30' cy='30' r='28' fill='none' stroke='%23000' stroke-width='1'/%3E%3Cpath d='M30 2 L30 58 M2 30 L58 30 M8 8 L52 52 M52 8 L8 52' fill='none' stroke='%23000' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: "60px 60px",
        }} />
        <div className="max-w-5xl mx-auto px-4 py-20 md:py-32 text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <img src={goaltjeLogo} alt="Goaltje" className="w-24 h-24 md:w-32 md:h-32 mx-auto mb-6" loading="eager" />
            <h1 className="text-4xl md:text-6xl font-display font-bold mb-4 leading-tight">
              GOALTJE <span className="text-gradient">⚽</span>
            </h1>
            <p className="text-xl md:text-2xl font-display font-semibold text-foreground/90 mb-2">
              {t(lang, "hero_title")}
            </p>
            <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto mb-8">
              {t(lang, "hero_subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/auth">
                <Button size="lg" className="gradient-primary text-primary-foreground h-14 px-8 text-lg font-semibold shadow-lg hover:shadow-xl transition-shadow">
                  🏆 {t(lang, "cta_create")}
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-semibold">
                  🔗 {t(lang, "cta_join")}
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24 bg-muted/50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feat, i) => (
              <motion.div
                key={feat.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="border-0 shadow-md hover:shadow-lg transition-shadow h-full">
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center mb-4">
                      <feat.icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <h3 className="font-display font-semibold text-lg mb-2">{t(lang, `feature_${feat.key}`)}</h3>
                    <p className="text-muted-foreground text-sm">{t(lang, `feature_${feat.key}_desc`)}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-display font-bold text-center mb-10">{t(lang, "faq_title")}</h2>
          <div className="space-y-3">
            {faqKeys.map((key) => (
              <Card key={key} className="border-0 shadow-sm">
                <CardContent className="p-0">
                  <button
                    onClick={() => setOpenFaq(openFaq === key ? null : key)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <span className="font-semibold text-sm">{t(lang, `faq_${key}_q`)}</span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openFaq === key ? "rotate-180" : ""}`} />
                  </button>
                  {openFaq === key && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                      <p className="px-4 pb-4 text-sm text-muted-foreground">{t(lang, `faq_${key}_a`)}</p>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-12 bg-muted/50">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-display font-bold mb-3">{t(lang, "contact")}</h2>
          <p className="text-muted-foreground text-sm">
            {t(lang, "contact_text")} <a href="mailto:info@robertdev.nl" className="text-primary font-semibold hover:underline">info@robertdev.nl</a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={goaltjeLogo} alt="Goaltje" className="w-6 h-6" />
            <span className="text-sm text-muted-foreground">© RobertDev.nl – GOALTJE</span>
          </div>
          <div className="flex gap-4">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => switchLang(l.code)}
                className={`text-xs ${lang === l.code ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                {l.flag} {l.code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
