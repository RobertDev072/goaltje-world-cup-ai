import { useMemo, useState } from "react";
import { MatchCard } from "./MatchCard";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const UPCOMING_PAGE_SIZE = 10;
const PAST_PAGE_SIZE = 10;

interface MatchSectionsProps {
  matches: any[];
  predictions?: Map<string, any>;
  showPredictions?: boolean;
}

function isSameDay(d1: Date, d2: Date) {
  return d1.toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam" }) ===
         d2.toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam" });
}

export function MatchSections({ matches, predictions, showPredictions = true }: MatchSectionsProps) {
  const [pastOpen, setPastOpen] = useState(false);
  const [upcomingVisible, setUpcomingVisible] = useState(UPCOMING_PAGE_SIZE);
  const [pastVisible, setPastVisible] = useState(PAST_PAGE_SIZE);
  const now = new Date();

  const { today, upcoming, past } = useMemo(() => {
    const today: any[] = [];
    const upcoming: any[] = [];
    const past: any[] = [];

    matches.forEach((m) => {
      const kickoff = new Date(m.kickoff_utc);
      if (m.status === "finished") {
        past.push(m);
      } else if (m.status === "live" || isSameDay(kickoff, now)) {
        today.push(m);
      } else if (kickoff > now) {
        upcoming.push(m);
      } else {
        past.push(m);
      }
    });

    past.sort((a, b) => new Date(b.kickoff_utc).getTime() - new Date(a.kickoff_utc).getTime());
    
    return { today, upcoming, past };
  }, [matches]);

  const visibleUpcoming = upcoming.slice(0, upcomingVisible);
  const visiblePast = past.slice(0, pastVisible);
  const hasMoreUpcoming = upcomingVisible < upcoming.length;
  const hasMorePast = pastVisible < past.length;

  const renderSection = (title: string, icon: string, items: any[], color: string, startIndex = 0) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className={cn("h-2 w-2 rounded-full", color)} />
          <h3 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            {icon} {title}
          </h3>
          <span className="text-xs text-muted-foreground/60">({items.length})</span>
        </div>
        {items.map((match, i) => (
          <MatchCard
            key={match.id}
            match={match}
            prediction={showPredictions ? predictions?.get(match.id) : undefined}
            index={startIndex + i}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Live / Today */}
      {renderSection("Vandaag", "🔵", today, "bg-primary")}

      {/* Upcoming — paginated */}
      {upcoming.length > 0 && (
        <div className="space-y-3">
          {renderSection("Eerstvolgende", "🟡", visibleUpcoming, "bg-secondary", today.length)}
          {hasMoreUpcoming && (
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl text-xs h-9 border-dashed"
              onClick={() => setUpcomingVisible((v) => v + UPCOMING_PAGE_SIZE)}
            >
              Meer laden ({upcoming.length - upcomingVisible} over)
            </Button>
          )}
        </div>
      )}

      {/* Past - Collapsible + paginated */}
      {past.length > 0 && (
        <Collapsible open={pastOpen} onOpenChange={setPastOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full group">
            <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
            <h3 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              ⚪ Afgelopen
            </h3>
            <span className="text-xs text-muted-foreground/60">({past.length})</span>
            <div className="flex-1" />
            {pastOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <motion.div
              className="space-y-3 mt-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {visiblePast.map((match, i) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  prediction={showPredictions ? predictions?.get(match.id) : undefined}
                  index={i}
                />
              ))}
              {hasMorePast && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl text-xs h-9 border-dashed"
                  onClick={() => setPastVisible((v) => v + PAST_PAGE_SIZE)}
                >
                  Meer laden ({past.length - pastVisible} over)
                </Button>
              )}
            </motion.div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {today.length === 0 && upcoming.length === 0 && past.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Geen wedstrijden gevonden
        </div>
      )}
    </div>
  );
}
