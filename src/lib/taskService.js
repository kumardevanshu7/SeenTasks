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

export function tasksRef(uid) {
  return collection(db, "users", uid, "tasks");
}

export function taskDocRef(uid, taskId) {
  return doc(db, "users", uid, "tasks", taskId);
}

export function normalizeUserTask(id, data = {}) {
  return {
    id,
    title: data.title || "",
    description: data.description || "",
    dateKey: data.dateKey || "",
    firstDateKey: data.firstDateKey || data.dateKey || "",
    category: data.category || "second",
    reasoning: data.reasoning || "",
    suggestedWindow: data.suggestedWindow || null,
    wellbeingNote: data.wellbeingNote || null,
    confidence: typeof data.confidence === "number" ? data.confidence : null,
    signals: Array.isArray(data.signals) ? data.signals : [],
    analyzedAt: data.analyzedAt || null,
    analysisSource: data.analysisSource || null,
    analysisModel: data.analysisModel || null,
    status: data.status || "active",
    iteration: Number(data.iteration) || 0,
    isBinTask: Boolean(data.isBinTask),
    assignedTo: data.assignedTo || null,
    assignedBy: data.assignedBy || null,
    createdAt: data.createdAt || new Date().toISOString(),
    completedAt: data.completedAt || null,
    abortedAt: data.abortedAt || null,
  };
}

export async function upsertUserTask(uid, task) {
  if (!uid || !task?.id) return;

  await setDoc(
    taskDocRef(uid, task.id),
    {
      title: task.title || "",
      description: task.description || "",
      dateKey: task.dateKey || "",
      firstDateKey: task.firstDateKey || task.dateKey || "",
      category: task.category || "second",
      reasoning: task.reasoning || "",
      suggestedWindow: task.suggestedWindow || null,
      wellbeingNote: task.wellbeingNote || null,
      confidence: typeof task.confidence === "number" ? task.confidence : null,
      signals: Array.isArray(task.signals) ? task.signals : [],
      analyzedAt: task.analyzedAt || null,
      analysisSource: task.analysisSource || null,
      analysisModel: task.analysisModel || null,
      status: task.status || "active",
      iteration: Number(task.iteration) || 0,
      isBinTask: Boolean(task.isBinTask),
      assignedTo: task.assignedTo || null,
      assignedBy: task.assignedBy || null,
      createdAt: task.createdAt || new Date().toISOString(),
      completedAt: task.completedAt || null,
      abortedAt: task.abortedAt || null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function removeUserTaskDoc(uid, taskId) {
  if (!uid || !taskId) return;
  await deleteDoc(taskDocRef(uid, taskId));
}

export function listenUserTasks(uid, onData, onError) {
  if (!uid) return () => {};
  return onSnapshot(
    tasksRef(uid),
    (snapshot) => {
      const items = snapshot.docs.map((d) => normalizeUserTask(d.id, d.data()));
      onData(items);
    },
    (err) => {
      console.warn("User tasks listener error:", err);
      onError?.(err);
    }
  );
}

export async function fetchUserTasks(uid) {
  if (!uid) return [];
  const snap = await getDocs(tasksRef(uid));
  return snap.docs.map((d) => normalizeUserTask(d.id, d.data()));
}

export async function clearAllUserTaskDocs(uid) {
  if (!uid) return 0;
  const colRef = tasksRef(uid);
  let total = 0;
  for (let pass = 0; pass < 2; pass += 1) {
    const snap = await getDocs(colRef);
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
  const left = await getDocs(tasksRef(uid));
  if (!left.empty) {
    throw new Error("Some user tasks could not be deleted from Firestore.");
  }
  return total;
}

export async function migrateLocalUserTasks(uid, localTasks = [], clearedAt = 0) {
  if (!uid || !Array.isArray(localTasks) || !localTasks.length) return 0;
  const cut = Number(clearedAt) || 0;
  const eligible = localTasks.filter((t) => {
    if (!t?.id) return false;
    if (!cut) return true;
    const created = new Date(t.createdAt || 0).getTime();
    return !Number.isNaN(created) && created > cut;
  });
  if (!eligible.length) return 0;

  const cloud = await fetchUserTasks(uid);
  const cloudIds = new Set(cloud.map((t) => t.id));
  const missing = eligible.filter((t) => !cloudIds.has(t.id));
  if (!missing.length) return 0;

  const CHUNK = 400;
  for (let i = 0; i < missing.length; i += CHUNK) {
    const batch = writeBatch(db);
    missing.slice(i, i + CHUNK).forEach((task) => {
      batch.set(
        taskDocRef(uid, task.id),
        {
          title: task.title || "",
          description: task.description || "",
          dateKey: task.dateKey || "",
          firstDateKey: task.firstDateKey || task.dateKey || "",
          category: task.category || "second",
          reasoning: task.reasoning || "",
          suggestedWindow: task.suggestedWindow || null,
          wellbeingNote: task.wellbeingNote || null,
          confidence: typeof task.confidence === "number" ? task.confidence : null,
          signals: Array.isArray(task.signals) ? task.signals : [],
          analyzedAt: task.analyzedAt || null,
          analysisSource: task.analysisSource || null,
          analysisModel: task.analysisModel || null,
          status: task.status || "active",
          iteration: Number(task.iteration) || 0,
          isBinTask: Boolean(task.isBinTask),
          assignedTo: task.assignedTo || null,
          assignedBy: task.assignedBy || null,
          createdAt: task.createdAt || new Date().toISOString(),
          completedAt: task.completedAt || null,
          abortedAt: task.abortedAt || null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    });
    await batch.commit();
  }
  return missing.length;
}
