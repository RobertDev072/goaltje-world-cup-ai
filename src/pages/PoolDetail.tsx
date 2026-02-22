import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, Share2, Trophy, Users, MessageCircle, Link2 } from "lucide-react";
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
        .select("*, profile:profiles(name, avatar_url)")
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
        .select("user_id, points_awarded")
        .eq("pool_id", id!);

      if (!data) return [];
      const userPoints: Record<string, number> = {};
      data.forEach((p: any) => {
        userPoints[p.user_id] = (userPoints[p.user_id] || 0) + (p.points_awarded || 0);
      });

      // Get profiles for these users
      const userIds = Object.keys(userPoints);
      if (userIds.length === 0) return [];
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);
      
      const profileMap: Record<string, any> = {};
      profiles?.forEach((p: any) => { profileMap[p.user_id] = p; });

      return Object.entries(userPoints)
        .map(([userId, points]) => ({
          userId,
          name: profileMap[userId]?.name || "Onbekend",
          points,
        }))
        .sort((a, b) => b.points - a.points);
    },
    enabled: !!id,
  });

  const poolLink = `${window.location.origin}/join/${pool?.invite_code}`;
  const shareText = `Doe mee met mijn WK 2026 poule "${pool?.name}" op Goaltje! 🏆⚽\n\nCode: ${pool?.invite_code}\n${poolLink}`;

  const copyLink = () => {
    navigator.clipboard.writeText(poolLink);
    toast({ title: "Link gekopieerd! 📋" });
  };

  const copyCode = () => {
    if (pool?.invite_code) {
      navigator.clipboard.writeText(pool.invite_code);
      toast({ title: "Code gekopieerd! 📋" });
    }
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Goaltje - ${pool?.name}`, text: shareText, url: poolLink });
      } catch {}
    } else {
      copyLink();
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

  const isOwner = user?.id === pool.created_by;

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-4 pb-8">
      <Link to="/pool" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
        <ArrowLeft className="h-4 w-4" /> Terug
      </Link>

      {/* Pool Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-xl overflow-hidden">
          <div className="gradient-primary p-1" />
          <CardContent className="p-6 text-center space-y-4">
            <h1 className="text-2xl font-bold font-display">{pool.name}</h1>
            {(pool as any).description && (
              <p className="text-sm text-muted-foreground">{(pool as any).description}</p>
            )}
            {(pool as any).prize_text && (
              <div className="bg-secondary/10 rounded-xl p-3">
                <p className="text-xs text-muted-foreground">🏆 Prijs</p>
                <p className="font-semibold text-secondary text-sm">{(pool as any).prize_text}</p>
              </div>
            )}

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
                <div className="bg-white p-2 rounded-lg">
                  <QRCodeSVG value={poolLink} size={120} />
                </div>
              </div>

              {/* Share buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-11 gap-2" onClick={shareWhatsApp}>
                  <MessageCircle className="h-4 w-4 text-primary" /> WhatsApp
                </Button>
                <Button variant="outline" className="h-11 gap-2" onClick={copyLink}>
                  <Link2 className="h-4 w-4" /> Kopieer link
                </Button>
              </div>
              <Button variant="outline" className="w-full h-11 gap-2" onClick={shareNative}>
                <Share2 className="h-4 w-4" /> Delen...
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="leaderboard" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="leaderboard">🏆 Ranglijst</TabsTrigger>
          <TabsTrigger value="members">👥 Leden ({members?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="mt-4 space-y-2">
          {leaderboard && leaderboard.length > 0 ? (
            leaderboard.map((entry: any, i: number) => (
              <motion.div key={entry.userId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-3 flex items-center gap-3">
                    <span className={`text-lg font-bold font-display w-8 text-center ${
                      i === 0 ? "text-secondary" : i === 1 ? "text-muted-foreground" : i === 2 ? "text-orange-600" : "text-muted-foreground"
                    }`}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                    </span>
                    <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                      {entry.name[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {entry.name} {entry.userId === user?.id && <span className="text-primary">(jij)</span>}
                      </p>
                    </div>
                    <span className="font-bold text-primary text-lg">{entry.points}</span>
                    <span className="text-xs text-muted-foreground">pt</span>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 text-center text-muted-foreground text-sm">
                Nog geen voorspellingen. Ga naar Matches om te beginnen! ⚽
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
                    {member.role === "admin" ? "👑 Owner" : "Lid"}
                  </p>
                </div>
                {member.user_id === user?.id && (
                  <Badge variant="outline" className="text-xs">Jij</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
