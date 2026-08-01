import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuid } from "uuid";
import { personaGuidance } from "../lib/persona";
import { todayKey, isBeforeToday } from "../lib/date";
import { auth } from "../lib/firebase";
import { removeQuickTaskDoc, upsertQuickTask } from "../lib/quickTaskService";

const MAX_ITERATION = 10;

async function runAnalyze(title, description, persona) {
  const { analyzeTask } = await import("../lib/aiAnalyzer");
  return analyzeTask(title, description, persona);
}

function syncQuickUpsert(task) {
  const uid = auth.currentUser?.uid;
  if (!uid || !task) return;
  upsertQuickTask(uid, task).catch(() => {});
}

function syncQuickRemove(id) {
  const uid = auth.currentUser?.uid;
  if (!uid || !id) return;
  removeQuickTaskDoc(uid, id).catch(() => {});
}

function makeTask({ title, description = "", dateKey = todayKey(), firstDateKey, assignedTo = null, assignedBy = null, analysis }) {
  return {
    id: uuid(),
    title,
    description,
    dateKey,
    firstDateKey: firstDateKey || dateKey,
    category: analysis.category,
    reasoning: analysis.reasoning,
    suggestedWindow: analysis.suggestedWindow,
    wellbeingNote: analysis.wellbeingNote,
    confidence: analysis.confidence,
    signals: analysis.signals || [],
    analyzedAt: analysis.analyzedAt,
    analysisSource: analysis.source,
    analysisModel: analysis.model,
    status: "active",
    iteration: 0,
    createdAt: new Date().toISOString(),
    completedAt: null,
    abortedAt: null,
    isBinTask: false,
    assignedTo,
    assignedBy,
  };
}

