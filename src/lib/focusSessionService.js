import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";

function sessionsCol(uid) {
  return collection(db, "users", uid, "focusSessions");
}

function sessionDoc(uid, sessionId) {
  return doc(db, "users", uid, "focusSessions", sessionId);
}

export async function upsertFocusSession(uid, session) {
  if (!uid || !session?.id) return;
  const ref = sessionDoc(uid, session.id);
  const payload = {
    id: session.id,
    taskId: session.taskId || null,
    taskTitle: session.taskTitle || "1 Hr Deep Work",
    flowId: session.flowId || null,
    mode: session.mode || "oneHour",
    durationMinutes: Number(session.durationMinutes) || 60,
    extendedMinutes: Number(session.extendedMinutes) || 0,
    totalMinutes: Number(session.totalMinutes) || ((Number(session.durationMinutes) || 60) + (Number(session.extendedMinutes) || 0)),
    completedAt: session.completedAt || new Date().toISOString(),
    dateKey: session.dateKey || new Date().toISOString().slice(0, 10),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, payload, { merge: true });
}

export async function fetchFocusSessions(uid) {
  if (!uid) return [];
  const snap = await getDocs(sessionsCol(uid));
  const list = [];
  snap.forEach((d) => {
    const data = d.data();
    if (data?.id) list.push(data);
  });
  return list.sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""));
}

export async function removeFocusSessionDoc(uid, sessionId) {
  if (!uid || !sessionId) return;
  await deleteDoc(sessionDoc(uid, sessionId));
}
