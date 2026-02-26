import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronRight, Trophy, Target } from "lucide-react";
import { calculateGroupStandings, rankThirdPlaceTeams, type GroupStanding } from "./ThirdPlaceSimulator";

/**
 * WK 2026 Bracket Structure (48 teams → 32 in knockout)
 * Groups A-L: Top 2 + Best 8 of 12 third-place teams
 * 
 * R32 matchups (simplified FIFA proposed format):
 * Top half: A1vC3, B1vD3, C1vE3, D1vF3, E1vA2, F1vB2, G1vC2, H1vD2
 * Bottom half: I1vG3, J1vH3, K1vI3, L1vJ3, I2vE2, J2vF2, K2vG2, L2vH2
 * 
 * Note: 3rd place matchups depend on which groups' 3rd place teams qualify
 */

// Simplified bracket structure: for each group position, show which side of the bracket
const BRACKET_PATHS: Record<string, { r32Opponent: string; qfPath: string; sfPath: string }> = {
  "A1": { r32Opponent: "3e plaats", qfPath: "Winnaar E1 lijn", sfPath: "Bovenste helft" },
  "A2": { r32Opponent: "E1", qfPath: "Winnaar A1 lijn", sfPath: "Bovenste helft" },
  "B1": { r32Opponent: "3e plaats", qfPath: "Winnaar F1 lijn", sfPath: "Bovenste helft" },
  "B2": { r32Opponent: "F1", qfPath: "Winnaar B1 lijn", sfPath: "Bovenste helft" },
  "C1": { r32Opponent: "3e plaats", qfPath: "Winnaar G1 lijn", sfPath: "Bovenste helft" },
  "C2": { r32Opponent: "G1", qfPath: "Winnaar C1 lijn", sfPath: "Bovenste helft" },
  "D1": { r32Opponent: "3e plaats", qfPath: "Winnaar H1 lijn", sfPath: "Bovenste helft" },
  "D2": { r32Opponent: "H1", qfPath: "Winnaar D1 lijn", sfPath: "Bovenste helft" },
  "E1": { r32Opponent: "A2", qfPath: "Winnaar A1 lijn", sfPath: "Bovenste helft" },
  "F1": { r32Opponent: "B2", qfPath: "Winnaar B1 lijn", sfPath: "Bovenste helft" },
  "G1": { r32Opponent: "C2", qfPath: "Winnaar C1 lijn", sfPath: "Onderste helft" },
  "H1": { r32Opponent: "D2", qfPath: "Winnaar D1 lijn", sfPath: "Onderste helft" },
  "I1": { r32Opponent: "3e plaats", qfPath: "Winnaar I2 lijn", sfPath: "Onderste helft" },
  "I2": { r32Opponent: "E2", qfPath: "Winnaar I1 lijn", sfPath: "Onderste helft" },
  "J1": { r32Opponent: "3e plaats", qfPath: "Winnaar J2 lijn", sfPath: "Onderste helft" },
  "J2": { r32Opponent: "F2", qfPath: "Winnaar J1 lijn", sfPath: "Onderste helft" },
  "K1": { r32Opponent: "3e plaats", qfPath: "Winnaar K2 lijn", sfPath: "Onderste helft" },
  "K2": { r32Opponent: "G2", qfPath: "Winnaar K1 lijn", sfPath: "Onderste helft" },
  "L1": { r32Opponent: "3e plaats", qfPath: "Winnaar L2 lijn", sfPath: "Onderste helft" },
  "L2": { r32Opponent: "H2", qfPath: "Winnaar L1 lijn", sfPath: "Onderste helft" },
};

const STAGES = [
  { key: "r32", label: "Ronde van 32", emoji: "⚔️" },
  { key: "r16", label: "Achtste finales", emoji: "🎯" },
  { key: "qf", label: "Kwartfinales", emoji: "🔥" },
  { key: "sf", label: "Halve finales", emoji: "⭐" },
  { key: "final", label: "Finale", emoji: "🏆" },
];

interface RouteToFinalProps {
  matches: any[];
}

