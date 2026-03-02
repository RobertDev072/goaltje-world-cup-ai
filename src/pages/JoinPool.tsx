import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { motion } from "framer-motion";
import goaltjeLogo from "@/assets/goaltje-logo.png";

interface PoolLookup {
  id: string;
  name: string;
  tenant_id?: string | null;
  tenant_name?: string | null;
  tenant_logo_url?: string | null;
  tenant_primary_color?: string | null;
  tenant_secondary_color?: string | null;
}

export default function JoinPool() {
  const { code } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [poolInfo, setPoolInfo] = useState<PoolLookup | null>(null);

  useEffect(() => {
    // Pre-fetch pool info for branding display
    const fetchInfo = async () => {
      const { data } = await supabase.rpc("lookup_pool_by_invite_code", { _code: code! });
      if (data) setPoolInfo(data as unknown as PoolLookup);
    };
    if (code) fetchInfo();
  }, [code]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      sessionStorage.setItem("joinCode", code || "");
      navigate("/login");
      return;
    }

    const join = async () => {
      try {
        const pool = poolInfo || (await supabase.rpc("lookup_pool_by_invite_code", { _code: code! }).then(r => r.data)) as PoolLookup | null;
        if (!pool || !pool.id) {
          toast({ title: "Poule niet gevonden", variant: "destructive" });
          navigate("/app/pool");
          return;
        }

        const { error } = await supabase.from("pool_members").insert({
          pool_id: pool.id,
          user_id: user.id,
          role: "member",
        });

        if (error) {
          if (error.code === "23505") {
            toast({ title: `Je zit al in "${pool.name}"!` });
          } else {
            throw error;
          }
        } else {
          toast({ title: `Welkom bij "${pool.name}"! 🎉` });
        }

        navigate(`/app/pool/${pool.id}`);
      } catch (err: any) {
        toast({ title: "Fout", description: err.message, variant: "destructive" });
        navigate("/app/pool");
      }
    };

    join();
  }, [user, loading, code, navigate, poolInfo]);

  const hasTenant = poolInfo?.tenant_name;
  const logoSrc = poolInfo?.tenant_logo_url || goaltjeLogo;
  const primaryColor = poolInfo?.tenant_primary_color;
  const secondaryColor = poolInfo?.tenant_secondary_color;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        <Card className="border-0 shadow-elevation-3 overflow-hidden">
          {/* Branded gradient bar */}
          <div
            className="h-2"
            style={primaryColor
              ? { background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor || primaryColor})` }
              : undefined}
          >
            {!primaryColor && <div className="gradient-primary h-full w-full" />}
          </div>

          <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
              className="h-20 w-20 rounded-2xl flex items-center justify-center shadow-elevation-2 overflow-hidden"
              style={hasTenant
                ? { backgroundColor: "white", border: "1px solid hsl(var(--border))", padding: "8px" }
                : undefined}
            >
              {hasTenant ? (
                <img src={logoSrc} alt={poolInfo?.tenant_name || ""} className="h-full w-full object-contain" />
              ) : (
                <div className="h-full w-full gradient-navy rounded-2xl flex items-center justify-center">
                  <Trophy className="h-10 w-10 text-secondary" />
                </div>
              )}
            </motion.div>

            {/* Pool name */}
            {poolInfo ? (
              <>
                <div>
                  <h1 className="text-xl font-bold font-display">{poolInfo.name}</h1>
                  {hasTenant && (
                    <p
                      className="text-xs font-semibold uppercase tracking-wider mt-1"
                      style={{ color: primaryColor || undefined }}
                    >
                      {poolInfo.tenant_name}
                    </p>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Je wordt automatisch toegevoegd...</p>
              </>
            ) : (
              <>
                <Skeleton className="h-6 w-48" />
                <p className="text-muted-foreground text-sm">Deelnemen aan poule...</p>
              </>
            )}

            {/* Loading spinner */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full"
            />
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-[10px] text-muted-foreground mt-4">
          © 2026 RobertDev.nl – GOALTJE
        </p>
      </motion.div>
    </div>
  );
}