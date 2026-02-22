import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Plus, LogIn, Users, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { trackPoolCreated, trackPoolJoined } from "@/lib/analytics";

export default function Pool() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [poolName, setPoolName] = useState("");
  const [poolDesc, setPoolDesc] = useState("");
  const [prizeText, setPrizeText] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const { data: pools } = useQuery({
    queryKey: ["my-pools", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("pool_members")
        .select("pool_id, role, pools(id, name, invite_code, created_by)")
        .eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
  });

  const createPool = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Niet ingelogd");
      const insertData: any = { name: poolName, created_by: user.id };
      if (poolDesc.trim()) insertData.description = poolDesc;
      if (prizeText.trim()) insertData.prize_text = prizeText;
      
      const { data: pool, error } = await supabase
        .from("pools")
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      await supabase.from("pool_members").insert({
        pool_id: pool.id,
        user_id: user.id,
        role: "admin",
      });
      return pool;
    },
    onSuccess: (pool) => {
      trackPoolCreated();
      toast({ title: "Poule aangemaakt! 🎉" });
      setPoolName(""); setPoolDesc(""); setPrizeText("");
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ["my-pools"] });
    },
    onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" }),
  });

  const joinPool = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Niet ingelogd");
      const { data: pool, error: findError } = await supabase
        .from("pools")
        .select("id")
        .eq("invite_code", joinCode.toUpperCase().trim())
        .single();
      if (findError || !pool) throw new Error("Deze code bestaat niet. Controleer en probeer opnieuw.");
      const { error } = await supabase.from("pool_members").insert({
        pool_id: pool.id,
        user_id: user.id,
        role: "member",
      });
      if (error) {
        if (error.code === "23505") throw new Error("Je zit al in deze poule!");
        throw error;
      }
      return pool;
    },
    onSuccess: (pool) => {
      trackPoolJoined();
      toast({ title: "Je bent lid! 🎉" });
      setJoinCode("");
      setShowJoin(false);
      queryClient.invalidateQueries({ queryKey: ["my-pools"] });
    },
    onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" }),
  });

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-6 text-center space-y-4">
        <h1 className="text-2xl font-bold font-display">Poules</h1>
        <p className="text-muted-foreground">Log in om poules te maken en mee te doen.</p>
        <Link to="/auth">
          <Button className="gradient-primary text-primary-foreground">Inloggen</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display">Poules</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setShowJoin(!showJoin); setShowCreate(false); }}>
            <LogIn className="h-4 w-4 mr-1" /> Join
          </Button>
          <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => { setShowCreate(!showCreate); setShowJoin(false); }}>
            <Plus className="h-4 w-4 mr-1" /> Nieuw
          </Button>
        </div>
      </div>

      {/* Create Pool Form */}
      {showCreate && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-4 space-y-3">
              <Input placeholder="Naam van de poule *" value={poolName} onChange={(e) => setPoolName(e.target.value)} className="h-12" />
              <Textarea placeholder="Beschrijving (optioneel)" value={poolDesc} onChange={(e) => setPoolDesc(e.target.value)} rows={2} />
              <Input placeholder="Prijs (optioneel, bijv. '€50 cadeaubon')" value={prizeText} onChange={(e) => setPrizeText(e.target.value)} className="h-12" />
              <Button
                className="w-full h-12 gradient-primary text-primary-foreground"
                disabled={!poolName.trim() || createPool.isPending}
                onClick={() => createPool.mutate()}
              >
                {createPool.isPending ? "Aanmaken..." : "Poule aanmaken"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Join Pool Form */}
      {showJoin && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-4 space-y-3">
              <Input
                placeholder="Voer invite code in"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="h-12 text-center text-lg font-mono tracking-widest"
                maxLength={8}
              />
              <Button
                className="w-full h-12 gradient-primary text-primary-foreground"
                disabled={joinCode.length < 4 || joinPool.isPending}
                onClick={() => joinPool.mutate()}
              >
                {joinPool.isPending ? "Deelnemen..." : "Deelnemen"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Pool List */}
      {pools && pools.length > 0 ? (
        <div className="space-y-3">
          {pools.map((membership: any, i: number) => (
            <motion.div key={membership.pool_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link to={`/pool/${membership.pool_id}`}>
                <Card className="border-0 shadow-md hover:shadow-lg transition-all">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
                        <Trophy className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold">{membership.pools?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {membership.role === "admin" ? "👑 Owner" : "Lid"} · Code: {membership.pools?.invite_code}
                        </p>
                      </div>
                    </div>
                    <span className="text-muted-foreground">→</span>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-md">
          <CardContent className="p-8 text-center space-y-3">
            <Users className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground">Je zit nog in geen poule</p>
            <p className="text-sm text-muted-foreground">Maak er een aan of gebruik een invite code!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
