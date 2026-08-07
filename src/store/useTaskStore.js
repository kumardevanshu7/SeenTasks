import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuid } from "uuid";
import { personaGuidance } from "../lib/persona";
import { todayKey, isBeforeToday } from "../lib/date";
import { auth } from "../lib/firebase";
import { clearAllQuickTaskDocs, removeQuickTaskDoc, upsertQuickTask } from "../lib/quickTaskService";
import { markAppDataCleared } from "../lib/appStateService";

const MAX_ITERATION = 10;

async function runAnalyze(title, description, persona) {
  const { analyzeTask } = await import("../lib/aiAnalyzer");
  return analyzeTask(title, description, persona);
}

function isTaskAfterClear(task, clearedAt) {
  const cut = Number(clearedAt) || 0;
  if (!cut) return true;
  const created = new Date(task?.createdAt || 0).getTime();
  if (Number.isNaN(created)) return false;
  return created > cut;
}

function syncQuickUpsert(task) {
  const uid = auth.currentUser?.uid;
  if (!uid || !task) return;
  // Block writes that belong to a wiped generation (reset / remote clear).
  if (!isTaskAfterClear(task, useTaskStore.getState().dataClearedAt)) return;
  upsertQuickTask(uid, task).catch((err) => {
    console.warn("Quick task upsert failed:", err);
  });
}

function syncQuickRemove(id) {
  const uid = auth.currentUser?.uid;
  if (!uid || !id) return;
  removeQuickTaskDoc(uid, id).catch((err) => {
    console.warn("Quick task delete failed:", err);
  });
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
      dataClearedAt: 0, // millis — shared wipe marker so devices don't re-upload old locals
      members: [], // { id, name, username, photoURL }
      persona: [], // selected trait ids from lib/persona.js

      setPersona: (persona) => set({ persona: Array.isArray(persona) ? persona : [] }),

      // ---------- Quick tasks (manual checklist, synced to Firestore) ----------
      setQuickTasks: (quickTasks) =>
        set({ quickTasks: Array.isArray(quickTasks) ? quickTasks : [] }),

      applyRemoteDataClear: (clearedAt) => {
        const at = Number(clearedAt) || 0;
        set({
          dataClearedAt: at,
          tasks: [],
          quickTasks: [],
          persona: [],
        });
      },

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

      /** Wipe local task data + cloud quick tasks. Keeps One Password, auth, collab. */
      resetAppData: async () => {
        const uid = auth.currentUser?.uid;
        const clearedAt = Date.now();
        // Mark wipe first so sync/migrate cannot resurrect old locals mid-delete.
        set({ tasks: [], quickTasks: [], persona: [], dataClearedAt: clearedAt });
        if (!uid) return;
        try {
          await markAppDataCleared(uid, clearedAt);
          await clearAllQuickTaskDocs(uid);
        } catch (err) {
          // Keep dataClearedAt so in-flight upserts stay blocked; surface failure to UI.
          set({ tasks: [], quickTasks: [], persona: [], dataClearedAt: clearedAt });
          throw err;
        }
        // Snapshot races can briefly refill — force empty after cloud delete.
        set({ tasks: [], quickTasks: [], persona: [], dataClearedAt: clearedAt });
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

      // One Password — Firebase only; memory holds { question, answerHash, updatedAt }
      onePassword: null,
      setOnePassword: (onePassword) => {
        if (!onePassword?.question?.trim() || !onePassword?.answerHash?.trim()) {
          set({ onePassword: null });
          return;
        }
        set({
          onePassword: {
            question: String(onePassword.question).trim(),
            answerHash: String(onePassword.answerHash).trim(),
            updatedAt: onePassword.updatedAt || Date.now(),
          },
        });
      },
      clearOnePassword: () => set({ onePassword: null }),

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
      version: 3,
      // Quick tasks live in Firestore only — do not mirror them in localStorage.
      partialize: (state) => ({
        tasks: state.tasks,
        members: state.members,
        persona: state.persona,
        dataClearedAt: state.dataClearedAt || 0,
      }),
      // Strip secrets / obsolete keys from older localStorage snapshots.
      merge: (persisted, current) => {
        const incoming = persisted && typeof persisted === "object" ? persisted : {};
        const {
          onePassword: _op,
          quickDeletePassword: _qp,
          connections: _c,
          incomingRequests: _ir,
          assignedByMe: _ab,
          assignedToMe: _at,
          quickTasks: _qt,
          ...safe
        } = incoming;
        return {
          ...current,
          ...safe,
          quickTasks: [],
          onePassword: null,
        };
      },
      migrate: (persisted, version) => {
        if (!persisted || typeof persisted !== "object") return persisted;
        const next = { ...persisted };
        delete next.onePassword;
        delete next.quickDeletePassword;
        if (version < 3) {
          delete next.quickTasks;
        }
        return next;
      },
    }
  )
);

export { MAX_ITERATION };