export const useTaskStore = create(
  persist(
    (set, get) => ({
      tasks: [],
      quickTasks: [], // { id, title, done, dateKey, createdAt, completedAt } — manual checklist, no AI
      members: [], // { id, name, username, photoURL }
      persona: [], // selected trait ids from lib/persona.js

      setPersona: (persona) => set({ persona: Array.isArray(persona) ? persona : [] }),

      // ---------- Quick tasks (manual checklist, synced to Firestore) ----------
      setQuickTasks: (quickTasks) =>
        set({ quickTasks: Array.isArray(quickTasks) ? quickTasks : [] }),

      addQuickTask: ({ title, dateKey }) => {
        const clean = title?.trim();
        if (!clean) return null;
        const item = {
          id: uuid(),
          title: clean,
          done: false,
          dateKey: dateKey || todayKey(),
          createdAt: new Date().toISOString(),
          completedAt: null,
        };
        set((s) => ({ quickTasks: [item, ...s.quickTasks] }));
        syncQuickUpsert(item);
        return item;
      },

      toggleQuickTask: (id) => {
        let next = null;
        set((s) => ({
          quickTasks: s.quickTasks.map((t) => {
            if (t.id !== id) return t;
            next = {
              ...t,
              done: !t.done,
              completedAt: !t.done ? new Date().toISOString() : null,
            };
            return next;
          }),
        }));
        if (next) syncQuickUpsert(next);
      },

      deleteQuickTask: (id) => {
        set((s) => ({ quickTasks: s.quickTasks.filter((t) => t.id !== id) }));
        syncQuickRemove(id);
      },

      applyQuickLabel: (id, tag, patternSource) => {
        const tagText = String(tag || "").trim();
        if (!id || !tagText) return;
        const re = patternSource instanceof RegExp
          ? new RegExp(patternSource.source, patternSource.flags.includes("g") ? patternSource.flags : `${patternSource.flags}g`)
          : null;
        let next = null;
        set((s) => ({
          quickTasks: s.quickTasks.map((t) => {
            if (t.id !== id) return t;
            if (re) {
              re.lastIndex = 0;
              if (re.test(t.title || "")) return t;
            } else if ((t.title || "").toLowerCase().includes(tagText.toLowerCase())) {
              return t;
            }
            next = { ...t, title: `${(t.title || "").trim()} ${tagText}`.trim() };
            return next;
          }),
        }));
        if (next) syncQuickUpsert(next);
      },

      quickDeletePassword: "",
      setQuickDeletePassword: (password) =>
        set({ quickDeletePassword: String(password || "").trim() }),

      // Collaboration (Firestore-backed, kept in sync by useCollabSync)
      connections: [],
      incomingRequests: [],
      assignedByMe: [],
      assignedToMe: [],
      setConnections: (connections) => set({ connections }),
      setIncomingRequests: (incomingRequests) => set({ incomingRequests }),
      setAssignedByMe: (assignedByMe) => set({ assignedByMe }),
      setAssignedToMe: (assignedToMe) => set({ assignedToMe }),

      // ---------- Task CRUD ----------
      // dateKey lets the user add tasks to today or a previous day.
      addTask: async ({ title, description, dateKey }) => {
        if (!title?.trim()) return null;
        const cleanTitle = title.trim();
        const cleanDescription = description?.trim() || "";
        const targetDate = dateKey || todayKey();
        const analysis = await runAnalyze(cleanTitle, cleanDescription, personaGuidance(get().persona));
        const task = makeTask({
          title: cleanTitle,
          description: cleanDescription,
          dateKey: targetDate,
          firstDateKey: targetDate,
          analysis,
        });
        set((state) => ({ tasks: [task, ...state.tasks] }));
        return { task, analysis };
      },

      completeTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? { ...t, status: "completed", completedAt: new Date().toISOString() }
              : t
          ),
        })),

      reopenTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, status: "active", completedAt: null } : t
          ),
        })),

      abortTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? { ...t, status: "aborted", abortedAt: new Date().toISOString() }
              : t
          ),
        })),

      // Restore from bin -> comes back as an active task today, labeled "Bin Task"
      restoreFromBin: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status: "active",
                  isBinTask: true,
                  abortedAt: null,
                  dateKey: todayKey(),
                }
              : t
          ),
        })),

      deleteForever: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      // ---------- Recall previous incomplete tasks ----------
      recallIncomplete: () => {
        const today = todayKey();
        set((s) => ({
          tasks: s.tasks.map((t) => {
            const isIncompleteFromPast =
              t.status === "active" && isBeforeToday(t.dateKey) && t.dateKey !== today;
            if (!isIncompleteFromPast) return t;
            return {
              ...t,
              dateKey: today,
              iteration: Math.min(t.iteration + 1, MAX_ITERATION),
            };
          }),
        }));
      },

      // ---------- Re-analyze (manual re-run of AI) ----------
      reanalyzeTask: async (id) => {
        const task = get().tasks.find((item) => item.id === id);
        if (!task) return null;
        const analysis = await runAnalyze(task.title, task.description, personaGuidance(get().persona));
        set((state) => ({
          tasks: state.tasks.map((item) => item.id === id ? {
            ...item,
            category: analysis.category,
            reasoning: analysis.reasoning,
            suggestedWindow: analysis.suggestedWindow,
            wellbeingNote: analysis.wellbeingNote,
            confidence: analysis.confidence,
            signals: analysis.signals || [],
            analyzedAt: analysis.analyzedAt,
            analysisSource: analysis.source,
            analysisModel: analysis.model,
          } : item),
        }));
        return analysis;
      },

      // ---------- Collaboration ----------
      addMember: ({ id, name, username = "", photoURL = "" }) => {
        if (!id || !name?.trim()) return;
        set((state) => state.members.some((member) => member.id === id) ? state : ({
          members: [...state.members, { id, name: name.trim(), username, photoURL }],
        }));
      },

      setMembers: (members) => set({ members }),

      removeMember: (id) =>
        set((state) => ({ members: state.members.filter((member) => member.id !== id) })),

      // ---------- Selectors (plain helpers, not reactive) ----------
      getTodayTasks: () => {
        const today = todayKey();
        return get().tasks.filter((t) => t.dateKey === today && t.status !== "aborted");
      },
      getBinTasks: () => get().tasks.filter((t) => t.status === "aborted"),
      getPastIncompleteCount: () => {
        const today = todayKey();
        return get().tasks.filter(
          (t) => t.status === "active" && isBeforeToday(t.dateKey) && t.dateKey !== today
        ).length;
      },
    }),
    {
      name: "seentasks-store",
      partialize: (state) => ({
        tasks: state.tasks,
        quickTasks: state.quickTasks,
        members: state.members,
        persona: state.persona,
        quickDeletePassword: state.quickDeletePassword,
      }),
    }
  )
);

export { MAX_ITERATION };
