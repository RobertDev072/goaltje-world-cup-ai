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
  if (!lang || !VALID_LANGS.includes(lang)) return <Navigate to="/landing" replace />;
  return <>{children}</>;
}

// Lazy load all pages for lighter initial bundle
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
              {/* Public landing pages */}
              <Route path="/landing" element={<Landing />} />
              <Route path="/:lang" element={<LangGuard><Landing /></LangGuard>} />
              <Route path="/blog/:slug" element={<BlogArticle />} />
              <Route path="/privacy" element={<Privacy />} />
              
              {/* Auth */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/join/:code" element={<JoinPool />} />
              
              {/* App routes - auth required */}
              <Route element={<AuthGate><AppLayout /></AuthGate>}>
                <Route path="/" element={<Index />} />
                <Route path="/matches" element={<Matches />} />
                <Route path="/matches/:id" element={<MatchDetail />} />
                <Route path="/pool" element={<Pool />} />
                <Route path="/pool/:id" element={<PoolDetail />} />
                <Route path="/bracket" element={<Bracket />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/admin" element={<AdminDashboard />} />
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
);

export default App;
