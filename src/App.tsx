import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useParams, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { AuthGate } from "@/components/AuthGate";
import { InstallPrompt } from "@/components/InstallPrompt";
import { CookieConsent } from "@/components/CookieConsent";
import { Skeleton } from "@/components/ui/skeleton";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

const VALID_LANGS = ["nl", "en", "es", "pt"];
function LangGuard({ children }: { children: React.ReactNode }) {
  const { lang } = useParams<{ lang: string }>();
  if (!lang || !VALID_LANGS.includes(lang)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// Lazy load all pages for lighter initial bundle
const MarketingHome = lazy(() => import("./pages/MarketingHome"));
const Bedrijven = lazy(() => import("./pages/Bedrijven"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Index = lazy(() => import("./pages/Index"));
const Matches = lazy(() => import("./pages/Matches"));
const MatchDetail = lazy(() => import("./pages/MatchDetail"));
const Pool = lazy(() => import("./pages/Pool"));
const PoolDetail = lazy(() => import("./pages/PoolDetail"));
const JoinPool = lazy(() => import("./pages/JoinPool"));
const Bracket = lazy(() => import("./pages/Bracket"));
const Profile = lazy(() => import("./pages/Profile"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Landing = lazy(() => import("./pages/Landing"));
const BlogArticle = lazy(() => import("./pages/BlogArticle"));
const Privacy = lazy(() => import("./pages/Privacy"));
const NotFound = lazy(() => import("./pages/NotFound"));

// SEO pages
const PoolMakenVrienden = lazy(() => import("./pages/seo/PoolMakenVrienden"));
const BedrijfspouleKantoor = lazy(() => import("./pages/seo/BedrijfspouleKantoor"));
const PouleRegels = lazy(() => import("./pages/seo/PouleRegels"));
const PouleTips = lazy(() => import("./pages/seo/PouleTips"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));

const AppSplashLoader = lazy(() => import("@/components/AppSplashLoader").then(m => ({ default: m.AppSplashLoader })));

const PageLoader = () => (
  <div className="max-w-lg mx-auto px-4 pt-8 space-y-4">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-32 rounded-xl" />
    <Skeleton className="h-24 rounded-xl" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: true,
      refetchOnMount: "always",
      retry: 1,
    },
  },
});

const App = () => (
  <div data-app-mounted>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <InstallPrompt />
        <CookieConsent />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public marketing pages */}
              <Route path="/" element={<MarketingHome />} />
              <Route path="/bedrijven" element={<Bedrijven />} />
              <Route path="/landing" element={<Landing />} />
              <Route path="/:lang" element={<LangGuard><Landing /></LangGuard>} />
              <Route path="/blog/:slug" element={<BlogArticle />} />
              <Route path="/privacy" element={<Privacy />} />
              
              {/* SEO pages - NL */}
              <Route path="/wk-2026-poule-maken-met-vrienden" element={<PoolMakenVrienden />} />
              <Route path="/bedrijfspoule-wk-2026-kantoor" element={<BedrijfspouleKantoor />} />
              <Route path="/voetbalpoule-regels-puntentelling" element={<PouleRegels />} />
              <Route path="/wk-poule-tips-voorspellingen" element={<PouleTips />} />
              {/* SEO pages - EN */}
              <Route path="/make-wk-2026-pool-with-friends" element={<PoolMakenVrienden />} />
              <Route path="/company-wk-2026-pool-office" element={<BedrijfspouleKantoor />} />
              <Route path="/football-pool-rules-scoring" element={<PouleRegels />} />
              <Route path="/wk-pool-prediction-tips" element={<PouleTips />} />
              
              {/* Public leaderboard */}
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/en/leaderboard" element={<Leaderboard />} />

              {/* Auth */}
              <Route path="/login" element={<Auth />} />
              <Route path="/auth" element={<Navigate to="/login" replace />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/join/:code" element={<JoinPool />} />
              
              {/* App routes - auth required */}
              <Route element={<AuthGate><AppLayout /></AuthGate>}>
                <Route path="/app" element={<Index />} />
                <Route path="/app/matches" element={<Matches />} />
                <Route path="/app/matches/:id" element={<MatchDetail />} />
                <Route path="/app/pool" element={<Pool />} />
                <Route path="/app/pool/:id" element={<PoolDetail />} />
                <Route path="/app/bracket" element={<Bracket />} />
                <Route path="/app/profile" element={<Profile />} />
                <Route path="/app/admin" element={<AdminDashboard />} />
              </Route>
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Analytics />
        <SpeedInsights />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </div>
);

export default App;
