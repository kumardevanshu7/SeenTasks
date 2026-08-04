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

function quickTasksRef(uid) {
  return collection(db, "users", uid, "quickTasks");
}

function normalizeQuickTask(id, data = {}) {
  return {
    id,
    title: data.title || "",
    done: Boolean(data.done),
    dateKey: data.dateKey || "",
    createdAt: data.createdAt || new Date().toISOString(),
    completedAt: data.completedAt || null,
  };
}

export function listenQuickTasks(uid, cb) {
  return onSnapshot(quickTasksRef(uid), (snap) => {
    const items = snap.docs
      .map((d) => normalizeQuickTask(d.id, d.data()))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    cb(items);
  });
}

export async function upsertQuickTask(uid, task) {
  if (!uid || !task?.id) return;
  await setDoc(
    doc(db, "users", uid, "quickTasks", task.id),
    {
      title: task.title || "",
      done: Boolean(task.done),
      dateKey: task.dateKey || "",
      createdAt: task.createdAt || new Date().toISOString(),
      completedAt: task.completedAt || null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function removeQuickTaskDoc(uid, taskId) {
  if (!uid || !taskId) return;
  await deleteDoc(doc(db, "users", uid, "quickTasks", taskId));
}

/** Delete every quick task for this user (app reset). */
export async function clearAllQuickTaskDocs(uid) {
  if (!uid) return 0;
  const snap = await getDocs(quickTasksRef(uid));
  if (snap.empty) return 0;
  const docs = snap.docs;
  const CHUNK = 400;
  for (let i = 0; i < docs.length; i += CHUNK) {
    const batch = writeBatch(db);
    docs.slice(i, i + CHUNK).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  return docs.length;
}

export async function fetchQuickTasks(uid) {
  const snap = await getDocs(quickTasksRef(uid));
  return snap.docs.map((d) => normalizeQuickTask(d.id, d.data()));
}

/** Upload local-only items that are missing in the cloud (one-time / first sync). */
export async function migrateLocalQuickTasks(uid, localItems) {
  if (!uid || !localItems?.length) return 0;
  const cloud = await fetchQuickTasks(uid);
  const cloudIds = new Set(cloud.map((t) => t.id));
  const missing = localItems.filter((t) => t?.id && !cloudIds.has(t.id));
  if (!missing.length) return 0;

  const batch = writeBatch(db);
  missing.forEach((task) => {
    batch.set(doc(db, "users", uid, "quickTasks", task.id), {
      title: task.title || "",
      done: Boolean(task.done),
      dateKey: task.dateKey || "",
      createdAt: task.createdAt || new Date().toISOString(),
      completedAt: task.completedAt || null,
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
  return missing.length;
}
