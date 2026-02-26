import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, Check, Trophy, Clock, Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { PoolSelector } from "./PoolSelector";

export function BonusQuestions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const { data: questions, isLoading } = useQuery({
    queryKey: ["bonus-questions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bonus_questions")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: pools } = useQuery({
    queryKey: ["my-pools", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("pool_members")
        .select("pool_id, pools(id, name)")
        .eq("user_id", user.id);
      return data?.map((m: any) => m.pools).filter(Boolean) || [];
    },
    enabled: !!user,
  });

  const activePool = selectedPoolId || (pools && pools.length > 0 ? pools[0].id : "");

  const { data: myPredictions } = useQuery({
    queryKey: ["bonus-predictions", user?.id, activePool],
    queryFn: async () => {
      if (!user || !activePool) return [];
      const { data } = await supabase
        .from("bonus_predictions")
        .select("*")
        .eq("user_id", user.id)
        .eq("pool_id", activePool);
      return data || [];
    },
    enabled: !!user && !!activePool,
  });

  const { data: teams } = useQuery({
    queryKey: ["all-teams"],
    queryFn: async () => {
      const { data } = await supabase.from("teams").select("*").order("name");
      return data || [];
    },
  });

  const predictionMap = useMemo(() => {
    const map = new Map<string, any>();
    myPredictions?.forEach((p: any) => map.set(p.question_id, p));
    return map;
  }, [myPredictions]);

  const savePrediction = useMutation({
    mutationFn: async ({ questionId, answer }: { questionId: string; answer: string }) => {
      if (!user || !activePool) throw new Error("Niet ingelogd of geen poule geselecteerd");
      const existing = predictionMap.get(questionId);
      if (existing) {
        const { error } = await supabase
          .from("bonus_predictions")
          .update({ answer, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("bonus_predictions")
          .insert({
            user_id: user.id,
            pool_id: activePool,
            question_id: questionId,
            answer,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Opgeslagen! ✅" });
      queryClient.invalidateQueries({ queryKey: ["bonus-predictions"] });
    },
    onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" }),
  });

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;

  const getQuestionEmoji = (type: string) => {
    switch (type) {
      case "team": return "🏆";
      case "player": return "⚽";
      case "number": return "🔢";
      default: return "❓";
    }
  };

  return (
    <div className="space-y-4">
      {/* Pool selector */}
      {user && pools && pools.length > 0 && (
        <PoolSelector value={selectedPoolId} onChange={setSelectedPoolId} />
      )}

      {/* Info card */}
      <Card className="border-0 shadow-elevation-1 bg-secondary/5">
        <CardContent className="p-3 flex items-start gap-2">
          <Star className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Bonusvragen</p>
            <p>Vul in vóór de eerste wedstrijd. Punten worden aan het einde van het toernooi toegekend.</p>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      {questions && questions.map((q: any, i: number) => {
        const isLocked = new Date() >= new Date(q.closes_at);
        const existing = predictionMap.get(q.id);
        const currentAnswer = answers[q.id] || existing?.answer || "";
        const hasAnswer = !!existing?.answer;
        const pointsAwarded = existing?.points_awarded || 0;
        const correctAnswer = q.correct_answer;

        return (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className={cn(
              "border-0 shadow-elevation-1 overflow-hidden",
              hasAnswer && "ring-1 ring-primary/20",
              correctAnswer && pointsAwarded > 0 && "shadow-glow-success"
            )}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xl">{getQuestionEmoji(q.type)}</span>
                    <div>
                      <p className="font-semibold text-sm">{q.question}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {q.points} punten · Sluit {new Date(q.closes_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}
                      </p>
                    </div>
                  </div>
                  {isLocked && (
                    <Badge variant="outline" className="text-[10px] gap-1 shrink-0">
                      <Lock className="h-2.5 w-2.5" /> Gesloten
                    </Badge>
                  )}
                  {hasAnswer && !isLocked && (
                    <Badge className="text-[10px] bg-primary/10 text-primary hover:bg-primary/10 gap-1 shrink-0">
                      <Check className="h-2.5 w-2.5" /> Ingevuld
                    </Badge>
                  )}
                </div>

                {/* Answer input */}
                {q.type === "team" ? (
                  <Select
                    value={currentAnswer}
                    onValueChange={(val) => setAnswers(prev => ({ ...prev, [q.id]: val }))}
                    disabled={isLocked}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Kies een team..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      {teams?.map((team: any) => (
                        <SelectItem key={team.id} value={team.name}>
                          <span className="flex items-center gap-2">
                            <span>{team.flag_url || "🏳️"}</span>
                            <span>{team.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder={q.type === "player" ? "Naam van de speler..." : "Voer een getal in..."}
                    type={q.type === "number" ? "number" : "text"}
                    value={currentAnswer}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    disabled={isLocked}
                    className="h-10"
                  />
                )}

                {/* Save button */}
                {!isLocked && currentAnswer && currentAnswer !== existing?.answer && (
                  <Button
                    size="sm"
                    className="w-full gradient-primary text-primary-foreground h-9"
                    onClick={() => savePrediction.mutate({ questionId: q.id, answer: currentAnswer })}
                    disabled={savePrediction.isPending}
                  >
                    {savePrediction.isPending ? "Opslaan..." : hasAnswer ? "Bijwerken" : "Opslaan"}
                  </Button>
                )}

                {/* Result (when tournament ends) */}
                {correctAnswer && (
                  <div className={cn(
                    "rounded-lg p-2 text-xs text-center",
                    pointsAwarded > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    <p>Antwoord: <strong>{correctAnswer}</strong></p>
                    {hasAnswer && (
                      <p className="font-bold mt-0.5">
                        {pointsAwarded > 0 ? `+${pointsAwarded} punten! 🎉` : "Helaas, fout"}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}

      {!user && (
        <Card className="border-0 shadow-elevation-1">
          <CardContent className="p-6 text-center text-muted-foreground text-sm">
            Log in om bonusvragen te beantwoorden
          </CardContent>
        </Card>
      )}
    </div>
  );
}
