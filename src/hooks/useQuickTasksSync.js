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
    let unsubTasks = null;
    let unsubSpaces = null;
    let unsubLabels = null;
    let unsubFlows = null;
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

      unsubTasks = listenQuickTasks(
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
    })();

    return () => {
      active = false;
      unsubTasks?.();
      unsubSpaces?.();
      unsubLabels?.();
      unsubFlows?.();
    };
  }, [user?.uid, loading, setQuickTasks, setQuickWorkspaces, setQuickLabels, setFollowFlows]);
}
