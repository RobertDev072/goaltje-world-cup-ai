import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LiveMatchBannerProps {
  matches: any[];
}

function stageLabel(match: any): string {
  if (match.stage === "group") return `Groep ${match.group}`;
  if (match.stage === "round_of_32") return "Laatste 32";
  if (match.stage === "round_of_16") return "Laatste 16";
  if (match.stage === "quarter_final") return "Kwartfinale";
  if (match.stage === "semi_final") return "Halve finale";
  if (match.stage === "third_place") return "3e/4e plaats";
  if (match.stage === "final") return "Finale";
  return match.stage ?? "";
}

/**
 * Berekent de live-speelstatus (1e/2e helft + minuut, of rust) op basis van
 * de elapsed tijd sinds kickoff. Puur client-side, geen API nodig.
 *
 * Aannames: 1e helft 0–45, rust 45–60 (15 min pauze), 2e helft 60–105,
 * daarna eventueel blessuretijd/verlenging.
 */
function getMatchPeriod(kickoffUtc: string, now: number): string {
  const elapsed = (now - new Date(kickoffUtc).getTime()) / 60_000;
  if (elapsed < 0) return "Begint zo";
  if (elapsed < 45) return `1e helft · ${Math.max(1, Math.floor(elapsed))}'`;
  if (elapsed < 48) return "1e helft · 45+";
  if (elapsed < 60) return "Rust";
  if (elapsed < 105) return `2e helft · ${Math.min(90, Math.floor(elapsed - 15))}'`;
  if (elapsed < 110) return "2e helft · 90+";
  if (elapsed < 120) return "Verlenging";
  return "Bijna afgelopen";
}

export function LiveMatchBanner({ matches }: LiveMatchBannerProps) {
  const liveMatches = useMemo(
    () => matches.filter((m) => m.status === "live"),
    [matches]
  );

  // Tik elke 30 seconden zodat minuten zichtbaar oplopen
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    if (liveMatches.length === 0) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [liveMatches.length]);

  if (liveMatches.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      <div className="flex items-center gap-2">
        <motion.span
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="h-2 w-2 rounded-full bg-[#DC2626]"
        />
        <span className="text-xs font-bold uppercase tracking-wider text-[#DC2626]">
          Live nu
        </span>
      </div>

      {liveMatches.map((match) => {
        const period = match.kickoff_utc ? getMatchPeriod(match.kickoff_utc, now) : null;
        return (
          <Link
            key={match.id}
            to={`/app/matches/${match.id}`}
            className={cn(
              "block rounded-2xl p-4 shadow-elevation-3 relative overflow-hidden text-white",
            )}
            style={{ background: "linear-gradient(135deg, #B91C1C, #DC2626)" }}
          >
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white text-[#B91C1C] text-[10px] font-black live-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B91C1C]" />
                LIVE
              </span>
              <span className="text-[11px] font-medium opacity-95">
                {stageLabel(match)}
                {period && (
                  <>
                    <span className="opacity-70 mx-1.5">·</span>
                    <span className="font-bold">{period}</span>
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xl shrink-0">{match.home_team?.flag_url || "🏳️"}</span>
                <span className="font-bold text-sm truncate">
                  {match.home_team?.short_name || "TBD"}
                </span>
              </div>
              <motion.span
                className="font-display font-black text-3xl tabular-nums px-3 shrink-0"
                key={`${match.home_score}-${match.away_score}`}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500 }}
              >
                {match.home_score ?? 0} - {match.away_score ?? 0}
              </motion.span>
              <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                <span className="font-bold text-sm truncate text-right">
                  {match.away_team?.short_name || "TBD"}
                </span>
                <span className="text-xl shrink-0">{match.away_team?.flag_url || "🏳️"}</span>
              </div>
            </div>
          </Link>
        );
      })}
    </motion.div>
  );
}
