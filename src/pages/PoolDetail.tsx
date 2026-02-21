import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Copy, Share2, Trophy, Users } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";

export default function PoolDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const { data: pool, isLoading } = useQuery({
    queryKey: ["pool", id],
    queryFn: async () => {
      const { data } = await supabase.from("pools").select("*").eq("id", id!).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: members } = useQuery({
    queryKey: ["pool-members", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("pool_members")
        .select("*, profile:profiles!pool_members_user_id_fkey(*)")
        .eq("pool_id", id!)
        .order("joined_at", { ascending: true });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: leaderboard } = useQuery({
    queryKey: ["leaderboard", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("predictions")
        .select("user_id, points_awarded, profile:profiles!predictions_user_id_fkey(name, avatar_url)")
        .eq("pool_id", id!);

      if (!data) return [];
      // Aggregate points per user
      const userPoints: Record<string, { name: string; points: number }> = {};
      data.forEach((p: any) => {
        if (!userPoints[p.user_id]) {
          userPoints[p.user_id] = { name: p.profile?.name || "Onbekend", points: 0 };
        }
        userPoints[p.user_id].points += p.points_awarded || 0;
      });
      return Object.entries(userPoints)
        .map(([userId, data]) => ({ userId, ...data }))
        .sort((a, b) => b.points - a.points);
    },
    enabled: !!id,
  });

  const copyCode = () => {
    if (pool?.invite_code) {
      navigator.clipboard.writeText(pool.invite_code);
      toast({ title: "Code gekopieerd! 📋" });
    }
  };

  const shareWhatsApp = () => {
    if (pool) {
      const url = `${window.location.origin}/join/${pool.invite_code}`;
      const text = `Doe mee met mijn WK 2026 poule "${pool.name}" op Goaltje! 🏆⚽\n\nCode: ${pool.invite_code}\n${url}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-6 text-center">
        <p className="text-muted-foreground">Poule niet gevonden</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
      <Link to="/pool" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
        <ArrowLeft className="h-4 w-4" /> Terug
      </Link>

      {/* Pool Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-xl overflow-hidden">
          <div className="gradient-primary p-1" />
          <CardContent className="p-6 text-center space-y-4">
            <h1 className="text-2xl font-bold font-display">{pool.name}</h1>

            {/* Invite Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                <code className="text-2xl font-mono font-bold tracking-widest text-primary">
                  {pool.invite_code}
                </code>
                <Button size="icon" variant="ghost" onClick={copyCode}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex justify-center">
                <QRCodeSVG
                  value={`${window.location.origin}/join/${pool.invite_code}`}
                  size={120}
                  className="rounded-lg"
                />
              </div>

              <Button
                variant="outline"
                className="w-full h-12"
                onClick={shareWhatsApp}
              >
                <Share2 className="h-4 w-4 mr-2" /> Delen via WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="leaderboard" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="leaderboard">🏆 Ranglijst</TabsTrigger>
          <TabsTrigger value="members">👥 Leden</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="mt-4 space-y-2">
          {leaderboard && leaderboard.length > 0 ? (
            leaderboard.map((entry: any, i: number) => (
              <Card key={entry.userId} className="border-0 shadow-sm">
                <CardContent className="p-3 flex items-center gap-3">
                  <span className={`text-lg font-bold font-display w-8 ${
                    i === 0 ? "text-secondary" : i === 1 ? "text-muted-foreground" : i === 2 ? "text-orange-600" : "text-muted-foreground"
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {entry.name} {entry.userId === user?.id && "(jij)"}
                    </p>
                  </div>
                  <span className="font-bold text-primary">{entry.points} pt</span>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 text-center text-muted-foreground text-sm">
                Nog geen voorspellingen gedaan. Doe je voorspellingen bij de wedstrijden!
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="members" className="mt-4 space-y-2">
          {members?.map((member: any) => (
            <Card key={member.id} className="border-0 shadow-sm">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                  {(member.profile?.name || "?")[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{member.profile?.name || "Onbekend"}</p>
                  <p className="text-xs text-muted-foreground">
                    {member.role === "admin" ? "👑 Admin" : "Lid"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
