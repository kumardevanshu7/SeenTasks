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
import { listenFollowFlows } from "../lib/flowService";

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

function scrubQuickTasksFromPersist() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("seentasks-store");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const root = parsed?.state && typeof parsed.state === "object" ? parsed : null;
    if (root?.state && "quickTasks" in root.state) {
      delete root.state.quickTasks;
      delete root.state.quickWorkspaces;
      localStorage.setItem("seentasks-store", JSON.stringify(root));
    } else if (parsed && typeof parsed === "object" && "quickTasks" in parsed) {
      delete parsed.quickTasks;
      delete parsed.quickWorkspaces;
      localStorage.setItem("seentasks-store", JSON.stringify(parsed));
    }
  } catch {
    // ignore
  }
}

export function useQuickTasksSync() {
  const { user } = useAuth();
  const setQuickTasks = useTaskStore((s) => s.setQuickTasks);
  const setQuickWorkspaces = useTaskStore((s) => s.setQuickWorkspaces);
  const setQuickLabels = useTaskStore((s) => s.setQuickLabels);
  const setFollowFlows = useTaskStore((s) => s.setFollowFlows);

  useEffect(() => {
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
        scrubQuickTasksFromPersist();

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
          setFollowFlows(items);
        },
        (error) => console.warn("Flows listener error:", error)
      );

      unsubTasks = listenQuickTasks(
        uid,
        (items) => {
          if (!active) return;
          const cut = Math.max(useTaskStore.getState().dataClearedAt || 0, clearedAt || 0);
          const cloud = (items || []).filter((t) => isCreatedAfterClear(t, cut));
          const cloudIds = new Set(cloud.map((t) => t.id));
          const pending = (useTaskStore.getState().quickTasks || []).filter(
            (t) => t?.id && !cloudIds.has(t.id) && isCreatedAfterClear(t, cut)
          );
          setQuickTasks(
            [...pending, ...cloud].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
          );
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
  }, [user?.uid, setQuickTasks, setQuickWorkspaces, setQuickLabels, setFollowFlows]);
}
