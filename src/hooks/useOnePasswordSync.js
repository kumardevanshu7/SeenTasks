import { useEffect } from "react";
import { useAuth } from "./useAuth";
import { useTaskStore } from "../store/useTaskStore";
import { listenOnePassword } from "../lib/onePasswordService";

// One Password lives in Firestore only — memory cache, never localStorage.
export function useOnePasswordSync() {
  const { user, loading } = useAuth();
  const setOnePassword = useTaskStore((s) => s.setOnePassword);
  const clearOnePassword = useTaskStore((s) => s.clearOnePassword);

  useEffect(() => {
    // Wait until Firebase Auth resolves
    if (loading) return undefined;

    if (!user?.uid) {
      clearOnePassword();
      return undefined;
    }

    let active = true;
    const unsub = listenOnePassword(
      user.uid,
      (cloud) => {
        if (!active) return;
        if (!cloud) {
          setOnePassword(null);
          return;
        }
        const local = useTaskStore.getState().onePassword;
        if (local?.updatedAt && cloud.updatedAt && local.updatedAt > cloud.updatedAt) {
          return;
        }
        setOnePassword(cloud);
      },
      (error) => {
        console.warn("OnePassword listener error:", error);
      }
    );

    return () => {
      active = false;
      unsub();
      // Ensure memory cache is always wiped when switching accounts or unmounting
      clearOnePassword();
    };
  }, [user?.uid, loading, setOnePassword, clearOnePassword]);
}
