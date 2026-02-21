import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains("dark"));

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  const [name, setName] = useState("");
  const nameValue = name || profile?.name || "";

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Niet ingelogd");
      const { error } = await supabase
        .from("profiles")
        .update({ name: nameValue })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Profiel bijgewerkt!" });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" }),
  });

  const toggleDark = () => {
    document.documentElement.classList.toggle("dark");
    setIsDark(!isDark);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-6 text-center space-y-4">
        <h1 className="text-2xl font-bold font-display">Profiel</h1>
        <p className="text-muted-foreground">Log in om je profiel te bekijken.</p>
        <Link to="/auth">
          <Button className="gradient-primary text-primary-foreground">Inloggen</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
      <h1 className="text-2xl font-bold font-display">Profiel</h1>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Avatar + Name */}
        <Card className="border-0 shadow-xl overflow-hidden">
          <div className="gradient-primary h-20" />
          <CardContent className="pt-0 -mt-10 text-center space-y-4 pb-6">
            <div className="h-20 w-20 rounded-full gradient-primary mx-auto flex items-center justify-center text-3xl font-bold text-primary-foreground border-4 border-card">
              {(profile?.name || user.email || "?")[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-lg">{profile?.name || "Naamloos"}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Edit Name */}
      <Card className="border-0 shadow-md">
        <CardContent className="pt-4 space-y-3">
          <Label>Naam</Label>
          <Input
            value={nameValue}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jouw naam"
            className="h-12"
          />
          <Button
            className="w-full h-12 gradient-primary text-primary-foreground"
            onClick={() => updateProfile.mutate()}
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? "Opslaan..." : "Naam opslaan"}
          </Button>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card className="border-0 shadow-md">
        <CardContent className="pt-4 space-y-3">
          <Button
            variant="outline"
            className="w-full h-12 justify-start"
            onClick={toggleDark}
          >
            {isDark ? <Sun className="h-5 w-5 mr-3" /> : <Moon className="h-5 w-5 mr-3" />}
            {isDark ? "Licht thema" : "Donker thema"}
          </Button>
          <Button
            variant="outline"
            className="w-full h-12 justify-start text-destructive hover:text-destructive"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5 mr-3" /> Uitloggen
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
