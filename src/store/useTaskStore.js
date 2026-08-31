import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuid } from "uuid";
import { personaGuidance } from "../lib/persona";
import { todayKey, isBeforeToday } from "../lib/date";
import { auth } from "../lib/firebase";
import { clearAllQuickTaskDocs, DEFAULT_WORKSPACE_ID, LABEL_COLORS, makeDefaultWorkspace, removeQuickLabelDoc, removeQuickTaskDoc, removeQuickWorkspaceDoc, upsertQuickLabel, upsertQuickTask, upsertQuickWorkspace, WORKSPACE_COLORS } from "../lib/quickTaskService";
import { applyAchievementsToFlows } from "../lib/flowAchievements";
import { clearAllFollowFlowDocs, DEFAULT_FLOW_CATEGORY_ID, FLOW_COLORS, flowCategories, flowColorValue, isFlowStepActiveOnDay, nextFlowCategoryColor, reorderAnyOrderInCategory, removeFollowFlowDoc, rollEverydayFlow, stepCategoryId, upsertFollowFlow } from "../lib/flowService";
import { markAppDataCleared } from "../lib/appStateService";
import { clearAllCollabDocs } from "../lib/collabService";
import { deleteGoogleTask } from "../lib/googleTasksService";

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

function syncWorkspaceUpsert(workspace) {
  const uid = auth.currentUser?.uid;
  if (!uid || !workspace) return;
  upsertQuickWorkspace(uid, workspace).catch((err) => {
    console.warn("Workspace upsert failed:", err);
  });
}

function syncWorkspaceRemove(id) {
  const uid = auth.currentUser?.uid;
  if (!uid || !id) return;
  removeQuickWorkspaceDoc(uid, id).catch((err) => {
    console.warn("Workspace delete failed:", err);
  });
}

function syncLabelUpsert(label) {
  const uid = auth.currentUser?.uid;
  if (!uid || !label) return;
  upsertQuickLabel(uid, label).catch((err) => {
    console.warn("Label upsert failed:", err);
  });
}

function syncLabelRemove(id) {
  const uid = auth.currentUser?.uid;
  if (!uid || !id) return;
  removeQuickLabelDoc(uid, id).catch((err) => {
    console.warn("Label delete failed:", err);
  });
}

function syncFlowUpsert(flow) {
  const uid = auth.currentUser?.uid;
  if (!uid || !flow) return;
  upsertFollowFlow(uid, flow).catch((err) => {
    console.warn("Flow upsert failed:", err);
  });
}

