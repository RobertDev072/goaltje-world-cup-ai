import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/lib/seo";
import { useLocation } from "react-router-dom";
import { Trophy, Users, Target, TrendingUp, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import goaltjeLogo from "@/assets/goaltje-logo.png";

interface LeaderboardData {
  top_pools: Array<{
    id: string;
    name: string;
    privacy: string;
    tenant_name: string | null;
    member_count: number;
    avg_points: number;
    top_score: number;
  }>;
  top_predictors: Array<{
    name: string;
    avatar_url: string | null;
    total_points: number;
    correct_count: number;
    exact_count: number;
  }>;
  stats: {
    total_pools: number;
    total_players: number;
    total_predictions: number;
  };
}

const isEnglish = () => {
  if (typeof window === "undefined") return false;
  return window.location.pathname.startsWith("/en") || navigator.language.startsWith("en");
};

export default function Leaderboard() {
  const en = isEnglish();
  const location = useLocation();

  useSEO({
    title: en
      ? "WK 2026 Pool Leaderboard – Live Rankings | Goaltje"
      : "WK 2026 Poule Klassement – Live Ranglijst | Goaltje",
    description: en
      ? "See the top WK 2026 prediction pools and best predictors live. Join the competition on Goaltje."
      : "Bekijk de top WK 2026 voorspellingspoules en beste voorspellers live. Doe mee op Goaltje.",
    canonical: "https://goaltje.nl/leaderboard",
  });

  const { data, isLoading } = useQuery<LeaderboardData>({
    queryKey: ["public-leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_leaderboard");
      if (error) throw error;
      return data as unknown as LeaderboardData;
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });

  const t = {
    title: en ? "WK 2026 Leaderboard" : "WK 2026 Klassement",
    subtitle: en ? "Live rankings of the best pools and predictors" : "Live ranglijst van de beste poules en voorspellers",
    topPools: en ? "Top Pools" : "Top Poules",
    topPredictors: en ? "Best Predictors" : "Beste Voorspellers",
    members: en ? "members" : "leden",
    points: en ? "pts" : "pt",
    avg: en ? "avg" : "gem",
    topScore: en ? "top" : "top",
    exact: en ? "exact" : "exact",
    correct: en ? "correct" : "goed",
    cta: en ? "Start your pool" : "Start jouw poule",
    noPools: en ? "No public pools yet. Be the first!" : "Nog geen publieke poules. Wees de eerste!",
    totalPools: en ? "Pools" : "Poules",
    totalPlayers: en ? "Players" : "Spelers",
    totalPredictions: en ? "Predictions" : "Voorspellingen",
    company: en ? "Company" : "Bedrijf",
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: en ? "WK 2026 Pool Leaderboard" : "WK 2026 Poule Klassement",
    description: en
      ? "Live rankings of WK 2026 prediction pools"
      : "Live ranglijst van WK 2026 voorspellingspoules",
    url: "https://goaltje.nl/leaderboard",
    isPartOf: { "@type": "WebSite", name: "Goaltje", url: "https://goaltje.nl" },
  };

  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={goaltjeLogo} alt="Goaltje" className="h-8 w-8" />
            <span className="font-bold text-lg text-foreground">Goaltje</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to={location.pathname.includes("/en") ? "/leaderboard" : "/en/leaderboard"}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {en ? "🇳🇱 NL" : "🇬🇧 EN"}
            </Link>
            <Link
              to="/login"
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              {t.cta}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-2 flex items-center justify-center gap-3">
            <Trophy className="h-8 w-8 text-secondary" />
            {t.title}
          </h1>
          <p className="text-muted-foreground text-lg">{t.subtitle}</p>
        </div>

        {/* Stats bar */}
        {data?.stats && (
          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { label: t.totalPools, value: data.stats.total_pools, icon: Users },
              { label: t.totalPlayers, value: data.stats.total_players, icon: Target },
              { label: t.totalPredictions, value: data.stats.total_predictions, icon: TrendingUp },
            ].map((s) => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
                <s.icon className="h-5 w-5 mx-auto text-primary mb-1" />
                <div className="text-2xl font-bold text-foreground">{s.value.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        )}

        {data && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Top Pools */}
            <section>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {t.topPools}
              </h2>
              {data.top_pools.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t.noPools}</p>
              ) : (
                <div className="space-y-2">
                  {data.top_pools.map((pool, i) => (
                    <div
                      key={pool.id}
                      className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 hover:border-primary/30 transition-colors"
                    >
                      <span className="text-lg font-bold text-muted-foreground w-7 text-right">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground truncate">{pool.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>{pool.member_count} {t.members}</span>
                          {pool.tenant_name && (
                            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-medium">
                              {t.company}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-foreground">{pool.top_score} {t.points}</div>
                        <div className="text-[10px] text-muted-foreground">{t.avg} {pool.avg_points}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Top Predictors */}
            <section>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-secondary" />
                {t.topPredictors}
              </h2>
              {data.top_predictors.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t.noPools}</p>
              ) : (
                <div className="space-y-2">
                  {data.top_predictors.map((p, i) => (
                    <div
                      key={`${p.name}-${i}`}
                      className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3"
                    >
                      <span className="text-lg font-bold text-muted-foreground w-7 text-right">
                        {i + 1}
                      </span>
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-foreground overflow-hidden">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          p.name?.[0]?.toUpperCase() || "?"
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground truncate">{p.name || "Anoniem"}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.exact_count} {t.exact} · {p.correct_count} {t.correct}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-foreground">{p.total_points} {t.points}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-xl text-lg font-bold hover:opacity-90 transition-opacity shadow-lg"
          >
            {t.cta}
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </main>
    </div>
  );
}
