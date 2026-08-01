import { useEffect } from "react";
import { useAuth } from "./useAuth";
import { useTaskStore } from "../store/useTaskStore";
import { listenQuickTasks, migrateLocalQuickTasks } from "../lib/quickTaskService";

function mergeQuickTasks(cloudItems, localItems) {
  const cloud = Array.isArray(cloudItems) ? cloudItems : [];
  const local = Array.isArray(localItems) ? localItems : [];
  if (!cloud.length && local.length) return local;
  if (!local.length) return cloud;
  const cloudIds = new Set(cloud.map((t) => t.id));
  const localOnly = local.filter((t) => t?.id && !cloudIds.has(t.id));
  if (!localOnly.length) return cloud;
  return [...cloud, ...localOnly].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

// Live sync — never blocks UI; local list stays visible while cloud catches up.
export function useQuickTasksSync() {
  const { user } = useAuth();
  const setQuickTasks = useTaskStore((s) => s.setQuickTasks);

  useEffect(() => {
    if (!user?.uid) return undefined;

    let active = true;
    const uid = user.uid;

    // Push any local-only items in the background (do not await before listening).
    migrateLocalQuickTasks(uid, useTaskStore.getState().quickTasks || []).catch(() => {});

    const unsub = listenQuickTasks(uid, (items) => {
      if (!active) return;
      const local = useTaskStore.getState().quickTasks || [];
      setQuickTasks(mergeQuickTasks(items, local));
    });

    return () => {
      active = false;
      unsub?.();
    };
  }, [user?.uid, setQuickTasks]);
}
