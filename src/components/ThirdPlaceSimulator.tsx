import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check, X, TrendingUp, TrendingDown } from "lucide-react";

interface GroupStanding {
  teamId: string;
  teamName: string;
  shortName: string;
  flagUrl: string;
  group: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

interface ThirdPlaceSimulatorProps {
  matches: any[];
  teams: any[];
}

function calculateGroupStandings(matches: any[]): Map<string, GroupStanding[]> {
  const standings = new Map<string, GroupStanding>();

  // Initialize standings from matches
  matches.forEach((m: any) => {
    if (m.stage !== "group") return;
    const homeTeam = m.home_team;
    const awayTeam = m.away_team;
    if (!homeTeam || !awayTeam) return;

    // Initialize teams
    [{ team: homeTeam, side: "home" }, { team: awayTeam, side: "away" }].forEach(({ team }) => {
      if (!standings.has(team.id)) {
        standings.set(team.id, {
          teamId: team.id,
          teamName: team.name,
          shortName: team.short_name || team.name,
          flagUrl: team.flag_url || "🏳️",
          group: m.group || team.group || "?",
          played: 0, won: 0, drawn: 0, lost: 0,
          goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0,
        });
      }
    });

    // Only count finished matches
    if (m.status !== "finished" || m.home_score == null || m.away_score == null) return;

    const home = standings.get(homeTeam.id)!;
    const away = standings.get(awayTeam.id)!;

    home.played++; away.played++;
    home.goalsFor += m.home_score; home.goalsAgainst += m.away_score;
    away.goalsFor += m.away_score; away.goalsAgainst += m.home_score;

    if (m.home_score > m.away_score) {
      home.won++; home.points += 3; away.lost++;
    } else if (m.home_score < m.away_score) {
      away.won++; away.points += 3; home.lost++;
    } else {
      home.drawn++; away.drawn++; home.points += 1; away.points += 1;
    }

    home.goalDiff = home.goalsFor - home.goalsAgainst;
    away.goalDiff = away.goalsFor - away.goalsAgainst;
  });

  // Group by group letter
  const groups = new Map<string, GroupStanding[]>();
  standings.forEach((s) => {
    const group = s.group;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(s);
  });

  // Sort each group
  groups.forEach((teamList, key) => {
    teamList.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.teamName.localeCompare(b.teamName);
    });
    groups.set(key, teamList);
  });

  return groups;
}

function rankThirdPlaceTeams(groups: Map<string, GroupStanding[]>): GroupStanding[] {
  const thirdPlaceTeams: GroupStanding[] = [];
  groups.forEach((teamList) => {
    if (teamList.length >= 3) {
      thirdPlaceTeams.push(teamList[2]);
    }
  });

  // Sort 3rd place teams by FIFA criteria
  thirdPlaceTeams.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.teamName.localeCompare(b.teamName);
  });

  return thirdPlaceTeams;
}