export function RouteToFinal({ matches }: RouteToFinalProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  const groups = useMemo(() => calculateGroupStandings(matches), [matches]);
  const thirdPlaceTeams = useMemo(() => rankThirdPlaceTeams(groups), [groups]);

  // Get all teams from groups
  const allTeams = useMemo(() => {
    const teams: { id: string; name: string; shortName: string; flagUrl: string; group: string; position: number }[] = [];
    groups.forEach((teamList, groupLetter) => {
      teamList.forEach((team, i) => {
        teams.push({
          id: team.teamId,
          name: team.teamName,
          shortName: team.shortName,
          flagUrl: team.flagUrl,
          group: groupLetter,
          position: i + 1,
        });
      });
    });
    return teams.sort((a, b) => a.name.localeCompare(b.name));
  }, [groups]);

  const selectedTeam = allTeams.find(t => t.id === selectedTeamId);

  const route = useMemo(() => {
    if (!selectedTeam) return null;
    const pos = selectedTeam.position;
    const grp = selectedTeam.group;

    // Check if team qualifies
    if (pos > 3) return { qualifies: false, reason: "4e in groep — uitgeschakeld" };
    if (pos === 3) {
      const thirdIdx = thirdPlaceTeams.findIndex(t => t.teamId === selectedTeam.id);
      if (thirdIdx >= 8 || thirdIdx < 0) return { qualifies: false, reason: "3e in groep, maar niet bij de beste 8 — uitgeschakeld" };
    }

    const bracketKey = `${grp}${pos}`;
    const path = BRACKET_PATHS[bracketKey];
    if (!path) {
      return {
        qualifies: true,
        reason: pos <= 2 ? `${pos}e in Groep ${grp} — door naar knock-out` : `Beste 3e plaats — door naar knock-out`,
        stages: STAGES.map(s => ({
          ...s,
          opponent: "Wordt bepaald",
          description: "Route nog niet vastgesteld"
        }))
      };
    }

    return {
      qualifies: true,
      reason: pos <= 2 ? `${pos}e in Groep ${grp} — door naar knock-out` : `Beste 3e plaats — door naar knock-out`,
      stages: [
        { ...STAGES[0], opponent: path.r32Opponent, description: `als ${pos}e van Groep ${grp}` },
        { ...STAGES[1], opponent: "Winnaar andere R32", description: path.qfPath },
        { ...STAGES[2], opponent: "Winnaar R16", description: path.qfPath },
        { ...STAGES[3], opponent: "Winnaar KF", description: path.sfPath },
        { ...STAGES[4], opponent: "Winnaar andere HF", description: "De grote finale 🏆" },
      ]
    };
  }, [selectedTeam, thirdPlaceTeams]);

  return (
    <div className="space-y-4">
      {/* Team Selector */}
      <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
        <SelectTrigger className="h-12 text-base">
          <SelectValue placeholder="🔍 Kies een team..." />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {allTeams.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              <span className="flex items-center gap-2">
                <span>{team.flagUrl}</span>
                <span>{team.name}</span>
                <span className="text-muted-foreground text-xs">(Groep {team.group})</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <AnimatePresence mode="wait">
        {selectedTeam && route && (
          <motion.div
            key={selectedTeamId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            {/* Team Header */}
            <Card className="border-0 shadow-elevation-2 overflow-hidden">
              <div className="gradient-navy p-4 text-white">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{selectedTeam.flagUrl}</span>
                  <div>
                    <h3 className="font-display font-bold text-lg">{selectedTeam.name}</h3>
                    <p className="text-xs opacity-80">
                      Groep {selectedTeam.group} · Huidige positie: #{selectedTeam.position}
                    </p>
                  </div>
                </div>
              </div>
              <CardContent className="p-3">
                <div className={cn(
                  "flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg",
                  route.qualifies ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                )}>
                  {route.qualifies ? <Target className="h-4 w-4" /> : null}
                  {route.reason}
                </div>
              </CardContent>
            </Card>

            {/* Route Steps */}
            {route.qualifies && route.stages && (
              <div className="relative pl-6">
                {/* Vertical line */}
                <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-secondary to-warning" />

                {route.stages.map((stage, i) => (
                  <motion.div
                    key={stage.key}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="relative mb-3 last:mb-0"
                  >
                    {/* Dot on timeline */}
                    <div className={cn(
                      "absolute -left-6 top-3 h-4 w-4 rounded-full border-2 border-background z-10",
                      i === route.stages!.length - 1 ? "bg-warning" : "bg-primary"
                    )} />

                    <Card className={cn(
                      "border-0 shadow-elevation-1 overflow-hidden",
                      i === route.stages!.length - 1 && "shadow-glow-gold"
                    )}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                              {stage.emoji} {stage.label}
                            </p>
                            <p className="text-sm font-semibold mt-0.5">
                              vs {stage.opponent}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{stage.description}</p>
                          </div>
                          {i < route.stages!.length - 1 && (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          {i === route.stages!.length - 1 && (
                            <Trophy className="h-5 w-5 text-warning" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!selectedTeamId && (
        <Card className="border-0 shadow-elevation-1">
          <CardContent className="p-6 text-center text-muted-foreground text-sm">
            <p className="text-3xl mb-2">🗺️</p>
            <p>Selecteer een team om hun mogelijke route naar de finale te zien.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
