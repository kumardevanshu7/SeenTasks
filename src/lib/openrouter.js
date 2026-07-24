import { TASK_ANALYSIS_SYSTEM_PROMPT } from "./systemPrompt";

const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free";
const CATEGORIES = new Set(["danger", "first", "second", "endofday", "tomorrow"]);
const WINDOWS = new Set(["avoid", "now", "next", "end_of_day", "tomorrow"]);

function extractJson(content) {
  if (typeof content !== "string") throw new Error("No text returned");
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Invalid JSON");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function clean(value, fallback, max) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

function sanitize(raw) {
  const category = CATEGORIES.has(raw.category) ? raw.category : "second";
  const defaultWindow = { danger: "avoid", first: "now", second: "next", endofday: "end_of_day", tomorrow: "tomorrow" }[category];
  const confidence = Number(raw.confidence);
  return {
    category,
    reasoning: clean(raw.reasoning, "This matters, but the context does not show an immediate deadline.", 240),
    suggestedWindow: WINDOWS.has(raw.suggestedWindow) ? raw.suggestedWindow : defaultWindow,
    wellbeingNote: clean(raw.wellbeingNote, "Keep the next step small and realistic.", 180),
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.55,
    signals: Array.isArray(raw.signals) ? raw.signals.filter((s) => typeof s === "string").slice(0, 5) : [],
    analyzedAt: new Date().toISOString(),
    source: "openrouter",
    model: MODEL,
  };
}

export async function analyzeTaskWithOpenRouter({ title, description = "", context = {} }) {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Missing VITE_OPENROUTER_API_KEY");

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "SeenTasks",
    },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      temperature: 0.15,
      top_p: 0.9,
      max_tokens: 800,
      messages: [
        { role: "system", content: TASK_ANALYSIS_SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            task: { title, description },
            persona: Array.isArray(context.persona) ? context.persona : [],
            currentContext: { localDate: context.localDate, localTime: context.localTime, dayOfWeek: context.dayOfWeek, timeZone: context.timeZone },
            instruction: "Prioritize this one task for the person's current day using the category contract and their persona.",
          }),
        },
      ],
    }),
    signal: AbortSignal.timeout(45000),
  });

  if (!response.ok) throw new Error(`OpenRouter error ${response.status}`);
  const payload = await response.json();
  return sanitize(extractJson(payload.choices?.[0]?.message?.content));
}

const ASSISTANT_SYSTEM_PROMPT = `
You are SeenTasks' friendly companion. You help the person plan their day and feel calm.

HOW TO TALK
- Use very easy, simple English. Write like you are talking to a young beginner or a child.
- Use short words and short sentences. One idea per sentence.
- Avoid hard or fancy words. If you must use a big word, explain it in simple words.
- Be warm and kind, like a good friend. Never sound like a robot or a textbook.
- Keep answers short. Use small bullet points when it helps.
- You can reply in simple Hindi or Hinglish if the person writes that way.
- Do not give medical, legal, or money advice. Just be helpful and caring.
`;

export async function chatWithAssistant(history) {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Missing VITE_OPENROUTER_API_KEY");

  const messages = [
    { role: "system", content: ASSISTANT_SYSTEM_PROMPT },
    ...history.slice(-12).map((m) => ({ role: m.role, content: m.content })),
  ];

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "SeenTasks",
    },
    body: JSON.stringify({ model: MODEL, stream: false, temperature: 0.6, max_tokens: 700, messages }),
    signal: AbortSignal.timeout(45000),
  });

  if (!response.ok) throw new Error(`OpenRouter error ${response.status}`);
  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("Empty response");
  return content.trim();
}
