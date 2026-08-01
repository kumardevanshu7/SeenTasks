import { useEffect } from "react";
import { useAuth } from "./useAuth";
import { useTaskStore } from "../store/useTaskStore";
import { loadOnePassword } from "../lib/onePasswordService";

// One Password lives in Firestore only — memory cache, never localStorage.
export function useOnePasswordSync() {
  const { user } = useAuth();
  const setOnePassword = useTaskStore((s) => s.setOnePassword);
  const clearOnePassword = useTaskStore((s) => s.clearOnePassword);

  useEffect(() => {
    if (!user?.uid) {
      clearOnePassword();
      return undefined;
    }

    let active = true;
    loadOnePassword(user.uid)
      .then((cloud) => {
        if (!active) return;
        if (!cloud) {
          // Don't wipe a newer in-memory save if cloud is empty mid-write.
          const local = useTaskStore.getState().onePassword;
          if (!local) setOnePassword(null);
          return;
        }
        const local = useTaskStore.getState().onePassword;
        if (local?.updatedAt && cloud.updatedAt && local.updatedAt > cloud.updatedAt) {
          return;
        }
        setOnePassword(cloud);
      })
      .catch(() => {
        // Keep whatever is in memory if offline.
      });

    return () => {
      active = false;
    };
  }, [user?.uid, setOnePassword, clearOnePassword]);
}
