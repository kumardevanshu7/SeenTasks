import { useEffect } from "react";
import { useAuth } from "./useAuth";
import { useTaskStore } from "../store/useTaskStore";
import {
  listenAssignedByMe,
  listenAssignedToMe,
  listenConnections,
  listenIncomingRequests,
} from "../lib/collabService";

// Keeps collaboration state (connections, requests, assigned tasks) in the
// store and live via Firestore snapshots while the user is signed in.
export function useCollabSync() {
  const { user, profile } = useAuth();
  const setConnections = useTaskStore((s) => s.setConnections);
  const setIncomingRequests = useTaskStore((s) => s.setIncomingRequests);
  const setAssignedByMe = useTaskStore((s) => s.setAssignedByMe);
  const setAssignedToMe = useTaskStore((s) => s.setAssignedToMe);

  useEffect(() => {
    if (!user || !profile?.username) return undefined;
    const unsubs = [
      listenConnections(user.uid, setConnections),
      listenIncomingRequests(user.uid, setIncomingRequests),
      listenAssignedByMe(user.uid, setAssignedByMe),
      listenAssignedToMe(user.uid, setAssignedToMe),
    ];
    return () => unsubs.forEach((fn) => fn && fn());
  }, [user, profile?.username, setConnections, setIncomingRequests, setAssignedByMe, setAssignedToMe]);
}
