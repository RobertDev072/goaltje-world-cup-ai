import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Moon, Sun, Shield, Camera, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [uploading, setUploading] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      return data === true;
    },
    enabled: !!user,
  });

  const [name, setName] = useState("");
  const nameValue = name || profile?.name || "";

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Niet ingelogd");
      const { error } = await supabase.from("profiles").update({ name: nameValue }).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Profiel bijgewerkt!" });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" }),
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Bestand te groot", description: "Maximaal 5 MB", variant: "destructive" });
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({ title: "Ongeldig bestand", description: "Upload een afbeelding (JPG, PNG, WebP)", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${ext}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // Update profile with avatar URL (add cache buster)
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: `${urlData.publicUrl}?t=${Date.now()}` })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      toast({ title: "Profielfoto bijgewerkt! 📸" });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch (err: any) {
      toast({ title: "Upload mislukt", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const toggleDark = () => {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-4 text-center space-y-4">
        <h1 className="text-2xl font-bold font-display">Profiel</h1>
        <p className="text-muted-foreground">Log in om je profiel te bekijken.</p>
        <Link to="/auth"><Button className="bg-primary text-primary-foreground">Inloggen</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-4 space-y-4">
      <h1 className="text-2xl font-bold font-display">Profiel</h1>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-xl overflow-hidden">
          <div className="bg-primary h-20" />
          <CardContent className="pt-0 -mt-10 text-center space-y-4 pb-6">
            {/* Avatar with upload */}
            <div className="relative inline-block">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="h-20 w-20 rounded-full object-cover mx-auto border-4 border-card"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-primary mx-auto flex items-center justify-center text-3xl font-bold text-primary-foreground border-4 border-card">
                  {(profile?.name || user.email || "?")[0].toUpperCase()}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
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
          <Input value={nameValue} onChange={(e) => setName(e.target.value)} placeholder="Jouw naam" className="h-12" />
          <Button className="w-full h-12 bg-primary text-primary-foreground" onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}>
            {updateProfile.isPending ? "Opslaan..." : "Naam opslaan"}
          </Button>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card className="border-0 shadow-md">
        <CardContent className="pt-4 space-y-3">
          {isAdmin && (
            <Link to="/admin">
              <Button variant="outline" className="w-full h-12 justify-start gap-3">
                <Shield className="h-5 w-5 text-primary" /> Developer Dashboard
              </Button>
            </Link>
          )}
          <Button variant="outline" className="w-full h-12 justify-start" onClick={toggleDark}>
            {isDark ? <Sun className="h-5 w-5 mr-3" /> : <Moon className="h-5 w-5 mr-3" />}
            {isDark ? "Licht thema" : "Donker thema"}
          </Button>
          <Button variant="outline" className="w-full h-12 justify-start text-destructive hover:text-destructive" onClick={handleSignOut}>
            <LogOut className="h-5 w-5 mr-3" /> Uitloggen
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
