import { analyzeTaskWithOpenRouter } from "./openrouter";

// OpenRouter is called directly from the client. A local heuristic remains
// as a resilient fallback when the free model is unavailable.

export const CATEGORIES = {
  DANGER: "danger",
  FIRST: "first",
  SECOND: "second",
  ENDOFDAY: "endofday",
  TOMORROW: "tomorrow",
};

export const CATEGORY_META = {
  [CATEGORIES.DANGER]: {
    label: "Danger Zone",
    color: "var(--color-danger)",
    description: "This works against a goal you set for yourself.",
  },
  [CATEGORIES.FIRST]: {
    label: "First Priority",
    color: "var(--color-first)",
    description: "Do this now. It affects your day the most.",
  },
  [CATEGORIES.SECOND]: {
    label: "Second Priority",
    color: "var(--color-second)",
    description: "Important, but it can wait a bit.",
  },
  [CATEGORIES.ENDOFDAY]: {
    label: "End of Day",
    color: "var(--color-endofday)",
    description: "Wrap this up before you close the day.",
  },
  [CATEGORIES.TOMORROW]: {
    label: "Do Tomorrow",
    color: "var(--color-tomorrow)",
    description: "This can rest till tomorrow. Breathe.",
  },
};

const URGENT_WORDS = [
  "urgent", "asap", "immediately", "emergency", "critical", "deadline",
  "now", "important", "interview", "exam", "submit", "due", "pay", "bill",
];

const SOON_WORDS = [
  "meeting", "call", "reply", "email", "follow up", "review", "buy", "pick up",
];

const END_OF_DAY_WORDS = [
  "evening", "night", "end of day", "before bed", "dinner", "close",
];

const TOMORROW_WORDS = [
  "tomorrow", "next week", "someday", "eventually", "no rush", "later",
  "whenever", "next month",
];

function scoreWords(text, words) {
  const t = text.toLowerCase();
  return words.reduce((acc, w) => (t.includes(w) ? acc + 1 : acc), 0);
}

/**
 * Analyze a task description like a thoughtful human assistant would:
 * weighing urgency against the person's well-being, not just deadlines.
 */
function analyzeTaskFallback(title, description = "") {
  const text = `${title} ${description}`.trim();

  const urgentScore = scoreWords(text, URGENT_WORDS);
  const soonScore = scoreWords(text, SOON_WORDS);
  const eodScore = scoreWords(text, END_OF_DAY_WORDS);
  const tomorrowScore = scoreWords(text, TOMORROW_WORDS);

  let category = CATEGORIES.SECOND;
  let reasoning = "This looks useful today, but the available context does not show an immediate deadline.";

  if (urgentScore > 0) {
    category = CATEGORIES.FIRST;
    reasoning = "This appears time-sensitive. Handling it first can reduce risk and pressure on the rest of your day.";
  } else if (tomorrowScore > 0 && urgentScore === 0) {
    category = CATEGORIES.TOMORROW;
    reasoning = "The task gives no clear reason to spend today's limited focus on it, so tomorrow is a reasonable choice.";
  } else if (eodScore > 0) {
    category = CATEGORIES.ENDOFDAY;
    reasoning = "This fits naturally into your closing routine after higher-impact work is complete.";
  } else if (soonScore > 0) {
    reasoning = "This supports today's commitments, but it can follow the task with the strongest real consequence.";
  } else if (text.length < 12) {
    reasoning = "There is not enough context to manufacture urgency, so keep it as a normal task for today.";
  }

  const suggestedWindow = { first: "now", second: "next", endofday: "end_of_day", tomorrow: "tomorrow" }[category];
  return {
    category,
    reasoning,
    suggestedWindow,
    wellbeingNote: "Keep the next action small and realistic; urgency should come from consequences, not guilt.",
    confidence: 0.35,
    signals: ["local fallback"],
    analyzedAt: new Date().toISOString(),
    source: "heuristic",
    model: null,
  };
}

export async function analyzeTask(title, description = "", persona = []) {
  const now = new Date();
  try {
    return await analyzeTaskWithOpenRouter({
      title,
      description,
      context: {
        localDate: now.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
        localTime: now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
        dayOfWeek: now.toLocaleDateString(undefined, { weekday: "long" }),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        persona,
      },
    });
  } catch {
    return analyzeTaskFallback(title, description);
  }
}
