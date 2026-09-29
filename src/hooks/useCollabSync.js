import { useEffect } from "react";
import { useAuth } from "./useAuth";
import { useTaskStore } from "../store/useTaskStore";
import {
  listenAssignedByMe,
  listenAssignedToMe,
  listenConnections,
  listenIncomingRequests,
} from "../lib/collabService";

// Collaboration listeners start after first paint so Quick Tasks opens fast.
export function useCollabSync() {
  const { user, profile, loading } = useAuth();
  const setConnections = useTaskStore((s) => s.setConnections);
  const setIncomingRequests = useTaskStore((s) => s.setIncomingRequests);
  const setAssignedByMe = useTaskStore((s) => s.setAssignedByMe);
  const setAssignedToMe = useTaskStore((s) => s.setAssignedToMe);

  useEffect(() => {
    // Wait until Firebase Auth resolves
    if (loading) return undefined;

    if (!user?.uid || !profile?.username) {
      setConnections([]);
      setIncomingRequests([]);
      setAssignedByMe([]);
      setAssignedToMe([]);
      return undefined;
    }

    let unsubs = [];
    let cancelled = false;
    let idleId = 0;
    let timeoutId = 0;
    const uid = user.uid;

    const start = () => {
      if (cancelled) return;
      const onError = (error) => console.warn("Collab sync listener error:", error);
      unsubs = [
        listenConnections(uid, setConnections, onError),
        listenIncomingRequests(uid, setIncomingRequests, onError),
        listenAssignedByMe(uid, setAssignedByMe, onError),
        listenAssignedToMe(uid, setAssignedToMe, onError),
      ];
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(start, { timeout: 2500 });
    } else {
      timeoutId = window.setTimeout(start, 800);
    }

    return () => {
      cancelled = true;
      if (idleId && "cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
      if (timeoutId) window.clearTimeout(timeoutId);
      unsubs.forEach((fn) => fn && fn());
      // Clean up in-memory collab store on unmount or user switch
      setConnections([]);
      setIncomingRequests([]);
      setAssignedByMe([]);
      setAssignedToMe([]);
    };
  }, [
    user?.uid,
    profile?.username,
    loading,
    setConnections,
    setIncomingRequests,
    setAssignedByMe,
    setAssignedToMe,
  ]);
}
