import { useEffect } from "react";
import { useAuth } from "./useAuth";
import { useTaskStore } from "../store/useTaskStore";
import { isCreatedAfterClear, loadAppState } from "../lib/appStateService";
import {
  ensureDefaultWorkspace,
  listenQuickLabels,
  listenQuickTasks,
  listenQuickWorkspaces,
  migrateLocalQuickTasks,
} from "../lib/quickTaskService";
import {
  listenFollowFlows,
  pruneDuplicate1HrFlows,
  removeFollowFlowDoc,
} from "../lib/flowService";
import { listenUserTasks, migrateLocalUserTasks } from "../lib/taskService";
import { listenDailyMoods, migrateLocalDailyMoods } from "../lib/moodService";
import { listenFocusSessions } from "../lib/focusSessionService";

const LEGACY_MIGRATE_FLAG = "seentasks-qt-legacy-migrated";

function readLegacyLocalQuickTasks() {
  if (typeof window === "undefined") return [];
  try {
    if (localStorage.getItem(LEGACY_MIGRATE_FLAG) === "1") return [];
    const raw = localStorage.getItem("seentasks-store");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const state = parsed?.state && typeof parsed.state === "object" ? parsed.state : parsed;
    return Array.isArray(state?.quickTasks) ? state.quickTasks.filter((t) => t?.id) : [];
  } catch {
    return [];
  }
}

function markLegacyMigrated() {
  try {
    localStorage.setItem(LEGACY_MIGRATE_FLAG, "1");
  } catch {
    // ignore
  }
}