export function ThirdPlaceSimulator({ matches }: ThirdPlaceSimulatorProps) {
  const groups = useMemo(() => calculateGroupStandings(matches), [matches]);
  const thirdPlaceTeams = useMemo(() => rankThirdPlaceTeams(groups), [groups]);

  const qualifyCount = 8; // Best 8 of 12 third-place teams qualify
  const hasResults = Array.from(groups.values()).some(g => g.some(t => t.played > 0));

  const sortedGroups = useMemo(() => {
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [groups]);

  return (
    <div className="space-y-4">
      {/* Group Standings Overview */}
      <div className="grid grid-cols-1 gap-3">
        {sortedGroups.map(([groupLetter, teamList]) => (
          <Card key={groupLetter} className="border-0 shadow-elevation-1 overflow-hidden">
            <div className="gradient-navy px-3 py-1.5">
              <span className="text-xs font-bold text-white/90">Groep {groupLetter}</span>
            </div>
            <CardContent className="p-0">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-muted">
                    <th className="text-left pl-3 py-1.5 font-medium text-muted-foreground w-[40%]">Team</th>
                    <th className="text-center py-1.5 font-medium text-muted-foreground w-8">W</th>
                    <th className="text-center py-1.5 font-medium text-muted-foreground w-8">G</th>
                    <th className="text-center py-1.5 font-medium text-muted-foreground w-8">V</th>
                    <th className="text-center py-1.5 font-medium text-muted-foreground w-10">DV</th>
                    <th className="text-center pr-3 py-1.5 font-bold text-muted-foreground w-10">Pt</th>
                  </tr>
                </thead>
                <tbody>
                  {teamList.map((team, i) => {
                    const isQualified = i < 2;
                    const isThird = i === 2;
                    const thirdQualifies = isThird && thirdPlaceTeams.indexOf(team) < qualifyCount && thirdPlaceTeams.indexOf(team) >= 0;

                    return (
                      <tr
                        key={team.teamId}
                        className={cn(
                          "border-b border-muted/50 last:border-0",
                          isQualified && "bg-primary/5",
                          thirdQualifies && "bg-secondary/5",
                          i === 3 && "opacity-50"
                        )}
                      >
                        <td className="pl-3 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] w-4 text-muted-foreground font-bold">{i + 1}</span>
                            <span className="text-sm">{team.flagUrl}</span>
                            <span className="font-medium truncate max-w-[80px]">{team.shortName}</span>
                            {isQualified && <Check className="h-3 w-3 text-primary shrink-0" />}
                            {thirdQualifies && <TrendingUp className="h-3 w-3 text-secondary shrink-0" />}
                          </div>
                        </td>
                        <td className="text-center py-1.5">{team.won}</td>
                        <td className="text-center py-1.5">{team.drawn}</td>
                        <td className="text-center py-1.5">{team.lost}</td>
                        <td className="text-center py-1.5">
                          <span className={cn(
                            team.goalDiff > 0 && "text-primary",
                            team.goalDiff < 0 && "text-destructive"
                          )}>
                            {team.goalDiff > 0 ? `+${team.goalDiff}` : team.goalDiff}
                          </span>
                        </td>
                        <td className="text-center pr-3 py-1.5 font-bold">{team.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Best 3rd Place Rankings */}
      {thirdPlaceTeams.length > 0 && (
        <Card className="border-0 shadow-elevation-2 overflow-hidden">
          <div className="bg-gradient-to-r from-secondary/20 to-transparent px-4 py-2">
            <h3 className="font-display font-bold text-sm">🏅 Beste 3e Plaatsen</h3>
            <p className="text-[10px] text-muted-foreground">Top 8 gaat door naar de knock-out ronde</p>
          </div>
          <CardContent className="p-3 space-y-1.5">
            {thirdPlaceTeams.map((team, i) => {
              const qualifies = i < qualifyCount;
              return (
                <motion.div
                  key={team.teamId}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs",
                    qualifies ? "bg-primary/5" : "bg-muted/50 opacity-60"
                  )}
                >
                  <span className={cn(
                    "font-bold w-5 text-center",
                    qualifies ? "text-primary" : "text-muted-foreground"
                  )}>
                    {i + 1}
                  </span>
                  <span className="text-sm">{team.flagUrl}</span>
                  <span className="font-medium flex-1">{team.shortName}</span>
                  <Badge variant={qualifies ? "default" : "outline"} className={cn(
                    "text-[9px] px-1.5 py-0",
                    qualifies ? "bg-primary/10 text-primary hover:bg-primary/10" : ""
                  )}>
                    Groep {team.group}
                  </Badge>
                  <span className="font-bold w-6 text-right">{team.points}pt</span>
                  <span className={cn(
                    "w-6 text-right text-[10px]",
                    team.goalDiff > 0 ? "text-primary" : team.goalDiff < 0 ? "text-destructive" : ""
                  )}>
                    {team.goalDiff > 0 ? `+${team.goalDiff}` : team.goalDiff}
                  </span>
                  {qualifies ? (
                    <Check className="h-3 w-3 text-primary shrink-0" />
                  ) : (
                    <X className="h-3 w-3 text-destructive shrink-0" />
                  )}
                </motion.div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {!hasResults && (
        <Card className="border-0 shadow-elevation-1">
          <CardContent className="p-6 text-center text-muted-foreground text-sm">
            <p className="text-3xl mb-2">📊</p>
            <p>De groepsstanden worden gevuld zodra wedstrijden zijn gespeeld.</p>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground px-1">
        <span className="flex items-center gap-1"><Check className="h-3 w-3 text-primary" /> Door als 1e/2e</span>
        <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3 text-secondary" /> Door als beste 3e</span>
        <span className="flex items-center gap-1"><X className="h-3 w-3 text-destructive" /> Uitgeschakeld</span>
      </div>
    </div>
  );
}

export { calculateGroupStandings, rankThirdPlaceTeams };
export type { GroupStanding };
