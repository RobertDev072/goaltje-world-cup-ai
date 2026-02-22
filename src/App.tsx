import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Index from "./pages/Index";
import Matches from "./pages/Matches";
import MatchDetail from "./pages/MatchDetail";
import Pool from "./pages/Pool";
import PoolDetail from "./pages/PoolDetail";
import JoinPool from "./pages/JoinPool";
import Bracket from "./pages/Bracket";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import { AuthGate } from "@/components/AuthGate";
import { InstallPrompt } from "@/components/InstallPrompt";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10,   // 10 minutes cache
      refetchOnWindowFocus: false,
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
        <BrowserRouter>
          <Routes>
            {/* Public landing pages */}
            <Route path="/landing" element={<Landing />} />
            <Route path="/nl" element={<Landing />} />
            <Route path="/en" element={<Landing />} />
            <Route path="/es" element={<Landing />} />
            <Route path="/pt" element={<Landing />} />
            
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
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
