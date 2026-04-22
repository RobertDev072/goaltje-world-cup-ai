import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys, staleTimes } from "@/lib/queryKeys";

interface PredictorProfileProps {
  userId: string;
}

interface ProfileData {
  totalPredictions: number;
  finishedCount: number;
  avgGoals: number;
  drawRatePct: number;
  exactCount: number;
  correctCount: number;
  accuracyPct: number;
  currentStreak: number;
  profile: {
    type: string;
    label: string;
    emoji: string;
    description: string;
  };
}

export function PredictorProfile({ userId }: PredictorProfileProps) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.predictorProfile(userId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_predictor_profile", {
        _user_id: userId,
      });
      if (error) throw error;
      return data as unknown as ProfileData;
    },
    enabled: !!userId,
    staleTime: staleTimes.stats,
  });

  if (isLoading) {
    return <Skeleton className="h-36 rounded-2xl" />;
  }

  if (!data) return null;

  const { profile, avgGoals, drawRatePct, exactCount, currentStreak, accuracyPct, finishedCount } = data;

  return (
    <Card className="border-0 shadow-elevation-3 overflow-hidden text-white">
      <div className="gradient-navy">
        <div className="p-5">
          <p className="text-[10px] opacity-70 uppercase tracking-widest">Jouw voorspel-profiel</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-4xl">{profile.emoji}</span>
            <div>
              <p className="text-xl font-display font-black">{profile.label}</p>
              <p className="text-[11px] opacity-85">{profile.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-5 text-center">
            <div>
              <p className="text-xl font-bold font-display tabular-nums">{avgGoals}</p>
              <p className="text-[10px] opacity-70">Gem. goals</p>
            </div>
            <div>
              <p className="text-xl font-bold font-display tabular-nums">{drawRatePct}%</p>
              <p className="text-[10px] opacity-70">Gelijkspel</p>
            </div>
            <div>
              <p className="text-xl font-bold font-display tabular-nums">{exactCount}</p>
              <p className="text-[10px] opacity-70">Exact</p>
            </div>
          </div>
        </div>

        {/* Extra badges row — alleen tonen als er iets interessants is */}
        {(currentStreak >= 2 || (finishedCount >= 5 && accuracyPct >= 60)) && (
          <CardContent className="bg-black/20 px-5 py-2.5 flex items-center gap-2 flex-wrap text-[11px]">
            {currentStreak >= 2 && (
              <span className="bg-destructive/30 text-white rounded-full px-2.5 py-0.5 font-medium">
                🔥 {currentStreak} op rij
              </span>
            )}
            {finishedCount >= 5 && accuracyPct >= 60 && (
              <span className="bg-success/30 text-white rounded-full px-2.5 py-0.5 font-medium">
                ✨ {accuracyPct}% accuraat ({finishedCount} matches)
              </span>
            )}
          </CardContent>
        )}
      </div>
    </Card>
  );
}
