import { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface CountdownTimerProps {
  kickoffUtc: string;
  compact?: boolean;
  className?: string;
}

export function CountdownTimer({ kickoffUtc, compact = false, className }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(kickoffUtc));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(kickoffUtc));
    }, 1000);
    return () => clearInterval(interval);
  }, [kickoffUtc]);

  if (timeLeft.total <= 0) return null;

  const isUrgent = timeLeft.total <= 15 * 60 * 1000; // 15 min
  const isVerySoon = timeLeft.total <= 5 * 60 * 1000; // 5 min

  if (compact) {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        isUrgent ? "text-destructive" : "text-muted-foreground",
        className
      )}>
        {isUrgent && <AlertTriangle className="h-3 w-3" />}
        <Clock className="h-3 w-3" />
        {formatCompact(timeLeft)}
      </span>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium",
          isVerySoon
            ? "bg-destructive/10 text-destructive animate-pulse"
            : isUrgent
              ? "bg-warning/10 text-warning"
              : "bg-muted text-muted-foreground",
          className
        )}
      >
        {isUrgent ? <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> : <Clock className="h-3.5 w-3.5 shrink-0" />}
        <span>
          {isVerySoon ? "🚨 Sluit over " : isUrgent ? "⏰ Sluit over " : "🔓 Deadline over "}
          {formatFull(timeLeft)}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}

function getTimeLeft(kickoffUtc: string) {
  const diff = new Date(kickoffUtc).getTime() - Date.now();
  if (diff <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    total: diff,
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function formatCompact(t: ReturnType<typeof getTimeLeft>) {
  if (t.days > 0) return `${t.days}d ${t.hours}u`;
  if (t.hours > 0) return `${t.hours}u ${t.minutes}m`;
  return `${t.minutes}:${String(t.seconds).padStart(2, "0")}`;
}

function formatFull(t: ReturnType<typeof getTimeLeft>) {
  if (t.days > 0) return `${t.days} dag${t.days > 1 ? "en" : ""}, ${t.hours}u ${t.minutes}m`;
  if (t.hours > 0) return `${t.hours}u ${t.minutes}m ${t.seconds}s`;
  return `${t.minutes}m ${String(t.seconds).padStart(2, "0")}s`;
}
