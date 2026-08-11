import { TASK_ANALYSIS_SYSTEM_PROMPT } from "./systemPrompt";

const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openai/gpt-oss-20b:free";
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

TASKS YOU KNOW
- You receive a live snapshot of this person's SeenTasks data (quick tasks, AI/today tasks, labels, workspaces, flows).
- When they ask what was on a day, what is open, due, or done — use ONLY that snapshot. Do not invent tasks.
- Show clear details in the chat: title, status (open/done), start time, end time if done, due date, label, workspace, and date.
- Format lists with markdown bullets so they are easy to read in the chat box.
- If nothing matches the day they asked about, say so simply.
`;

function buildAssistantTaskContext(context = {}) {
  const day = context.dateKey || "";
  const labels = context.labelsById || {};
  const workspaces = context.workspacesById || {};

  const quick = (context.quickTasks || []).map((t) => ({
    title: t.title,
    done: Boolean(t.done),
    date: t.dateKey || null,
    dueDate: t.dueDate || null,
    started: t.createdAt || null,
    ended: t.completedAt || null,
    label:
      Array.isArray(t.labelIds) && t.labelIds.length
        ? t.labelIds.map((id) => (labels[id] ? labels[id].name : null)).filter(Boolean).join(", ")
        : t.labelId && labels[t.labelId]
          ? labels[t.labelId].name
          : null,
    workspace: workspaces[t.workspaceId || "personal"]?.name || t.workspaceId || "Personal",
  }));

  const aiTasks = (context.tasks || []).map((t) => ({
    title: t.title,
    status: t.status,
    date: t.dateKey || null,
    category: t.category || null,
    started: t.createdAt || null,
    ended: t.completedAt || null,
  }));

  const flows = (context.flows || []).map((f) => ({
    name: f.name,
    started: f.createdAt || null,
    stepsDone: (f.steps || []).filter((s) => s.done).length,
    stepsTotal: (f.steps || []).length,
  }));

  return [
    `Today's date key: ${day}.`,
    "Use this SeenTasks snapshot. Prefer facts from here over guesses.",
    JSON.stringify({ quickTasks: quick, aiTasks, flows }, null, 0),
  ].join("\n");
}

export async function chatWithAssistant(history, context = {}) {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Missing VITE_OPENROUTER_API_KEY");

  const messages = [
    { role: "system", content: ASSISTANT_SYSTEM_PROMPT },
    { role: "system", content: buildAssistantTaskContext(context) },
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
    body: JSON.stringify({ model: MODEL, stream: false, temperature: 0.6, max_tokens: 900, messages }),
    signal: AbortSignal.timeout(45000),
  });

  if (!response.ok) throw new Error(`OpenRouter error ${response.status}`);
  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("Empty response");
  return content.trim();
}
