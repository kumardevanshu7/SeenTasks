import { useEffect, useRef } from "react";
import { useTaskStore } from "../store/useTaskStore";
import { twoWaySyncGoogleTasks } from "../lib/googleTasksService";

export function useGoogleTasksSync() {
  const connected = useTaskStore((s) => s.googleTasksConnected);
  const token = useTaskStore((s) => s.googleTasksToken);
  const tokenExpiresAt = useTaskStore((s) => s.googleTasksTokenExpiresAt);
  const autoSync = useTaskStore((s) => s.googleTasksAutoSync);
  const syncing = useTaskStore((s) => s.googleTasksSyncing);

  const setGoogleTasksSyncing = useTaskStore((s) => s.setGoogleTasksSyncing);
  const recordGoogleSyncDone = useTaskStore((s) => s.recordGoogleSyncDone);
  const setQuickTasks = useTaskStore((s) => s.setQuickTasks);
  const disconnectGoogleTasks = useTaskStore((s) => s.disconnectGoogleTasks);

  const syncingRef = useRef(false);

  useEffect(() => {
    if (!connected || !token || !autoSync) return;

    async function triggerSync() {
      if (syncingRef.current) return;

      // Check token expiration
      if (tokenExpiresAt && Date.now() >= tokenExpiresAt) {
        console.warn("Google Tasks token expired. Disconnecting.");
        disconnectGoogleTasks();
        return;
      }

      syncingRef.current = true;
      try {
        const state = useTaskStore.getState();
        await twoWaySyncGoogleTasks(
          token,
          {
            quickTasks: state.quickTasks,
            quickWorkspaces: state.quickWorkspaces,
            quickLabels: state.quickLabels,
          },
          {
            setGoogleTasksSyncing,
            recordGoogleSyncDone,
            setQuickTasks,
          }
        );
        window.dispatchEvent(new CustomEvent("google-tasks-synced"));
      } catch (err) {
        if (err.message === "TOKEN_EXPIRED") {
          disconnectGoogleTasks();
        } else {
          console.warn("Auto-sync with Google Tasks skipped:", err.message);
        }
      } finally {
        syncingRef.current = false;
      }
    }

    // Initial sync
    triggerSync();

    // 45s periodic background sync
    const intervalId = window.setInterval(triggerSync, 45_000);

    // Sync on tab focus
    const onFocus = () => triggerSync();
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, [
    connected,
    token,
    tokenExpiresAt,
    autoSync,
    disconnectGoogleTasks,
    recordGoogleSyncDone,
    setGoogleTasksSyncing,
    setQuickTasks,
  ]);
}
