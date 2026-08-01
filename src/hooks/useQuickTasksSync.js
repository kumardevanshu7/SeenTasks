import { useEffect } from "react";
import { useAuth } from "./useAuth";
import { useTaskStore } from "../store/useTaskStore";
import { listenQuickTasks, migrateLocalQuickTasks } from "../lib/quickTaskService";

// Keeps quick tasks live across devices via users/{uid}/quickTasks.
export function useQuickTasksSync() {
  const { user } = useAuth();
  const setQuickTasks = useTaskStore((s) => s.setQuickTasks);

  useEffect(() => {
    if (!user?.uid) return undefined;

    let active = true;
    let unsub = () => {};
    const uid = user.uid;

    (async () => {
      const local = useTaskStore.getState().quickTasks || [];
      try {
        await migrateLocalQuickTasks(uid, local);
      } catch {
        // Offline / rules not deployed yet — keep local list.
      }
      if (!active) return;
      unsub = listenQuickTasks(uid, (items) => {
        if (!active) return;
        setQuickTasks(items);
      });
    })();

    return () => {
      active = false;
      unsub();
    };
  }, [user?.uid, setQuickTasks]);
}
