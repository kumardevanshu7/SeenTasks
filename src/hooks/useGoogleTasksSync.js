import { useEffect, useRef } from "react";
import { useTaskStore } from "../store/useTaskStore";
import { twoWaySyncGoogleTasks } from "../lib/googleTasksService";

export function useGoogleTasksSync() {
  const connected = useTaskStore((s) => s.googleTasksConnected);
  const token = useTaskStore((s) => s.googleTasksToken);
  const tokenExpiresAt = useTaskStore((s) => s.googleTasksTokenExpiresAt);
  const autoSync = useTaskStore((s) => s.googleTasksAutoSync);

  const setGoogleTasksSyncing = useTaskStore((s) => s.setGoogleTasksSyncing);
  const recordGoogleSyncDone = useTaskStore((s) => s.recordGoogleSyncDone);
  const setQuickTasks = useTaskStore((s) => s.setQuickTasks);
  const disconnectGoogleTasks = useTaskStore((s) => s.disconnectGoogleTasks);

  const syncingRef = useRef(false);
  const debounceTimerRef = useRef(null);

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
            deletedGoogleTaskIds: state.deletedGoogleTaskIds || [],
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

    function handleInstantTrigger() {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        triggerSync();
      }, 350);
    }

    // Initial sync
    triggerSync();

    // 12s periodic background sync for ultra-fast sync parity
    const intervalId = window.setInterval(triggerSync, 12_000);

    // Sync immediately on tab focus and window active
    const onFocus = () => triggerSync();
    window.addEventListener("focus", onFocus);
    window.addEventListener("visibilitychange", onFocus);
    window.addEventListener("trigger-google-sync", handleInstantTrigger);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("trigger-google-sync", handleInstantTrigger);
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
