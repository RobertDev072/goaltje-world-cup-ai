import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface GoalCelebrationProps {
  /** Call show() to trigger */
  visible: boolean;
  onComplete: () => void;
}

export function GoalCelebration({ visible, onComplete }: GoalCelebrationProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onComplete, 2500);
      return () => clearTimeout(timer);
    }
  }, [visible, onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Background flash */}
          <motion.div
            className="absolute inset-0 bg-primary/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 1 }}
          />

          {/* Main content */}
          <motion.div
            className="relative text-center"
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: [0, 1.3, 1], rotate: [0, 5, 0] }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
          >
            <motion.p
              className="text-6xl mb-2"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 0.5, repeat: 2 }}
            >
              ⚽
            </motion.p>
            <motion.p
              className="text-3xl font-bold font-display text-primary"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              GOAL!
            </motion.p>
          </motion.div>

          {/* Confetti particles */}
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={i}
              className={cn(
                "absolute w-2 h-2 rounded-full",
                i % 3 === 0 ? "bg-primary" : i % 3 === 1 ? "bg-secondary" : "bg-success"
              )}
              initial={{
                x: 0,
                y: 0,
                opacity: 1,
              }}
              animate={{
                x: (Math.random() - 0.5) * 300,
                y: (Math.random() - 0.5) * 400,
                opacity: 0,
                scale: [1, 1.5, 0],
              }}
              transition={{
                duration: 1.5,
                delay: 0.2 + Math.random() * 0.3,
                ease: "easeOut",
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to manage goal celebration state
 */
export function useGoalCelebration() {
  const [showGoal, setShowGoal] = useState(false);

  const triggerGoal = useCallback(() => {
    setShowGoal(true);
  }, []);

  const hideGoal = useCallback(() => {
    setShowGoal(false);
  }, []);

  return { showGoal, triggerGoal, hideGoal };
}