export function useQuickTasksSync() {
  const { user, loading } = useAuth();
  const setQuickTasks = useTaskStore((s) => s.setQuickTasks);
  const setQuickWorkspaces = useTaskStore((s) => s.setQuickWorkspaces);
  const setQuickLabels = useTaskStore((s) => s.setQuickLabels);
  const setFollowFlows = useTaskStore((s) => s.setFollowFlows);
  const setTasks = useTaskStore((s) => s.setTasks);
  const setDailyMoods = useTaskStore((s) => s.setDailyMoods);
  const setFocusHistory = useTaskStore((s) => s.setFocusHistory);

  useEffect(() => {
    // Wait until Firebase Auth resolves so we don't clear the store prematurely
    if (loading) return undefined;

    if (!user?.uid) {
      setQuickTasks([]);
      setQuickWorkspaces([]);
      setQuickLabels([]);
      setFollowFlows([]);
      return undefined;
    }

    let active = true;
    const uid = user.uid;
    let unsubQuickTasks = null;
    let unsubSpaces = null;
    let unsubLabels = null;
    let unsubFlows = null;
    let unsubBoardTasks = null;
    let unsubMoods = null;
    let unsubFocusSessions = null;
    let clearedAt = useTaskStore.getState().dataClearedAt || 0;

    (async () => {
      try {
        const remote = await loadAppState(uid);
        if (!active) return;
        clearedAt = remote.dataClearedAt || 0;
        const localCleared = useTaskStore.getState().dataClearedAt || 0;

        if (clearedAt > localCleared) {
          useTaskStore.getState().applyRemoteDataClear(clearedAt);
        } else if (clearedAt > 0 && clearedAt !== localCleared) {
          useTaskStore.setState({ dataClearedAt: clearedAt });
        }

        const legacy = readLegacyLocalQuickTasks().filter((t) =>
          isCreatedAfterClear(t, clearedAt)
        );

        await ensureDefaultWorkspace(uid);
        if (legacy.length) {
          await migrateLocalQuickTasks(uid, legacy, clearedAt);
        }
        markLegacyMigrated();

        // Migrate local board tasks and daily moods to Firestore (one-time on first sync)
        const localState = useTaskStore.getState();
        const localTasks = Array.isArray(localState.tasks) ? localState.tasks : [];
        if (localTasks.length) {
          await migrateLocalUserTasks(uid, localTasks, clearedAt).catch((err) =>
            console.warn("Board tasks migration failed:", err)
          );
        }
        const localMoods = localState.dailyMoods || {};
        if (Object.keys(localMoods).length) {
          await migrateLocalDailyMoods(uid, localMoods, clearedAt).catch((err) =>
            console.warn("Daily moods migration failed:", err)
          );
        }
      } catch (err) {
        console.warn("Quick tasks bootstrap failed:", err);
      }

      if (!active) return;

      unsubSpaces = listenQuickWorkspaces(
        uid,
        (items) => {
          if (!active) return;
          setQuickWorkspaces(items);
        },
        (error) => console.warn("Workspaces listener error:", error)
      );

      unsubLabels = listenQuickLabels(
        uid,
        (items) => {
          if (!active) return;
          setQuickLabels(items);
        },
        (error) => console.warn("Labels listener error:", error)
      );

      unsubFlows = listenFollowFlows(
        uid,
        (items) => {
          if (!active) return;
          const cut = Math.max(useTaskStore.getState().dataClearedAt || 0, clearedAt || 0);
          const cloud = (items || []).filter((f) => {
            if (!cut) return true;
            if (isCreatedAfterClear(f, cut)) return true;
            const updated = new Date(f.updatedAt || f.createdAt || 0).getTime();
            if (!Number.isNaN(updated) && updated > cut) return true;
            if (Array.isArray(f.steps) && f.steps.length > 0) return true;
            return false;
          });

          // Firestore is source of truth; avoid resurrecting deleted flows/steps
          const deduped = pruneDuplicate1HrFlows(cloud, (dupId) => {
            removeFollowFlowDoc(uid, dupId).catch((err) =>
              console.warn("Failed to remove duplicate 1hr flow doc:", err)
            );
          });
          setFollowFlows(deduped);
        },
        (error) => console.warn("Flows listener error:", error)
      );

      unsubQuickTasks = listenQuickTasks(
        uid,
        (items) => {
          if (!active) return;
          const cut = Math.max(useTaskStore.getState().dataClearedAt || 0, clearedAt || 0);
          const cloud = (items || []).filter((t) => isCreatedAfterClear(t, cut));

          // Firestore is source of truth; sort stably by descending creation date
          const sorted = [...cloud].sort((a, b) => {
            const ta = new Date(a?.createdAt || 0).getTime();
            const tb = new Date(b?.createdAt || 0).getTime();
            return tb - ta;
          });
          setQuickTasks(sorted);
        },
        (error) => console.warn("Quick tasks listener error:", error)
      );

      // Listen to board tasks (Today page tasks) in real time
      unsubBoardTasks = listenUserTasks(
        uid,
        (items) => {
          if (!active) return;
          const cut = Math.max(useTaskStore.getState().dataClearedAt || 0, clearedAt || 0);
          // Filter out tasks that predate a data clear
          const cloud = cut
            ? items.filter((t) => isCreatedAfterClear(t, cut))
            : items;
          setTasks(cloud);
        },
        (error) => console.warn("Board tasks listener error:", error)
      );

      // Listen to daily moods in real time
      unsubMoods = listenDailyMoods(
        uid,
        (moodsMap) => {
          if (!active) return;
          setDailyMoods(moodsMap);
        },
        (error) => console.warn("Daily moods listener error:", error)
      );

      // Listen to focus sessions in real time — Firestore is source of truth
      // This prevents stale localStorage data from surviving a reset
      unsubFocusSessions = listenFocusSessions(
        uid,
        (items) => {
          if (!active) return;
          const cut = Math.max(useTaskStore.getState().dataClearedAt || 0, clearedAt || 0);
          const cloud = cut
            ? items.filter((s) => isCreatedAfterClear({ createdAt: s.completedAt }, cut))
            : items;
          setFocusHistory(cloud);
        },
        (error) => console.warn("Focus sessions listener error:", error)
      );
    })();

    return () => {
      active = false;
      unsubQuickTasks?.();
      unsubSpaces?.();
      unsubLabels?.();
      unsubFlows?.();
      unsubBoardTasks?.();
      unsubMoods?.();
      unsubFocusSessions?.();
    };
  }, [user?.uid, loading, setQuickTasks, setQuickWorkspaces, setQuickLabels, setFollowFlows, setTasks, setDailyMoods, setFocusHistory]);
}
