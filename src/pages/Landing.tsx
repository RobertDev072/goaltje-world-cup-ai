import { useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Trophy, Target, BarChart3, QrCode, Building2, Tv, ChevronDown, Globe, Users, Smartphone, Shield, CheckCircle2, Mail, Monitor, Tablet, Zap, Lock, MessageCircle, Award, Newspaper, Calendar, MapPin, TrendingUp, Lightbulb, Flag } from "lucide-react";
import goaltjeLogo from "@/assets/goaltje-logo.png";
import founderPhoto from "@/assets/founder-robert.png";
import { type Lang, LANGS, t, getSavedLang, saveLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

const steps = [
  { icon: "1️⃣", key: "step1" },
  { icon: "2️⃣", key: "step2" },
  { icon: "3️⃣", key: "step3" },
  { icon: "4️⃣", key: "step4" },
];

const showcaseItems = [
  { key: "live", icon: Tv, color: "from-red-500 to-orange-500", emoji: "📺" },
  { key: "predict", icon: Target, color: "from-primary to-blue-600", emoji: "🎯" },
  { key: "leaderboard", icon: BarChart3, color: "from-secondary to-yellow-500", emoji: "🏆" },
  { key: "bracket", icon: Award, color: "from-emerald-500 to-teal-500", emoji: "🌳" },
  { key: "social", icon: MessageCircle, color: "from-violet-500 to-purple-500", emoji: "💬" },
  { key: "business", icon: Building2, color: "from-slate-600 to-slate-800", emoji: "🏢" },
];

const faqKeys = ["1", "2", "3", "4", "5", "6"];

const blogArticles = [
  { key: "1", icon: Calendar, color: "from-blue-500 to-cyan-500", slug: "wk-2026-speelschema" },
  { key: "2", icon: TrendingUp, color: "from-purple-500 to-pink-500", slug: "wk-2026-format-48-landen" },
  { key: "3", icon: MapPin, color: "from-green-500 to-emerald-500", slug: "wk-2026-speelsteden-stadions" },
  { key: "4", icon: Target, color: "from-orange-500 to-red-500", slug: "wk-2026-voorspellingen-favorieten" },
  { key: "5", icon: Lightbulb, color: "from-yellow-500 to-amber-500", slug: "wk-poule-winnen-strategieen" },
  { key: "6", icon: Flag, color: "from-primary to-blue-600", slug: "nederland-oranje-wk-2026" },
];

export default function Landing() {
  const { lang: paramLang } = useParams<{ lang: string }>();
  const navigate = useNavigate();
  const [lang, setLang] = useState<Lang>(getSavedLang());
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [liveStats, setLiveStats] = useState({ total_users: 0, total_pools: 0, total_predictions: 0 });

  useEffect(() => {
    supabase.rpc('get_public_stats').then(({ data }) => {
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const stats = data as { total_users?: number; total_pools?: number; total_predictions?: number };
        setLiveStats({
          total_users: stats.total_users ?? 0,
          total_pools: stats.total_pools ?? 0,
          total_predictions: stats.total_predictions ?? 0,
        });
      }
    });
  }, []);

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
      {/* JSON-LD WebSite */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Goaltje",
            url: window.location.origin,
            description: t(lang, "meta_description"),
            publisher: { "@type": "Organization", name: "RobertDev.nl", url: "https://robertdev.nl" },
          }),
        }}
      />
      {/* JSON-LD Blog */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            name: t(lang, "blog_title"),
            url: `${window.location.origin}/${lang}#blog`,
            publisher: { "@type": "Organization", name: "Goaltje", url: window.location.origin },
            blogPost: blogArticles.map((a) => ({
              "@type": "BlogPosting",
              headline: t(lang, `blog_${a.key}_title`),
              description: t(lang, `blog_${a.key}_summary`),
              author: { "@type": "Person", name: "Robert Cavalcante Rocha" },
            })),
          }),
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary border-b border-primary-foreground/10 safe-top">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={goaltjeLogo} alt="Goaltje" className="w-9 h-9" />
            <span className="font-display font-bold text-lg text-primary-foreground">GOALTJE</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-primary-foreground/10 text-primary-foreground text-xs font-medium hover:bg-primary-foreground/20 transition-colors"
              >
                <Globe className="h-3.5 w-3.5" />
                {currentLang.flag}
                <ChevronDown className="h-3 w-3" />
              </button>
              {showLangMenu && (
                <div className="absolute right-0 mt-1 bg-card rounded-xl shadow-xl border p-1 min-w-[140px] z-50">
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
            <Link to="/login">
              <Button size="sm" className="bg-secondary text-secondary-foreground font-semibold h-8 text-xs hover:bg-secondary/90">
                {t(lang, "cta_login")}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[hsl(var(--goaltje-navy))] via-[hsl(var(--goaltje-darkblue))] to-[hsl(var(--primary))]">
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Ccircle cx='30' cy='30' r='28' fill='none' stroke='%23fff' stroke-width='1'/%3E%3Cpath d='M30 2 L30 58 M2 30 L58 30 M8 8 L52 52 M52 8 L8 52' fill='none' stroke='%23fff' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: "60px 60px",
        }} />
        <motion.div
          className="absolute bottom-6 text-4xl md:text-6xl opacity-20 pointer-events-none select-none"
          animate={{ x: ["0vw", "100vw"], rotate: [0, 720] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        >
          ⚽
        </motion.div>
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-28 text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <img src={goaltjeLogo} alt="Goaltje" className="w-24 h-24 md:w-32 md:h-32 mx-auto mb-6" loading="eager" />
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold mb-4 leading-tight text-white">
              GOALTJE <span className="text-secondary">⚽</span>
            </h1>
            <p className="text-lg md:text-2xl font-display font-semibold text-white/90 mb-2">
              {t(lang, "hero_title")}
            </p>
            <p className="text-white/60 text-sm md:text-lg max-w-xl mx-auto mb-3">
              {t(lang, "hero_subtitle")}
            </p>
            <p className="text-white/50 text-xs md:text-sm max-w-md mx-auto mb-8">
              {t(lang, "hero_accessible")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/login">
                <Button size="lg" className="bg-secondary text-secondary-foreground h-14 px-8 text-base md:text-lg font-semibold shadow-lg hover:shadow-xl hover:bg-secondary/90 transition-all w-full sm:w-auto">
                  🏆 {t(lang, "cta_create")}
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="h-14 px-8 text-base md:text-lg font-semibold w-full sm:w-auto border-white/30 text-white bg-transparent hover:bg-white/10">
                  🔗 {t(lang, "cta_join")}
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="py-6 border-y bg-muted/30">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12 text-muted-foreground text-xs md:text-sm">
            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" /> {t(lang, "trust_free")}</div>
            <div className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-primary" /> {t(lang, "trust_secure")}</div>
            <div className="flex items-center gap-1.5"><Smartphone className="h-4 w-4 text-primary" /> {t(lang, "trust_mobile")}</div>
            <div className="flex items-center gap-1.5"><Users className="h-4 w-4 text-primary" /> {t(lang, "trust_everyone")}</div>
          </div>
        </div>
      </section>

      {/* Social Proof Counter */}
      {(liveStats.total_users > 0 || liveStats.total_pools > 0) && (
        <section className="py-8 md:py-10 bg-gradient-to-r from-primary via-[hsl(var(--goaltje-darkblue))] to-primary">
          <div className="max-w-4xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="grid grid-cols-3 gap-4 text-center"
            >
              {[
                { value: liveStats.total_users, label: t(lang, "social_users"), emoji: "👥" },
                { value: liveStats.total_pools, label: t(lang, "social_pools"), emoji: "🏆" },
                { value: liveStats.total_predictions, label: t(lang, "social_predictions"), emoji: "🎯" },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="flex flex-col items-center"
                >
                  <span className="text-2xl mb-1">{stat.emoji}</span>
                  <span className="text-2xl md:text-4xl font-display font-bold text-white">
                    {stat.value.toLocaleString()}
                  </span>
                  <span className="text-white/60 text-xs md:text-sm mt-1">{stat.label}</span>
                </motion.div>
              ))}
            </motion.div>
            <p className="text-center text-white/40 text-[10px] md:text-xs mt-4">
              {t(lang, "social_live")}
            </p>
          </div>
        </section>
      )}

      {/* Numbers Bar */}
      <section className="py-10 md:py-14 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-xl md:text-2xl font-display font-bold text-center mb-6">{t(lang, "numbers_title")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { emoji: "⚽", key: "numbers_matches" },
              { emoji: "🌍", key: "numbers_teams" },
              { emoji: "🏟️", key: "numbers_groups" },
              { emoji: "🎉", key: "numbers_free" },
            ].map((item, i) => (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl mb-1">{item.emoji}</div>
                <p className="font-display font-bold text-base md:text-lg">{t(lang, item.key)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 md:py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-3">{t(lang, "how_title")}</h2>
          <p className="text-muted-foreground text-center text-sm md:text-base max-w-xl mx-auto mb-10">{t(lang, "how_subtitle")}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {steps.map((step, i) => (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="border-0 shadow-md h-full text-center">
                  <CardContent className="p-5">
                    <div className="text-3xl mb-3">{step.icon}</div>
                    <h3 className="font-display font-semibold text-sm mb-1">{t(lang, `${step.key}_title`)}</h3>
                    <p className="text-muted-foreground text-xs">{t(lang, `${step.key}_desc`)}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== APP SHOWCASE – Main new section ========== */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-4xl font-display font-bold text-center mb-2">{t(lang, "showcase_title")}</h2>
            <p className="text-muted-foreground text-center text-sm md:text-base max-w-2xl mx-auto mb-12">{t(lang, "showcase_subtitle")}</p>
          </motion.div>

          <div className="space-y-8 md:space-y-12">
            {showcaseItems.map((item, i) => {
              const bullets = t(lang, `showcase_${item.key}_bullets`).split("|");
              const isEven = i % 2 === 0;

              return (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <Card className="border-0 shadow-lg overflow-hidden">
                    <div className={`flex flex-col ${isEven ? "md:flex-row" : "md:flex-row-reverse"}`}>
                      {/* Visual side */}
                      <div className={`w-full md:w-2/5 bg-gradient-to-br ${item.color} p-8 md:p-10 flex items-center justify-center min-h-[200px]`}>
                        <div className="text-center">
                          <div className="text-6xl md:text-7xl mb-3">{item.emoji}</div>
                          <item.icon className="h-8 w-8 text-white/60 mx-auto" />
                        </div>
                      </div>
                      {/* Content side */}
                      <div className="w-full md:w-3/5 p-6 md:p-8 flex flex-col justify-center">
                        <h3 className="font-display font-bold text-lg md:text-xl mb-2">
                          {t(lang, `showcase_${item.key}_title`)}
                        </h3>
                        <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                          {t(lang, `showcase_${item.key}_desc`)}
                        </p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {bullets.map((bullet, bi) => (
                            <li key={bi} className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Goaltje */}
      <section className="py-14 md:py-20 bg-primary text-primary-foreground">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-2">{t(lang, "why_title")}</h2>
          <p className="text-center opacity-70 text-sm mb-10">{t(lang, "why_subtitle")}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Zap, key: "1" },
              { icon: Lock, key: "2" },
              { icon: Smartphone, key: "3" },
              { icon: Trophy, key: "4" },
            ].map((item, i) => (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="bg-primary-foreground/10 rounded-2xl p-5 h-full text-center hover:bg-primary-foreground/15 transition-colors">
                  <item.icon className="h-7 w-7 mx-auto mb-3 text-secondary" />
                  <h3 className="font-display font-semibold text-sm mb-1">{t(lang, `why_${item.key}_title`)}</h3>
                  <p className="text-xs opacity-70 leading-relaxed">{t(lang, `why_${item.key}_desc`)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Scoring Explanation */}
      <section className="py-12 md:py-20">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-8">{t(lang, "scoring_title")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-0 shadow-md text-center overflow-hidden">
              <div className="bg-primary h-1" />
              <CardContent className="p-5">
                <div className="text-3xl font-bold font-display text-primary mb-1">5</div>
                <p className="text-xs text-muted-foreground">{t(lang, "scoring_exact")}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md text-center overflow-hidden">
              <div className="bg-secondary h-1" />
              <CardContent className="p-5">
                <div className="text-3xl font-bold font-display text-secondary mb-1">3</div>
                <p className="text-xs text-muted-foreground">{t(lang, "scoring_result")}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md text-center overflow-hidden">
              <div className="bg-accent h-1" />
              <CardContent className="p-5">
                <div className="text-3xl font-bold font-display text-accent mb-1">+2</div>
                <p className="text-xs text-muted-foreground">{t(lang, "scoring_diff")}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 md:py-20 bg-muted/50">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-8">{t(lang, "faq_title")}</h2>
          <div className="space-y-2">
            {faqKeys.map((key) => (
              <Card key={key} className="border-0 shadow-sm">
                <CardContent className="p-0">
                  <button
                    onClick={() => setOpenFaq(openFaq === key ? null : key)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <span className="font-semibold text-sm">{t(lang, `faq_${key}_q`)}</span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ml-2 ${openFaq === key ? "rotate-180" : ""}`} />
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

      {/* Blog / News Section */}
      <section className="py-16 md:py-24" id="blog">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Newspaper className="h-6 w-6 text-primary" />
              <h2 className="text-2xl md:text-4xl font-display font-bold text-center">{t(lang, "blog_title")}</h2>
            </div>
            <p className="text-muted-foreground text-center text-sm md:text-base max-w-2xl mx-auto mb-12">{t(lang, "blog_subtitle")}</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogArticles.map((article, i) => (
              <motion.article
                key={article.key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="group"
              >
                <Card className="border-0 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden h-full flex flex-col group-hover:-translate-y-1">
                  <div className={`bg-gradient-to-br ${article.color} p-6 flex items-center justify-center`}>
                    <article.icon className="h-10 w-10 text-white" />
                  </div>
                  <CardContent className="p-5 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {t(lang, `blog_${article.key}_tag`)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{t(lang, `blog_${article.key}_date`)}</span>
                    </div>
                    <h3 className="font-display font-bold text-sm md:text-base mb-2 leading-snug group-hover:text-primary transition-colors">
                      {t(lang, `blog_${article.key}_title`)}
                    </h3>
                    <p className="text-muted-foreground text-xs leading-relaxed flex-1">
                      {t(lang, `blog_${article.key}_summary`)}
                    </p>
                    <Link to={`/blog/${article.slug}`} className="mt-4 inline-flex items-center gap-1 text-primary text-xs font-semibold hover:underline">
                      {t(lang, "blog_read_more")} →
                    </Link>
                  </CardContent>
                </Card>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-[hsl(var(--goaltje-navy))] via-[hsl(var(--goaltje-darkblue))] to-[hsl(var(--primary))] text-white overflow-hidden">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-12">{t(lang, "founder_title")}</h2>
          </motion.div>
          
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }} className="space-y-5">
              <div className="flex items-center gap-4">
                <img 
                  src={founderPhoto} 
                  alt="Robert Cavalcante Rocha – Founder of Goaltje" 
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover ring-4 ring-secondary/40 shadow-xl"
                />
                <div>
                  <h3 className="font-display font-bold text-xl">Robert Cavalcante Rocha</h3>
                  <p className="text-white/60 text-sm">Founder & Developer</p>
                </div>
              </div>
              <p className="text-white/80 text-sm leading-relaxed">{t(lang, "founder_bio")}</p>
              <p className="text-white/70 text-sm leading-relaxed">{t(lang, "founder_bio2")}</p>
              <blockquote className="border-l-4 border-secondary pl-4 py-2">
                <p className="text-white/90 text-sm italic font-medium">"{t(lang, "founder_quote")}"</p>
              </blockquote>
              <a href="mailto:rb085@icloud.com" className="inline-flex items-center gap-2 text-secondary hover:text-secondary/80 text-sm font-semibold transition-colors">
                <Mail className="h-4 w-4" /> rb085@icloud.com
              </a>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }} className="relative flex justify-center items-end">
              {/* Desktop mockup */}
              <div className="relative">
                <div className="w-56 md:w-72 bg-[hsl(var(--goaltje-navy))] rounded-xl border-2 border-white/10 shadow-2xl overflow-hidden">
                  <div className="flex items-center gap-1 px-3 py-1.5 bg-white/5 border-b border-white/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="text-[8px] text-white/30 ml-2 font-mono">goaltje.app</span>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <img src={goaltjeLogo} alt="" className="w-5 h-5" />
                      <span className="text-[10px] font-bold text-white/80">GOALTJE</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-2 bg-white/10 rounded-full w-full" />
                      <div className="flex gap-1">
                        <div className="h-8 flex-1 bg-secondary/20 rounded-lg border border-secondary/30 flex items-center justify-center">
                          <span className="text-[8px] text-secondary">🇳🇱 2-1 🇧🇷</span>
                        </div>
                        <div className="h-8 flex-1 bg-primary/20 rounded-lg border border-primary/30 flex items-center justify-center">
                          <span className="text-[8px] text-white/60">🏆 #1</span>
                        </div>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full w-3/4" />
                      <div className="h-2 bg-white/10 rounded-full w-1/2" />
                    </div>
                  </div>
                </div>
                <Monitor className="absolute -bottom-3 left-1/2 -translate-x-1/2 h-6 w-6 text-white/20" />
              </div>

              {/* Phone mockup */}
              <div className="relative -ml-8 mb-0 z-10">
                <div className="w-28 md:w-36 bg-[hsl(var(--goaltje-navy))] rounded-2xl border-2 border-white/15 shadow-2xl overflow-hidden">
                  <div className="flex justify-center pt-1.5 pb-1">
                    <div className="w-10 h-1 bg-white/10 rounded-full" />
                  </div>
                  <div className="p-2 space-y-1.5">
                    <div className="flex items-center justify-center gap-1">
                      <img src={goaltjeLogo} alt="" className="w-4 h-4" />
                      <span className="text-[8px] font-bold text-white/80">GOALTJE</span>
                    </div>
                    <div className="h-6 bg-secondary/20 rounded-lg border border-secondary/30 flex items-center justify-center">
                      <span className="text-[7px] text-secondary font-semibold">⚽ Live</span>
                    </div>
                    <div className="space-y-1">
                      <div className="h-1.5 bg-white/10 rounded-full w-full" />
                      <div className="h-1.5 bg-white/10 rounded-full w-3/4" />
                      <div className="h-1.5 bg-white/10 rounded-full w-1/2" />
                    </div>
                  </div>
                  <div className="flex justify-around px-2 py-1.5 border-t border-white/10">
                    <div className="w-3 h-3 rounded bg-white/10" />
                    <div className="w-3 h-3 rounded bg-secondary/30" />
                    <div className="w-3 h-3 rounded bg-white/10" />
                    <div className="w-3 h-3 rounded bg-white/10" />
                  </div>
                </div>
                <Smartphone className="absolute -bottom-3 left-1/2 -translate-x-1/2 h-5 w-5 text-white/20" />
              </div>

              {/* Tablet mockup */}
              <div className="hidden md:block relative -ml-6 mb-4">
                <div className="w-32 bg-[hsl(var(--goaltje-navy))] rounded-xl border-2 border-white/10 shadow-2xl overflow-hidden">
                  <div className="flex justify-center pt-1 pb-0.5">
                    <div className="w-2 h-2 rounded-full bg-white/10" />
                  </div>
                  <div className="p-2 space-y-1">
                    <div className="h-4 bg-primary/20 rounded flex items-center justify-center">
                      <span className="text-[7px] text-white/60">🏆 Leaderboard</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full w-full" />
                    <div className="h-1.5 bg-white/10 rounded-full w-4/5" />
                    <div className="h-1.5 bg-white/10 rounded-full w-3/5" />
                  </div>
                </div>
                <Tablet className="absolute -bottom-3 left-1/2 -translate-x-1/2 h-5 w-5 text-white/20" />
              </div>
            </motion.div>
          </div>

          <p className="text-center text-white/40 text-xs mt-10 flex items-center justify-center gap-2">
            <Monitor className="h-3.5 w-3.5" />
            <Tablet className="h-3.5 w-3.5" />
            <Smartphone className="h-3.5 w-3.5" />
            {t(lang, "founder_available")}
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12 md:py-16 bg-muted/50">
        <div className="max-w-2xl mx-auto px-4 text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-display font-bold">{t(lang, "cta_final_title")}</h2>
          <p className="text-muted-foreground text-sm">{t(lang, "cta_final_subtitle")}</p>
          <Link to="/login">
            <Button size="lg" className="bg-primary text-primary-foreground h-14 px-8 text-lg font-semibold shadow-lg mt-2">
              🚀 {t(lang, "cta_create")}
            </Button>
          </Link>
        </div>
      </section>

      {/* Contact */}
      <section className="py-10">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-xl font-display font-bold mb-2">{t(lang, "contact")}</h2>
          <p className="text-muted-foreground text-sm">
            {t(lang, "contact_text")} <a href="mailto:rb085@icloud.com" className="text-primary font-semibold hover:underline">rb085@icloud.com</a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 border-t">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src={goaltjeLogo} alt="Goaltje" className="w-5 h-5" />
            <span className="text-xs text-muted-foreground">© 2026 RobertDev.nl – GOALTJE</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Privacybeleid
            </Link>
            <div className="flex gap-3">
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
        </div>
      </footer>
    </div>
  );
}
