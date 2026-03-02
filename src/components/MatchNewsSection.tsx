import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper } from "lucide-react";
import { motion } from "framer-motion";
import { staleTimes } from "@/lib/queryKeys";

interface Props {
  homeTeamName: string;
  awayTeamName: string;
  matchDate: string;
  stage: string;
  group: string | null;
}

export default function MatchNewsSection({ homeTeamName, awayTeamName, matchDate, stage, group }: Props) {
  const { data: matchNews, isLoading } = useQuery({
    queryKey: ["match-news", homeTeamName, awayTeamName],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("match-news", {
        body: {
          homeTeam: homeTeamName,
          awayTeam: awayTeamName,
          matchDate,
          stage,
          group,
        },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 4 * staleTimes.stats,
    retry: 1,
  });

  if (isLoading) return <Skeleton className="h-24 rounded-xl" />;
  if (!matchNews?.articles?.length) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-0 shadow-lg">
        <CardContent className="p-5">
          <h3 className="font-display font-semibold text-base mb-3 flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-primary" /> Wedstrijd Inzichten
          </h3>
          {matchNews.articles.map((article: any, i: number) => (
            <div key={i} className="mb-3 last:mb-0">
              <p className="text-sm font-semibold">{article.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{article.summary}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}
