import { useRef, useMemo, useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Minus, Swords } from "lucide-react";
import { motion, LayoutGroup } from "framer-motion";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  userId: string;
  name: string;
  avatar_url: string | null;
  points: number;
  todayPoints: number;
  role: string;
  exactCount: number;
  correctResults: number;
  totalCorrectGoals: number;
  lastCorrectAt: string | null;
}

export interface UserBadge {
  streak: number;
  profileType: string;
  profileEmoji: string;
}

interface VirtualizedLeaderboardProps {
  leaderboard: LeaderboardEntry[];
  currentUserId?: string;
  rivalUserId?: string | null;
  /** Streak + profiel-emoji per user, gekeyed op userId. Optioneel. */
  badgesByUser?: Map<string, UserBadge> | null;
}

const ITEM_HEIGHT = 68;
const OVERSCAN = 5;
const VIRTUALIZATION_THRESHOLD = 50;

export function VirtualizedLeaderboard({ leaderboard, currentUserId, rivalUserId, badgesByUser }: VirtualizedLeaderboardProps) {
  const shouldVirtualize = leaderboard.length > VIRTUALIZATION_THRESHOLD;

  if (!shouldVirtualize) {
    return (
      <LayoutGroup>
        {leaderboard.map((entry, i) => (
          <LeaderboardRow
            key={entry.userId}
            entry={entry}
            index={i}
            isMe={entry.userId === currentUserId}
            isRival={entry.userId === rivalUserId}
            leaderboard={leaderboard}
            badge={badgesByUser?.get(entry.userId) ?? null}
            animate
          />
        ))}
      </LayoutGroup>
    );
  }

  return <VirtualList leaderboard={leaderboard} currentUserId={currentUserId} rivalUserId={rivalUserId} badgesByUser={badgesByUser} />;
}

function VirtualList({ leaderboard, currentUserId, rivalUserId, badgesByUser }: VirtualizedLeaderboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setContainerHeight(entries[0].contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleScroll = useCallback(() => {
    if (containerRef.current) setScrollTop(containerRef.current.scrollTop);
  }, []);

  const totalHeight = leaderboard.length * ITEM_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(leaderboard.length - 1, Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + OVERSCAN);

  const visibleItems = useMemo(() => {
    const items = [];
    for (let i = startIndex; i <= endIndex; i++) {
      items.push({ entry: leaderboard[i], index: i });
    }
    return items;
  }, [leaderboard, startIndex, endIndex]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-[70vh] overflow-y-auto scrollbar-thin"
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        {visibleItems.map(({ entry, index }) => (
          <div
            key={entry.userId}
            style={{
              position: "absolute",
              top: index * ITEM_HEIGHT,
              left: 0,
              right: 0,
              height: ITEM_HEIGHT,
            }}
          >
            <LeaderboardRow
              entry={entry}
              index={index}
              isMe={entry.userId === currentUserId}
              isRival={entry.userId === rivalUserId}
              leaderboard={leaderboard}
              badge={badgesByUser?.get(entry.userId) ?? null}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaderboardRow({
  entry, index, isMe, isRival, leaderboard, badge, animate = false,
}: {
  entry: LeaderboardEntry;
  index: number;
  isMe: boolean;
  isRival: boolean;
  leaderboard: LeaderboardEntry[];
  badge?: UserBadge | null;
  animate?: boolean;
}) {
  const i = index;
  const pointsAbove = i > 0 ? leaderboard[i - 1].points - entry.points : 0;
  const pointsBelow = i < leaderboard.length - 1 ? entry.points - leaderboard[i + 1].points : 0;

  const getRankBadge = (idx: number) => {
    if (idx === 0) return "🥇";
    if (idx === 1) return "🥈";
    if (idx === 2) return "🥉";
    return `${idx + 1}`;
  };

  const Wrapper = animate ? motion.div : "div";
  const wrapperProps = animate
    ? {
        layout: true,
        layoutId: entry.userId,
        initial: { opacity: 0, x: -16 },
        animate: { opacity: 1, x: 0 },
        transition: { delay: i * 0.04, layout: { type: "spring", stiffness: 300, damping: 30 } },
      }
    : {};

  return (
    <Wrapper {...(wrapperProps as Record<string, unknown>)} className="pb-2">
      <Card className={cn(
        "border-0 transition-all duration-300 overflow-hidden",
        isMe ? "shadow-glow-primary ring-1 ring-primary/20" : "shadow-elevation-1",
        isRival && "ring-1 ring-destructive/20",
        i === 0 && "shadow-glow-gold ring-1 ring-secondary/30",
        i === 1 && "ring-1 ring-muted-foreground/20",
        i === 2 && "ring-1 ring-warning/20",
      )}>
        {i === 0 && <div className="bg-gradient-to-r from-secondary/20 to-transparent h-0.5" />}
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <span className={cn(
              "text-lg font-bold font-display w-8 text-center shrink-0",
              i === 0 && "text-secondary", i === 1 && "text-muted-foreground",
              i === 2 && "text-warning", i > 2 && "text-muted-foreground",
            )}>
              {getRankBadge(i)}
            </span>

            <div className={cn(
              "h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden shrink-0",
              i === 0 ? "ring-2 ring-secondary/40 bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground",
            )}>
              {entry.avatar_url
                ? <img src={entry.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                : entry.name[0]?.toUpperCase() || "?"}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate flex items-center gap-1">
                {badge?.profileEmoji && badge.profileType !== "new" && (
                  <span className="text-sm" title={badge.profileType}>{badge.profileEmoji}</span>
                )}
                <span className="truncate">{entry.name}</span>
                {isMe && <span className="text-primary text-xs shrink-0">(jij)</span>}
                {isRival && <span className="text-destructive shrink-0">⚔️</span>}
                {entry.role === "admin" && <span className="shrink-0">👑</span>}
                {badge && badge.streak >= 2 && (
                  <span className="text-[10px] bg-destructive/15 text-destructive rounded-full px-1.5 py-0 font-bold shrink-0">
                    🔥{badge.streak}
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                {i > 0 && pointsAbove > 0 && (
                  <span className="flex items-center gap-0.5"><TrendingUp className="h-2.5 w-2.5" />{pointsAbove} achter #{i}</span>
                )}
                {i < leaderboard.length - 1 && pointsBelow > 0 && (
                  <span className="flex items-center gap-0.5">+{pointsBelow} voor #{i + 2}</span>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className={cn("font-bold text-lg font-display", i === 0 ? "text-secondary" : "text-primary")}>
                {entry.points}
              </span>
              <span className="text-xs text-muted-foreground ml-0.5">pt</span>
              {entry.todayPoints > 0 && (
                <div className="flex items-center justify-end gap-0.5 text-xs font-semibold text-success">
                  <TrendingUp className="h-3 w-3" />+{entry.todayPoints}
                </div>
              )}
              {entry.todayPoints === 0 && (
                <div className="flex items-center justify-end gap-0.5 text-[10px] text-muted-foreground/50">
                  <Minus className="h-2.5 w-2.5" />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Wrapper>
  );
}
