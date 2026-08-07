import { useEffect } from "react";
import { useAuth } from "./useAuth";
import { useTaskStore } from "../store/useTaskStore";
import { isCreatedAfterClear, loadAppState } from "../lib/appStateService";
import { listenQuickTasks, migrateLocalQuickTasks } from "../lib/quickTaskService";

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
    // ignore quota / private mode
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
      localStorage.setItem("seentasks-store", JSON.stringify(root));
    } else if (parsed && typeof parsed === "object" && "quickTasks" in parsed) {
      delete parsed.quickTasks;
      localStorage.setItem("seentasks-store", JSON.stringify(parsed));
    }
  } catch {
    // ignore
  }
}

// Cloud is source of truth. Memory holds live list + short-lived optimistic adds only.
export function useQuickTasksSync() {
  const { user } = useAuth();
  const setQuickTasks = useTaskStore((s) => s.setQuickTasks);

  useEffect(() => {
    if (!user?.uid) {
      setQuickTasks([]);
      return undefined;
    }

    let active = true;
    const uid = user.uid;
    let unsub = null;
    // Known wipe marker for this session (updated after appState loads).
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

        // Read legacy mirror BEFORE scrubbing it out of localStorage.
        const legacy = readLegacyLocalQuickTasks().filter((t) =>
          isCreatedAfterClear(t, clearedAt)
        );
        scrubQuickTasksFromPersist();

        if (legacy.length) {
          await migrateLocalQuickTasks(uid, legacy, clearedAt);
        }
        // Mark done even when empty so we don't keep scanning forever.
        markLegacyMigrated();
      } catch (err) {
        console.warn("Quick tasks bootstrap failed:", err);
      }

      if (!active) return;

      // Attach listener only after appState so pending/optimistic logic uses the wipe marker.
      unsub = listenQuickTasks(
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
        (error) => {
          console.warn("Quick tasks listener error:", error);
        }
      );
    })();

    return () => {
      active = false;
      unsub?.();
    };
  }, [user?.uid, setQuickTasks]);
}
