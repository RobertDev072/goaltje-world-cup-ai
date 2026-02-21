import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function JoinPool() {
  const { code } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      // Store code and redirect to auth
      sessionStorage.setItem("joinCode", code || "");
      navigate("/auth");
      return;
    }

    const join = async () => {
      try {
        const { data: pool, error: findError } = await supabase
          .from("pools")
          .select("id, name")
          .eq("invite_code", code!.toUpperCase())
          .single();

        if (findError || !pool) {
          toast({ title: "Poule niet gevonden", variant: "destructive" });
          navigate("/pool");
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

        navigate(`/pool/${pool.id}`);
      } catch (err: any) {
        toast({ title: "Fout", description: err.message, variant: "destructive" });
        navigate("/pool");
      }
    };

    join();
  }, [user, loading, code, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <Skeleton className="h-8 w-48 mx-auto" />
        <p className="text-muted-foreground">Deelnemen aan poule...</p>
      </div>
    </div>
  );
}
