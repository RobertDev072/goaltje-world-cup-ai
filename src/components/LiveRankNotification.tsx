import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveRankNotificationProps {
  visible: boolean;
  direction: "up" | "down";
  newPosition: number;
  passedName?: string;
  onComplete: () => void;
}

export function LiveRankNotification({ visible, direction, newPosition, passedName, onComplete }: LiveRankNotificationProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onComplete, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible, onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
          initial={{ opacity: 0, y: -40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <div className={cn(
            "px-5 py-3 rounded-2xl shadow-elevation-3 flex items-center gap-3",
            direction === "up"
              ? "bg-success text-white shadow-glow-success"
              : "bg-destructive text-white"
          )}>
            {direction === "up" ? (
              <TrendingUp className="h-5 w-5" />
            ) : (
              <TrendingDown className="h-5 w-5" />
            )}
            <div>
              <p className="font-display font-bold text-sm">
                {direction === "up" ? `🔥 Gestegen naar #${newPosition}` : `Gezakt naar #${newPosition}`}
              </p>
              {passedName && direction === "up" && (
                <p className="text-xs opacity-80">Je bent {passedName} voorbij!</p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
