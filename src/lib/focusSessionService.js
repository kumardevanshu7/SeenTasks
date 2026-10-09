import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { todayKey } from "./date";

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
    dateKey: session.dateKey || todayKey(),
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

/** Delete every focus session document for this user (app reset). */
export async function clearAllFocusSessionDocs(uid) {
  if (!uid) return 0;
  let total = 0;
  for (let pass = 0; pass < 2; pass += 1) {
    const snap = await getDocs(sessionsCol(uid));
    if (snap.empty) return total;
    const docs = snap.docs;
    const CHUNK = 400;
    for (let i = 0; i < docs.length; i += CHUNK) {
      const batch = writeBatch(db);
      docs.slice(i, i + CHUNK).forEach((d) => batch.delete(d.ref));
      await batch.commit();
      total += Math.min(CHUNK, docs.length - i);
    }
  }
  return total;
}

/**
 * Listen to focusSessions in real time — Firestore is source of truth.
 * Replaces store focusHistory on every snapshot.
 */
export function listenFocusSessions(uid, onData, onError) {
  if (!uid) return () => {};
  return onSnapshot(
    sessionsCol(uid),
    (snapshot) => {
      const list = [];
      snapshot.forEach((d) => {
        const data = d.data();
        if (data?.id) list.push(data);
      });
      // Sort descending by completedAt
      list.sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""));
      onData(list);
    },
    (err) => {
      console.warn("Focus sessions listener error:", err);
      onError?.(err);
    }
  );
}
