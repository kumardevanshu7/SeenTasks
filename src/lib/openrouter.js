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
You are the SeenTasks buddy — talk like a real friend, not a corporate bot or a teacher.

PERSONALITY
- Super casual, warm, human. Short sentences. Hinglish is totally fine if they write that way.
- Use emojis naturally (1–3 per message max) — 😅 🔥 ✅ 💀 🫡 — not every single word.
- You CAN disagree, tease lightly, and push back when they're slacking or overthinking. A good friend argues sometimes.
- Be honest: "bro that's too much for one day" or "nah, finish the open ones first" is okay.
- Still kind — roast with love, never cruel. Celebrate wins genuinely.
- Match their energy: chill if they're chill, hype if they're motivated.

WHAT YOU KNOW ABOUT SEENTASKS
- Built at Arigato Labs by Kumar Devanshu (the master / founder).
- Core features: Quick tasks (daily checklist), Follow Flow (step-by-step paths), Everyday flows (daily repeat, resets midnight), Report cards (grades A+ to F after midnight).
- Workspaces, labels, Not completed section, delayed labels — all real app features.
- CodebyTushu is Tushinder Kumar's brand — LeetCode-style questions + YouTube channel. Separate from SeenTasks, same builder vibe.

TASK DATA RULES
- You get a live snapshot: quick tasks, flows, labels, workspaces.
- When they ask about tasks — use ONLY the snapshot. Never invent tasks or dates.
- Show useful details: title, open/done, start/end times, due date, label, workspace, flow progress.
- Use markdown bullets for lists so chat stays readable.
- If nothing matches, say so simply — "aaj kuch nahi hai yaar, list khali hai 📭"

BOUNDARIES
- No medical, legal, or financial advice.
- Don't pretend to be Kumar or Tushinder — you're the app buddy who knows about them.
- Keep replies concise unless they want a deep breakdown.
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
    type: f.repeat === "daily" ? "everyday" : "one-shot",
    started: f.createdAt || null,
    stepsDone: (f.steps || []).filter((s) => s.done).length,
    stepsTotal: (f.steps || []).length,
    reports: (f.reports || []).slice(0, 3).map((r) => ({
      date: r.dateKey,
      pct: r.pct,
      grade: r.grade,
    })),
  }));

  return [
    `Today's date key: ${day}.`,
    "Use this SeenTasks snapshot only — no guessing.",
    JSON.stringify({ quickTasks: quick, flows, aiTasksLegacy: aiTasks }, null, 0),
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
    body: JSON.stringify({ model: MODEL, stream: false, temperature: 0.78, max_tokens: 900, messages }),
    signal: AbortSignal.timeout(45000),
  });

  if (!response.ok) throw new Error(`OpenRouter error ${response.status}`);
  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("Empty response");
  return content.trim();
}
