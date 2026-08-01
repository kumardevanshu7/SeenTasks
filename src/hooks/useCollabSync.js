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
  const { user, profile } = useAuth();
  const setConnections = useTaskStore((s) => s.setConnections);
  const setIncomingRequests = useTaskStore((s) => s.setIncomingRequests);
  const setAssignedByMe = useTaskStore((s) => s.setAssignedByMe);
  const setAssignedToMe = useTaskStore((s) => s.setAssignedToMe);

  useEffect(() => {
    if (!user || !profile?.username) return undefined;

    let unsubs = [];
    let cancelled = false;
    let idleId = 0;
    let timeoutId = 0;

    const start = () => {
      if (cancelled) return;
      unsubs = [
        listenConnections(user.uid, setConnections),
        listenIncomingRequests(user.uid, setIncomingRequests),
        listenAssignedByMe(user.uid, setAssignedByMe),
        listenAssignedToMe(user.uid, setAssignedToMe),
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
    };
  }, [user, profile?.username, setConnections, setIncomingRequests, setAssignedByMe, setAssignedToMe]);
}