function syncFlowRemove(id) {
  const uid = auth.currentUser?.uid;
  if (!uid || !id) return;
  removeFollowFlowDoc(uid, id).catch((err) => {
    console.warn("Flow delete failed:", err);
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
      quickTasks: [], // { id, title, done, dateKey, workspaceId, dueDate, labelIds[], labelId, createdAt, completedAt }
      quickWorkspaces: [makeDefaultWorkspace()],
      quickLabels: [], // { id, name, color, createdAt }
      followFlows: [], // { id, name, color, steps[], createdAt }
      activeWorkspaceId: DEFAULT_WORKSPACE_ID,
      members: [], // { id, name, username, photoURL }
      persona: [], // selected trait ids from lib/persona.js
      soundEnabled: true,
      streakShields: { month: "", remaining: 2, usedDates: [] },
      customRewards: {}, // { [achievementId]: string }
      dailyMoods: {}, // { [dateKey]: { moodId, note, recordedAt } }
      focusTimer: {
        active: false,
        secondsLeft: 1500,
        mode: "focus",
        running: false,
        taskId: null,
        taskTitle: "",
      },
      googleTasksConnected: false,
      googleTasksToken: null,
      googleTasksTokenExpiresAt: null,
      googleTasksSyncing: false,
      lastGoogleSyncAt: null,
      googleTasksAutoSync: true,
      deletedGoogleTaskIds: [],

      setGoogleTasksAuth: (token, expiresInSeconds = 3600) => {
        const expiresAt = Date.now() + expiresInSeconds * 1000;
        set({
          googleTasksConnected: true,
          googleTasksToken: token,
          googleTasksTokenExpiresAt: expiresAt,
        });
      },

      disconnectGoogleTasks: () => {
        set({
          googleTasksConnected: false,
          googleTasksToken: null,
          googleTasksTokenExpiresAt: null,
          googleTasksSyncing: false,
        });
      },

      setGoogleTasksSyncing: (googleTasksSyncing) => set({ googleTasksSyncing }),

      recordGoogleSyncDone: () => set({ lastGoogleSyncAt: new Date().toISOString(), googleTasksSyncing: false }),

      setGoogleTasksAutoSync: (googleTasksAutoSync) => set({ googleTasksAutoSync }),

      setPersona: (persona) => set({ persona: Array.isArray(persona) ? persona : [] }),
      setSoundEnabled: (val) => set({ soundEnabled: Boolean(val) }),

      getStreakShields: () => {
        const m = todayKey().slice(0, 7);
        const s = get().streakShields;
        if (!s || s.month !== m) {
          return { month: m, remaining: 2, usedDates: [] };
        }
        return s;
      },

      useStreakShield: (dateKey) => {
        const m = todayKey().slice(0, 7);
        const current = get().getStreakShields();
        if (current.remaining <= 0 || current.usedDates.includes(dateKey)) return false;
        const next = {
          month: m,
          remaining: current.remaining - 1,
          usedDates: [...current.usedDates, dateKey],
        };
        set({ streakShields: next });
        return true;
      },

      setCustomReward: (achievementId, rewardText) =>
        set((s) => {
          const next = { ...(s.customRewards || {}) };
          if (rewardText && rewardText.trim()) {
            next[achievementId] = rewardText.trim();
          } else {
            delete next[achievementId];
          }
          return { customRewards: next };
        }),

      recordDailyMood: (dateKey, moodId, note = "") =>
        set((s) => ({
          dailyMoods: {
            ...(s.dailyMoods || {}),
            [dateKey]: {
              moodId,
              note: (note || "").trim().slice(0, 140),
              recordedAt: new Date().toISOString(),
            },
          },
        })),

      setFocusTimer: (updater) =>
        set((s) => ({
          focusTimer:
            typeof updater === "function"
              ? updater(s.focusTimer)
              : { ...s.focusTimer, ...updater },
        })),

      // ---------- Quick tasks (manual checklist, synced to Firestore) ----------
      setQuickTasks: (quickTasks) =>
        set({ quickTasks: Array.isArray(quickTasks) ? quickTasks : [] }),

      setQuickWorkspaces: (quickWorkspaces) => {
        const list = Array.isArray(quickWorkspaces) && quickWorkspaces.length
          ? quickWorkspaces
          : [makeDefaultWorkspace()];
        set((s) => {
          const stillThere = list.some((w) => w.id === s.activeWorkspaceId);
          return {
            quickWorkspaces: list,
            activeWorkspaceId: stillThere ? s.activeWorkspaceId : DEFAULT_WORKSPACE_ID,
          };
        });
      },

      setQuickLabels: (quickLabels) =>
        set({ quickLabels: Array.isArray(quickLabels) ? quickLabels : [] }),

      setFollowFlows: (followFlows) =>
        set({ followFlows: Array.isArray(followFlows) ? followFlows : [] }),

      setActiveWorkspaceId: (id) =>
        set({ activeWorkspaceId: id || DEFAULT_WORKSPACE_ID }),

      applyRemoteDataClear: (clearedAt) => {
        const at = Number(clearedAt) || 0;
        set({
          dataClearedAt: at,
          tasks: [],
          quickTasks: [],
          quickWorkspaces: [makeDefaultWorkspace()],
          quickLabels: [],
          followFlows: [],
          activeWorkspaceId: DEFAULT_WORKSPACE_ID,
          persona: [],
          dailyMoods: {},
          streakShields: { month: "", remaining: 2, usedDates: [] },
          customRewards: {},
          members: [],
          connections: [],
          incomingRequests: [],
          assignedByMe: [],
          assignedToMe: [],
        });
      },

      addQuickTask: ({ title, dateKey, workspaceId, dueDate, labelId, labelIds }) => {
        const clean = title?.trim();
        if (!clean) return null;
        const ws = workspaceId || get().activeWorkspaceId || DEFAULT_WORKSPACE_ID;
        const due = dueDate && String(dueDate).trim() ? String(dueDate).trim() : null;
        const normalizedLabelIds = Array.isArray(labelIds)
          ? labelIds.filter(Boolean).map((x) => String(x).trim()).filter(Boolean)
          : labelId && String(labelId).trim()
            ? [String(labelId).trim()]
            : [];
        const label = normalizedLabelIds[0] || null;
        const item = {
          id: uuid(),
          title: clean,
          done: false,
          dateKey: dateKey || todayKey(),
          workspaceId: ws,
          dueDate: due,
          labelIds: normalizedLabelIds,
          labelId: label,
          createdAt: new Date().toISOString(),
          completedAt: null,
        };
        set((s) => ({ quickTasks: [item, ...s.quickTasks] }));
        syncQuickUpsert(item);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("trigger-google-sync"));
        }
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
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("trigger-google-sync"));
        }
      },

      addQuickTaskLabel: (taskId, labelId) => {
        if (!taskId || !labelId) return;
        const nextLabel = String(labelId).trim();
        if (!nextLabel) return;
        let next = null;
        set((s) => ({
          quickTasks: s.quickTasks.map((t) => {
            if (t.id !== taskId) return t;
            const cur = Array.isArray(t.labelIds) ? t.labelIds : t.labelId ? [t.labelId] : [];
            if (cur.includes(nextLabel)) return t;
            const labelIds2 = [...cur, nextLabel];
            next = { ...t, labelIds: labelIds2, labelId: labelIds2[0] || null };
            return next;
          }),
        }));
        if (next) syncQuickUpsert(next);
      },

      removeQuickTaskLabel: (taskId, labelId) => {
        if (!taskId || !labelId) return;
        const target = String(labelId).trim();
        if (!target) return;
        let next = null;
        set((s) => ({
          quickTasks: s.quickTasks.map((t) => {
            if (t.id !== taskId) return t;
            const cur = Array.isArray(t.labelIds) ? t.labelIds : t.labelId ? [t.labelId] : [];
            if (!cur.includes(target)) return t;
            const labelIds2 = cur.filter((x) => x !== target);
            next = { ...t, labelIds: labelIds2, labelId: labelIds2[0] || null };
            return next;
          }),
        }));
        if (next) syncQuickUpsert(next);
      },

      clearQuickTaskLabels: (taskId) => {
        if (!taskId) return;
        let next = null;
        set((s) => ({
          quickTasks: s.quickTasks.map((t) => {
            if (t.id !== taskId) return t;
            next = { ...t, labelIds: [], labelId: null };
            return next;
          }),
        }));
        if (next) syncQuickUpsert(next);
      },

      updateQuickTask: (id, patch = {}) => {
        if (!id || !patch) return;
        let next = null;
        set((s) => ({
          quickTasks: s.quickTasks.map((t) => {
            if (t.id !== id) return t;
            next = { ...t, ...patch };
            return next;
          }),
        }));
        if (next) syncQuickUpsert(next);
      },

      addSubtask: (taskId, text) => {
        if (!taskId || !text?.trim()) return;
        const clean = text.trim();
        const subId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        let next = null;
        set((s) => ({
          quickTasks: s.quickTasks.map((t) => {
            if (t.id !== taskId) return t;
            const curSubs = Array.isArray(t.subtasks) ? t.subtasks : [];
            const newSub = { id: subId, text: clean, done: false, createdAt: new Date().toISOString() };
            next = { ...t, subtasks: [...curSubs, newSub] };
            return next;
          }),
        }));
        if (next) syncQuickUpsert(next);
      },

      toggleSubtask: (taskId, subtaskId) => {
        if (!taskId || !subtaskId) return;
        let next = null;
        set((s) => ({
          quickTasks: s.quickTasks.map((t) => {
            if (t.id !== taskId) return t;
            const curSubs = Array.isArray(t.subtasks) ? t.subtasks : [];
            const nextSubs = curSubs.map((st) =>
              st.id === subtaskId
                ? { ...st, done: !st.done, completedAt: !st.done ? new Date().toISOString() : null }
                : st
            );
            next = { ...t, subtasks: nextSubs };
            return next;
          }),
        }));
        if (next) syncQuickUpsert(next);
      },

      deleteSubtask: (taskId, subtaskId) => {
        if (!taskId || !subtaskId) return;
        let next = null;
        set((s) => ({
          quickTasks: s.quickTasks.map((t) => {
            if (t.id !== taskId) return t;
            const curSubs = Array.isArray(t.subtasks) ? t.subtasks : [];
            next = { ...t, subtasks: curSubs.filter((st) => st.id !== subtaskId) };
            return next;
          }),
        }));
        if (next) syncQuickUpsert(next);
      },

      snoozeQuickTask: (id, newDateKey) => {
        if (!id || !newDateKey) return;
        let next = null;
        set((s) => ({
          quickTasks: s.quickTasks.map((t) => {
            if (t.id !== id) return t;
            next = {
              ...t,
              dateKey: newDateKey,
              dueDate: newDateKey,
            };
            return next;
          }),
        }));
        if (next) syncQuickUpsert(next);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("trigger-google-sync"));
        }
      },

      deleteQuickTask: (id) => {
        const state = get();
        const task = (state.quickTasks || []).find((t) => t.id === id);
        const gtId = task?.googleTaskId || (typeof id === "string" && id.startsWith("gt_") ? id.slice(3) : null);
        const gtListId = task?.googleListId || "@default";
        const token = state.googleTasksToken;
        const connected = state.googleTasksConnected;

        if (gtId) {
          const deletedList = Array.from(new Set([...(state.deletedGoogleTaskIds || []), gtId]));
          set({ deletedGoogleTaskIds: deletedList });

          if (connected && token) {
            deleteGoogleTask(token, gtListId, gtId).catch((err) =>
              console.warn("Immediate Google Task delete failed:", err)
            );
          }
        }

        set((s) => ({ quickTasks: s.quickTasks.filter((t) => t.id !== id) }));
        syncQuickRemove(id);

        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("trigger-google-sync"));
        }
      },

      addQuickWorkspace: ({ name, color }) => {
        const clean = name?.trim();
        if (!clean) return null;
        const picked = WORKSPACE_COLORS.find((c) => c.id === color || c.value === color);
        const colorValue = picked?.value || WORKSPACE_COLORS[0].value;
        const item = {
          id: uuid(),
          name: clean.slice(0, 40),
          color: colorValue,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          quickWorkspaces: [...(s.quickWorkspaces || []), item],
          activeWorkspaceId: item.id,
        }));
        syncWorkspaceUpsert(item);
        return item;
      },

      renameQuickWorkspace: (id, name) => {
        const clean = name?.trim();
        if (!id || !clean || id === DEFAULT_WORKSPACE_ID) return;
        let next = null;
        set((s) => ({
          quickWorkspaces: (s.quickWorkspaces || []).map((w) => {
            if (w.id !== id) return w;
            next = { ...w, name: clean.slice(0, 40) };
            return next;
          }),
        }));
        if (next) syncWorkspaceUpsert(next);
      },

      /** Moves tasks into Personal, then removes the workspace. */
      deleteQuickWorkspace: (id) => {
        if (!id || id === DEFAULT_WORKSPACE_ID) return;
        const moved = [];
        set((s) => {
          const quickTasks = s.quickTasks.map((t) => {
            if ((t.workspaceId || DEFAULT_WORKSPACE_ID) !== id) return t;
            const next = { ...t, workspaceId: DEFAULT_WORKSPACE_ID };
            moved.push(next);
            return next;
          });
          return {
            quickTasks,
            quickWorkspaces: (s.quickWorkspaces || []).filter((w) => w.id !== id),
            activeWorkspaceId:
              s.activeWorkspaceId === id ? DEFAULT_WORKSPACE_ID : s.activeWorkspaceId,
          };
        });
        moved.forEach((t) => syncQuickUpsert(t));
        syncWorkspaceRemove(id);
      },

      addQuickLabel: ({ name, color }) => {
        const clean = name?.trim();
        if (!clean) return null;
        const picked = LABEL_COLORS.find((c) => c.id === color || c.value === color);
        const colorValue = picked?.value || LABEL_COLORS[0].value;
        const item = {
          id: uuid(),
          name: clean.slice(0, 28),
          color: colorValue,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ quickLabels: [...(s.quickLabels || []), item] }));
        syncLabelUpsert(item);
        return item;
      },

      deleteQuickLabel: (id) => {
        if (!id) return;
        const touched = [];
        const touchedFlows = [];
        set((s) => {
          const quickTasks = s.quickTasks.map((t) => {
            const cur = Array.isArray(t.labelIds) ? t.labelIds : t.labelId ? [t.labelId] : [];
            if (!cur.includes(id)) return t;
            const labelIds2 = cur.filter((x) => x !== id);
            const next = { ...t, labelIds: labelIds2, labelId: labelIds2[0] || null };
            touched.push(next);
            return next;
          });
          const followFlows = (s.followFlows || []).map((f) => {
            const cur = Array.isArray(f.labelIds) ? f.labelIds : [];
            if (!cur.includes(id)) return f;
            const next = { ...f, labelIds: cur.filter((x) => x !== id) };
            touchedFlows.push(next);
            return next;
          });
          return {
            quickTasks,
            followFlows,
            quickLabels: (s.quickLabels || []).filter((l) => l.id !== id),
          };
        });
        touched.forEach((t) => syncQuickUpsert(t));
        touchedFlows.forEach((f) => syncFlowUpsert(f));
        syncLabelRemove(id);
      },

      addFollowFlow: ({ name, color, repeat, endDate, labelIds, anyOrder }) => {
        const clean = name?.trim();
        if (!clean) return null;
        const picked = FLOW_COLORS.find((c) => c.id === color || c.value === color);
        const isDaily = repeat === "daily";
        const labels = Array.isArray(labelIds)
          ? labelIds.filter(Boolean).map((x) => String(x).trim()).filter(Boolean)
          : [];
        const end =
          isDaily && typeof endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(endDate)
            ? endDate
            : null;
        const item = {
          id: uuid(),
          name: clean.slice(0, 48),
          color: flowColorValue(picked?.value || color || FLOW_COLORS[0].value),
          steps: [],
          categories: isDaily
            ? [{ id: DEFAULT_FLOW_CATEGORY_ID, name: "Main", color: "sky" }]
            : [],
          anyOrder: isDaily && Boolean(anyOrder),
          repeat: isDaily ? "daily" : null,
          dayKey: isDaily ? todayKey() : null,
          endDate: end,
          labelIds: labels,
          reports: [],
          achievements: [],
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ followFlows: [item, ...(s.followFlows || [])] }));
        syncFlowUpsert(item);
        return item;
      },

      updateFollowFlow: (id, patch = {}) => {
        if (!id) return null;
        let next = null;
        set((s) => ({
          followFlows: (s.followFlows || []).map((f) => {
            if (f.id !== id) return f;
            const updates = {};
            if (typeof patch.name === "string") {
              const clean = patch.name.trim();
              if (clean) updates.name = clean.slice(0, 48);
            }
            if (Object.prototype.hasOwnProperty.call(patch, "endDate")) {
              const raw = patch.endDate;
              updates.endDate =
                f.repeat === "daily" &&
                typeof raw === "string" &&
                /^\d{4}-\d{2}-\d{2}$/.test(raw)
                  ? raw
                  : null;
            }
            if (Object.prototype.hasOwnProperty.call(patch, "labelIds")) {
              updates.labelIds = Array.isArray(patch.labelIds)
                ? patch.labelIds.filter(Boolean).map((x) => String(x).trim()).filter(Boolean)
                : [];
            }
            if (Object.prototype.hasOwnProperty.call(patch, "anyOrder")) {
              updates.anyOrder = f.repeat === "daily" && Boolean(patch.anyOrder);
            }
            next = { ...f, ...updates };
            return next;
          }),
        }));
        if (next) syncFlowUpsert(next);
        return next;
      },

      /** Archive yesterday + reset Everyday flows when the calendar day changes. */
      rollEverydayFlows: () => {
        const day = todayKey();
        const changedIds = new Set();
        set((s) => {
          const rolled = (s.followFlows || []).map((f) => {
            const result = rollEverydayFlow(f, day);
            if (result.changed) changedIds.add(result.flow.id);
            return result.flow;
          });
          const withBadges = applyAchievementsToFlows(rolled);
          withBadges.forEach((f, i) => {
            if (f !== rolled[i]) changedIds.add(f.id);
          });
          return { followFlows: withBadges };
        });
        const latest = useTaskStore.getState().followFlows || [];
        latest.filter((f) => changedIds.has(f.id)).forEach((f) => syncFlowUpsert(f));
        return changedIds.size;
      },

      deleteFollowFlow: (id) => {
        if (!id) return;
        set((s) => ({
          followFlows: (s.followFlows || []).filter((f) => f.id !== id),
        }));
        syncFlowRemove(id);
      },

      addFlowStep: (flowId, title, opts = {}) => {
        const clean = title?.trim();
        if (!flowId || !clean) return null;
        let next = null;
        const startDate =
          typeof opts.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(opts.startDate)
            ? opts.startDate
            : null;
        const endDate =
          typeof opts.endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(opts.endDate)
            ? opts.endDate
            : null;
        const step = {
          id: uuid(),
          title: clean.slice(0, 120),
          done: false,
          completedAt: null,
          startDate,
          endDate,
          categoryId: null,
        };
        set((s) => ({
          followFlows: (s.followFlows || []).map((f) => {
            if (f.id !== flowId) return f;
            const cats = flowCategories(f);
            const categoryId =
              opts.categoryId && cats.some((c) => c.id === opts.categoryId)
                ? opts.categoryId
                : cats[0]?.id || DEFAULT_FLOW_CATEGORY_ID;
            next = { ...f, steps: [...(f.steps || []), { ...step, categoryId }] };
            return next;
          }),
        }));
        if (next) syncFlowUpsert(next);
        return step;
      },

      updateFlowStep: (flowId, stepId, patch = {}) => {
        if (!flowId || !stepId) return null;
        let next = null;
        set((s) => ({
          followFlows: (s.followFlows || []).map((f) => {
            if (f.id !== flowId) return f;
            const steps = (f.steps || []).map((st) => {
              if (st.id !== stepId) return st;
              const updates = {};
              if (typeof patch.title === "string") {
                const clean = patch.title.trim();
                if (clean) updates.title = clean.slice(0, 120);
              }
              if (Object.prototype.hasOwnProperty.call(patch, "startDate")) {
                const raw = patch.startDate;
                updates.startDate =
                  typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
              }
              if (Object.prototype.hasOwnProperty.call(patch, "endDate")) {
                const raw = patch.endDate;
                updates.endDate =
                  typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
              }
              return { ...st, ...updates };
            });
            next = { ...f, steps };
            return next;
          }),
        }));
        if (next) syncFlowUpsert(next);
        return next;
      },

      toggleFlowStep: (flowId, stepId) => {
        if (!flowId || !stepId) return;
        let next = null;
        const day = todayKey();
        set((s) => ({
          followFlows: (s.followFlows || []).map((f) => {
            if (f.id !== flowId) return f;
            const steps = f.steps || [];
            const index = steps.findIndex((st) => st.id === stepId);
            if (index < 0) return f;
            const everyday = f.repeat === "daily";
            const anyOrder = everyday && Boolean(f.anyOrder);
            const cid = stepCategoryId(steps[index], f);
            if (everyday) {
              if (!isFlowStepActiveOnDay(steps[index], day)) return f;
              if (!anyOrder) {
                for (let i = 0; i < index; i += 1) {
                  if (stepCategoryId(steps[i], f) !== cid) continue;
                  if (!isFlowStepActiveOnDay(steps[i], day)) continue;
                  if (!steps[i].done) return f;
                }
              }
            } else {
              for (let i = 0; i < index; i += 1) {
                if (!steps[i].done) return f;
              }
            }
            const updated = steps.map((st) => {
              if (st.id !== stepId) return st;
              const done = !st.done;
              return {
                ...st,
                done,
                completedAt: done ? new Date().toISOString() : null,
              };
            });
            const unchecked = !updated[index].done;
            let finalSteps = updated;
            if (unchecked && !anyOrder) {
              finalSteps = updated.map((st, i) =>
                i > index && stepCategoryId(st, f) === cid
                  ? { ...st, done: false, completedAt: null }
                  : st
              );
            }
            let nextFlow = { ...f, steps: finalSteps };
            if (anyOrder) {
              nextFlow = {
                ...nextFlow,
                steps: reorderAnyOrderInCategory(nextFlow, cid),
              };
            }
            next = nextFlow;
            return next;
          }),
        }));
        if (next) {
          const all = applyAchievementsToFlows(
            (useTaskStore.getState().followFlows || []).map((f) => (f.id === next.id ? next : f))
          );
          next = all.find((f) => f.id === next.id) || next;
          set((s) => ({
            followFlows: (s.followFlows || []).map((f) => all.find((x) => x.id === f.id) || f),
          }));
          syncFlowUpsert(next);
          all.forEach((f) => {
            if (f.id !== next.id && f.repeat === "daily") syncFlowUpsert(f);
          });
        }
      },

      deleteFlowStep: (flowId, stepId) => {
        if (!flowId || !stepId) return;
        let next = null;
        set((s) => ({
          followFlows: (s.followFlows || []).map((f) => {
            if (f.id !== flowId) return f;
            next = {
              ...f,
              steps: (f.steps || []).filter((st) => st.id !== stepId),
            };
            return next;
          }),
        }));
        if (next) syncFlowUpsert(next);
      },

      reorderFlowSteps: (flowId, fromIndex, toIndex, categoryId = null) => {
        if (!flowId || fromIndex === toIndex) return;
        let next = null;
        set((s) => ({
          followFlows: (s.followFlows || []).map((f) => {
            if (f.id !== flowId) return f;
            const steps = [...(f.steps || [])];
            let from = fromIndex;
            let to = toIndex;
            if (categoryId) {
              const idxs = [];
              steps.forEach((st, i) => {
                if (stepCategoryId(st, f) === categoryId) idxs.push(i);
              });
              from = idxs[fromIndex];
              to = idxs[toIndex];
              if (from == null || to == null) return f;
            }
            if (from < 0 || to < 0 || from >= steps.length || to >= steps.length) return f;
            const [moved] = steps.splice(from, 1);
            steps.splice(to, 0, moved);
            const anyOrder = f.repeat === "daily" && Boolean(f.anyOrder);
            if (anyOrder) {
              next = { ...f, steps };
              return next;
            }
            const cid = categoryId || stepCategoryId(moved, f);
            let sawOpen = false;
            const normalized = steps.map((st) => {
              if (stepCategoryId(st, f) !== cid) return st;
              if (sawOpen) return { ...st, done: false, completedAt: null };
              if (!st.done) {
                sawOpen = true;
                return st;
              }
              return st;
            });
            next = { ...f, steps: normalized };
            return next;
          }),
        }));
        if (next) syncFlowUpsert(next);
      },

      addFlowCategory: (flowId, name, color) => {
        const clean = name?.trim().slice(0, 32);
        if (!flowId || !clean) return null;
        let created = null;
        let next = null;
        set((s) => ({
          followFlows: (s.followFlows || []).map((f) => {
            if (f.id !== flowId || f.repeat !== "daily") return f;
            const cats = flowCategories(f);
            const picked = FLOW_COLORS.find((c) => c.id === color || c.value === color);
            created = {
              id: uuid(),
              name: clean,
              color: picked?.id || nextFlowCategoryColor(cats),
            };
            next = { ...f, categories: [...cats, created] };
            return next;
          }),
        }));
        if (next) syncFlowUpsert(next);
        return created;
      },

      setFlowCategoryColor: (flowId, categoryId, color) => {
        const picked = FLOW_COLORS.find((c) => c.id === color || c.value === color);
        if (!flowId || !categoryId || !picked) return;
        let next = null;
        set((s) => ({
          followFlows: (s.followFlows || []).map((f) => {
            if (f.id !== flowId) return f;
            next = {
              ...f,
              categories: flowCategories(f).map((c) =>
                c.id === categoryId ? { ...c, color: picked.id } : c
              ),
            };
            return next;
          }),
        }));
        if (next) syncFlowUpsert(next);
      },

      renameFlowCategory: (flowId, categoryId, name) => {
        const clean = name?.trim().slice(0, 32);
        if (!flowId || !categoryId || !clean) return;
        let next = null;
        set((s) => ({
          followFlows: (s.followFlows || []).map((f) => {
            if (f.id !== flowId) return f;
            next = {
              ...f,
              categories: flowCategories(f).map((c) =>
                c.id === categoryId ? { ...c, name: clean } : c
              ),
            };
            return next;
          }),
        }));
        if (next) syncFlowUpsert(next);
      },

      deleteFlowCategory: (flowId, categoryId) => {
        if (!flowId || !categoryId) return;
        let next = null;
        set((s) => ({
          followFlows: (s.followFlows || []).map((f) => {
            if (f.id !== flowId) return f;
            const cats = flowCategories(f);
            if (cats.length <= 1) return f;
            const remaining = cats.filter((c) => c.id !== categoryId);
            const fallback = remaining[0].id;
            next = {
              ...f,
              categories: remaining,
              steps: (f.steps || []).map((st) =>
                stepCategoryId(st, f) === categoryId ? { ...st, categoryId: fallback } : st
              ),
            };
            return next;
          }),
        }));
        if (next) syncFlowUpsert(next);
      },

      renameFollowFlow: (id, name) => {
        const clean = name?.trim();
        if (!id || !clean) return;
        let next = null;
        set((s) => ({
          followFlows: (s.followFlows || []).map((f) => {
            if (f.id !== id) return f;
            next = { ...f, name: clean.slice(0, 48) };
            return next;
          }),
        }));
        if (next) syncFlowUpsert(next);
      },

      /** Wipe all task data, quick tasks, flows, mood logs, rewards, and cloud docs for a completely fresh start. */
      resetAppData: async () => {
        const uid = auth.currentUser?.uid;
        const clearedAt = Date.now();
        const wipe = {
          tasks: [],
          quickTasks: [],
          quickWorkspaces: [makeDefaultWorkspace()],
          quickLabels: [],
          followFlows: [],
          activeWorkspaceId: DEFAULT_WORKSPACE_ID,
          persona: [],
          dailyMoods: {},
          streakShields: { month: "", remaining: 2, usedDates: [] },
          customRewards: {},
          members: [],
          connections: [],
          incomingRequests: [],
          assignedByMe: [],
          assignedToMe: [],
          googleTasksConnected: false,
          googleTasksToken: null,
          googleTasksTokenExpiresAt: null,
          googleTasksSyncing: false,
          deletedGoogleTaskIds: [],
          dataClearedAt: clearedAt,
        };
        set(wipe);

        try {
          localStorage.removeItem("seentasks-qt-legacy-migrated");
        } catch {
          // ignore
        }

        if (!uid) return;
        try {
          await markAppDataCleared(uid, clearedAt);
          await clearAllQuickTaskDocs(uid);
          await clearAllFollowFlowDocs(uid);
          await clearAllCollabDocs(uid);
        } catch (err) {
          set(wipe);
          throw err;
        }
        set(wipe);
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
        activeWorkspaceId: state.activeWorkspaceId || DEFAULT_WORKSPACE_ID,
        soundEnabled: state.soundEnabled ?? true,
        streakShields: state.streakShields || { month: "", remaining: 2, usedDates: [] },
        customRewards: state.customRewards || {},
        dailyMoods: state.dailyMoods || {},
        googleTasksConnected: Boolean(state.googleTasksConnected),
        googleTasksToken: state.googleTasksToken || null,
        googleTasksTokenExpiresAt: state.googleTasksTokenExpiresAt || null,
        lastGoogleSyncAt: state.lastGoogleSyncAt || null,
        googleTasksAutoSync: state.googleTasksAutoSync ?? true,
        deletedGoogleTaskIds: state.deletedGoogleTaskIds || [],
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
          quickWorkspaces: _qw,
          quickLabels: _ql,
          followFlows: _ff,
          ...safe
        } = incoming;
        return {
          ...current,
          ...safe,
          quickTasks: [],
          quickWorkspaces: [makeDefaultWorkspace()],
          quickLabels: [],
          followFlows: [],
          onePassword: null,
          activeWorkspaceId: safe.activeWorkspaceId || DEFAULT_WORKSPACE_ID,
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
        delete next.quickWorkspaces;
        return next;
      },
    }
  )
);

export { MAX_ITERATION };
