import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Trophy, Gift, Users, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface QualifiedRow {
  user_id: string;
  name: string | null;
  email: string | null;
  active_referrals: number;
  global_points: number;
}

export function PrizePanel({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient();

  const { data: qualified, isLoading } = useQuery({
    queryKey: ["admin-prize-qualified"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_qualified_for_prize");
      if (error) throw error;
      return (data || []) as QualifiedRow[];
    },
    enabled,
    staleTime: 30_000,
  });

  const awardTop20 = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("award_global_top20_bonus");
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      toast({
        title: "Top-20 bonus verdeeld",
        description: `${count} gebruiker(s) kregen +50 punten in de globale poel.`,
      });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-prize-qualified"] });
    },
    onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      {/* Top-20 bonus action */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <h3 className="font-display font-semibold text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-secondary" />
            Top-20 globaal bonus verdelen
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Kent +50 punten toe aan de top 20 van de globale poel. Run dit pas
            na de finale, anders verandert de top nog. Idempotent — eerdere
            toekenning wordt overschreven.
          </p>
          <Button
            size="sm"
            className="w-full gradient-primary text-primary-foreground"
            onClick={() => awardTop20.mutate()}
            disabled={awardTop20.isPending}
          >
            {awardTop20.isPending ? "Toekennen..." : "Verdeel +50 aan top 20"}
          </Button>
        </CardContent>
      </Card>

      {/* Qualified for prize list */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-2">
          <h3 className="font-display font-semibold text-sm flex items-center gap-2">
            <Trophy className="h-4 w-4 text-secondary" />
            Gekwalificeerd voor shirt-prijs
            {qualified && (
              <Badge variant="outline" className="text-[10px]">{qualified.length}</Badge>
            )}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Lijst van iedereen met ≥5 actieve referrals, gesorteerd op globale-poel score.
            De #1 wint het shirt.
          </p>
          {isLoading ? (
            <Skeleton className="h-24 rounded-md" />
          ) : (qualified?.length ?? 0) === 0 ? (
            <p className="text-xs text-muted-foreground py-3 text-center">
              Nog niemand gekwalificeerd.
            </p>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
              {qualified!.map((q, i) => (
                <div
                  key={q.user_id}
                  className={`flex items-center gap-2 p-2 rounded-md text-xs ${
                    i === 0 ? "bg-secondary/15 ring-1 ring-secondary/30" : "hover:bg-muted/50"
                  }`}
                >
                  <span className="font-bold w-6 text-center">
                    {i === 0 ? <Gift className="h-4 w-4 text-secondary inline" /> : `#${i + 1}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{q.name || "Onbekend"}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{q.email}</p>
                  </div>
                  <span className="text-[10px] flex items-center gap-0.5 text-muted-foreground">
                    <Users className="h-3 w-3" /> {q.active_referrals}
                  </span>
                  <span className="font-mono font-bold tabular-nums">{q.global_points}p</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
