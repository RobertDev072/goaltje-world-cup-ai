import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CONFETTI_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--success))",
  "#FFD700",
  "#FF6B6B",
  "#4ECDC4",
];

const SHAPES = ["circle", "square", "triangle"] as const;

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  shape: typeof SHAPES[number];
  size: number;
  delay: number;
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 400,
    y: -(Math.random() * 500 + 100),
    rotation: Math.random() * 720 - 360,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    size: Math.random() * 8 + 4,
    delay: Math.random() * 0.5,
  }));
}

function ParticleShape({ particle }: { particle: Particle }) {
  if (particle.shape === "triangle") {
    return (
      <motion.div
        className="absolute left-1/2 top-1/2"
        style={{ width: 0, height: 0, borderLeft: `${particle.size / 2}px solid transparent`, borderRight: `${particle.size / 2}px solid transparent`, borderBottom: `${particle.size}px solid ${particle.color}` }}
        initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
        animate={{ x: particle.x, y: particle.y, opacity: 0, rotate: particle.rotation }}
        transition={{ duration: 2.5, delay: particle.delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      />
    );
  }
  return (
    <motion.div
      className="absolute left-1/2 top-1/2"
      style={{
        width: particle.size,
        height: particle.size,
        backgroundColor: particle.color,
        borderRadius: particle.shape === "circle" ? "50%" : "2px",
      }}
      initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
      animate={{ x: particle.x, y: particle.y, opacity: 0, rotate: particle.rotation, scale: [1, 1.2, 0.5] }}
      transition={{ duration: 2.5, delay: particle.delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    />
  );
}

interface ExactScoreConfettiProps {
  trigger: boolean;
}

export function ExactScoreConfetti({ trigger }: ExactScoreConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (trigger) {
      setParticles(generateParticles(40));
      setShow(true);
      const timer = setTimeout(() => setShow(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 pointer-events-none flex items-start justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Celebratory text */}
          <motion.div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 text-center"
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: [0, 1.3, 1], rotate: [0, 5, 0] }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
          >
            <motion.p
              className="text-5xl mb-2"
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 0.6, repeat: 2 }}
            >
              🎯
            </motion.p>
            <motion.p
              className="text-2xl font-bold font-display text-primary drop-shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              EXACTE SCORE!
            </motion.p>
            <motion.p
              className="text-sm text-muted-foreground mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              +6 punten 🏆
            </motion.p>
          </motion.div>

          {/* Confetti particles */}
          <div className="absolute top-0 left-1/2">
            {particles.map((p) => (
              <ParticleShape key={p.id} particle={p} />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to trigger exact-score confetti once per match view
 */
export function useExactScoreConfetti(pointsAwarded: number | null | undefined, matchId: string | undefined) {
  const [triggered, setTriggered] = useState(false);
  const storageKey = `confetti-seen-${matchId}`;

  useEffect(() => {
    if (pointsAwarded != null && pointsAwarded >= 6 && matchId) {
      const seen = sessionStorage.getItem(storageKey);
      if (!seen) {
        setTriggered(true);
        sessionStorage.setItem(storageKey, "1");
      }
    }
  }, [pointsAwarded, matchId, storageKey]);

  return triggered;
}
