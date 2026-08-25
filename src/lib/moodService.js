import { todayKey } from "./date";

/**
 * 16 Curated Mood Expressions with deep meanings.
 * Users reflect and mark their daily mood strictly between 11:00 PM and 11:59 PM.
 */
export const MOOD_EXPRESSIONS = [
  {
    id: "electrified",
    emoji: "⚡",
    label: "Electrified",
    meaning: "Surged with unstoppable energy, breakthroughs, and intense creative passion.",
    tone: "high",
    vibeTag: "High Energy",
    color: "#fde68a",
  },
  {
    id: "on-fire",
    emoji: "🔥",
    label: "On Fire",
    meaning: "Crushed goals one after another with ruthless momentum and zero hesitation.",
    tone: "high",
    vibeTag: "Peak Output",
    color: "#fecaca",
  },
  {
    id: "zen-flow",
    emoji: "🧘",
    label: "Zen Flow",
    meaning: "Calm, peaceful, distraction-free steady work with deep inner clarity.",
    tone: "good",
    vibeTag: "Deep Focus",
    color: "#bbf7d0",
  },
  {
    id: "laser-focused",
    emoji: "🎯",
    label: "Laser Focused",
    meaning: "Locked in on the highest priority tasks, shutting out all surrounding noise.",
    tone: "good",
    vibeTag: "Targeted",
    color: "#bae6fd",
  },
  {
    id: "victorious",
    emoji: "💎",
    label: "Victorious",
    meaning: "Fought through difficult resistance or complex obstacles and triumphed.",
    tone: "high",
    vibeTag: "Triumph",
    color: "#c7d2fe",
  },
  {
    id: "growing",
    emoji: "🌱",
    label: "Growing",
    meaning: "Learned vital lessons, improved step by step, and planted seeds for tomorrow.",
    tone: "good",
    vibeTag: "Progress",
    color: "#bbf451",
  },
  {
    id: "comfortable",
    emoji: "☕",
    label: "Comfortable",
    meaning: "A balanced, steady, gentle day where everything flowed without pressure.",
    tone: "good",
    vibeTag: "Balanced",
    color: "#fed7aa",
  },
  {
    id: "resilient",
    emoji: "🛡️",
    label: "Resilient",
    meaning: "Faced friction, setbacks, or fatigue but held the line and never gave up.",
    tone: "good",
    vibeTag: "Grit",
    color: "#e8d5c4",
  },
  {
    id: "creative-spark",
    emoji: "🎨",
    label: "Creative Spark",
    meaning: "Inventive ideas, imaginative solutions, and artistic expression flourished.",
    tone: "high",
    vibeTag: "Artistic",
    color: "#e9d5ff",
  },
  {
    id: "problem-solver",
    emoji: "🧩",
    label: "Problem Solver",
    meaning: "Untangled confusing blockers and solved tricky problems with logic.",
    tone: "good",
    vibeTag: "Analytical",
    color: "#a5f3fc",
  },
  {
    id: "playful",
    emoji: "✨",
    label: "Playful",
    meaning: "Lighthearted, joyful, and had fun while getting things done.",
    tone: "high",
    vibeTag: "Joyful",
    color: "#fbcfe8",
  },
  {
    id: "mindful",
    emoji: "🌊",
    label: "Mindful",
    meaning: "Present in every moment, appreciative, and deeply conscious of priorities.",
    tone: "good",
    vibeTag: "Mindful",
    color: "#d5ddfd",
  },
  {
    id: "tired-satisfied",
    emoji: "🛌",
    label: "Satisfied Tired",
    meaning: "Body and mind are tired, but heart is full from honest hard work.",
    tone: "mid",
    vibeTag: "Well Earned",
    color: "#fed7aa",
  },
  {
    id: "drained",
    emoji: "😴",
    label: "Drained",
    meaning: "Low battery, pushed limits to exhaustion, ready for deep restoration.",
    tone: "low",
    vibeTag: "Recovery Needed",
    color: "#f3e8ff",
  },
  {
    id: "overwhelmed",
    emoji: "🌪️",
    label: "Overwhelmed",
    meaning: "Turbulent chaos and too many demands, but made it through to the other side.",
    tone: "low",
    vibeTag: "Surviving",
    color: "#fee2e2",
  },
  {
    id: "reset-ready",
    emoji: "🌅",
    label: "Reset Ready",
    meaning: "Leaving today's friction in the past, completely ready for a fresh clean slate.",
    tone: "mid",
    vibeTag: "Fresh Slate",
    color: "#fff085",
  },
];

/** Check if the strict 11:00 PM - 11:59 PM (23:00-23:59) reflection window is currently open */
export function isMoodWindowOpen(date = new Date()) {
  const hours = date.getHours();
  return hours === 23;
}

/** Get structured countdown info for the mood window */
export function getMoodWindowCountdown(date = new Date()) {
  const now = date.getTime();
  const hours = date.getHours();
  const isOpen = hours === 23;

  if (isOpen) {
    // Window ends at 23:59:59 (midnight)
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    const msLeft = Math.max(0, end.getTime() - now);
    const mins = Math.floor(msLeft / 60000);
    const secs = Math.floor((msLeft % 60000) / 1000);
    return {
      isOpen: true,
      label: `Open now · Closes in ${mins}m ${secs}s`,
      closesInMinutes: mins,
    };
  }

  // Calculate time until next 23:00
  const target = new Date(date);
  if (hours < 23) {
    target.setHours(23, 0, 0, 0);
  } else {
    // Past midnight, target is tonight at 23:00
    target.setDate(target.getDate() + 1);
    target.setHours(23, 0, 0, 0);
  }

  const msLeft = Math.max(0, target.getTime() - now);
  const hrs = Math.floor(msLeft / 3600000);
  const mins = Math.floor((msLeft % 3600000) / 60000);
  return {
    isOpen: false,
    label: `Opens at 11:00 PM · In ${hrs}h ${mins}m`,
    hoursLeft: hrs,
    minutesLeft: mins,
  };
}
