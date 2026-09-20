import { motion } from "framer-motion";
import {
  Zap,
  Flame,
  Feather,
  Target,
  Gem,
  Rocket,
  Sprout,
  Brain,
  Coffee,
  Footprints,
  Shield,
  Waves,
  Palette,
  Puzzle,
  Sparkles,
  Leaf,
  Trophy,
  Moon,
  Repeat,
  Activity,
  Compass,
  BatteryLow,
  CloudRain,
  RefreshCw,
  Sun,
  Sunrise,
} from "lucide-react";

export const MOOD_ICON_MAP = {
  electrified: { icon: Zap, color: "#d97706", bg: "#fef3c7" },
  "on-fire": { icon: Flame, color: "#dc2626", bg: "#fee2e2" },
  "zen-flow": { icon: Feather, color: "#059669", bg: "#d1fae5" },
  "laser-focused": { icon: Target, color: "#0284c7", bg: "#e0f2fe" },
  victorious: { icon: Gem, color: "#7c3aed", bg: "#ede9fe" },
  unstoppable: { icon: Rocket, color: "#ea580c", bg: "#ffedd5" },
  growing: { icon: Sprout, color: "#65a30d", bg: "#ecfccb" },
  "deep-thinker": { icon: Brain, color: "#4f46e5", bg: "#e0e7ff" },
  comfortable: { icon: Coffee, color: "#b45309", bg: "#fef3c7" },
  "steady-pace": { icon: Footprints, color: "#475569", bg: "#f1f5f9" },
  resilient: { icon: Shield, color: "#854d0e", bg: "#fef9c3" },
  "calm-confidence": { icon: Waves, color: "#0891b2", bg: "#cffafe" },
  "creative-spark": { icon: Palette, color: "#9333ea", bg: "#f3e8ff" },
  "problem-solver": { icon: Puzzle, color: "#0d9488", bg: "#ccfbf1" },
  playful: { icon: Sparkles, color: "#db2777", bg: "#fce7f3" },
  mindful: { icon: Leaf, color: "#16a34a", bg: "#dcfce7" },
  "proud-exhaustion": { icon: Trophy, color: "#ca8a04", bg: "#fef9c3" },
  "tired-satisfied": { icon: Moon, color: "#d97706", bg: "#ffedd5" },
  overthinking: { icon: Repeat, color: "#64748b", bg: "#f1f5f9" },
  restless: { icon: Activity, color: "#eab308", bg: "#fef9c3" },
  distracted: { icon: Compass, color: "#e11d48", bg: "#ffe4e6" },
  drained: { icon: BatteryLow, color: "#7c3aed", bg: "#f3e8ff" },
  overwhelmed: { icon: CloudRain, color: "#ef4444", bg: "#fee2e2" },
  reconnecting: { icon: RefreshCw, color: "#15803d", bg: "#dcfce7" },
  "spark-of-hope": { icon: Sun, color: "#eab308", bg: "#fef9c3" },
  "reset-ready": { icon: Sunrise, color: "#f59e0b", bg: "#fef3c7" },
};

export default function MoodIcon({
  moodId,
  size = 20,
  className = "",
  motionEnabled = true,
  interactive = true,
  active = false,
}) {
  const item = MOOD_ICON_MAP[moodId] || { icon: Sparkles, color: "#475569", bg: "#f1f5f9" };
  const IconComponent = item.icon;

  if (!motionEnabled) {
    return (
      <span
        className={`mood-icon-wrap ${className}`}
        style={{ color: item.color, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
      >
        <IconComponent size={size} strokeWidth={2.2} />
      </span>
    );
  }

  return (
    <motion.span
      className={`mood-icon-wrap ${className}`}
      style={{
        color: item.color,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      whileHover={interactive ? { scale: 1.22, rotate: [0, -6, 6, 0] } : undefined}
      whileTap={interactive ? { scale: 0.92 } : undefined}
      animate={
        active
          ? {
              scale: [1, 1.1, 1],
              transition: { repeat: Infinity, duration: 2.2, ease: "easeInOut" },
            }
          : undefined
      }
      transition={{ type: "spring", stiffness: 350, damping: 18 }}
    >
      <IconComponent size={size} strokeWidth={2.2} />
    </motion.span>
  );
}
