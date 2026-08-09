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

export const DEFAULT_WORKSPACE_ID = "personal";

/** Light theme swatches for workspace pickers */
export const WORKSPACE_COLORS = [
  { id: "pink", value: "#f3c4d4", ink: "#8a3d55" },
  { id: "purple", value: "#ddd0f2", ink: "#5b4588" },
  { id: "red", value: "#f5c8c4", ink: "#8f3d38" },
  { id: "green", value: "#cfe8d6", ink: "#3d6e4c" },
  { id: "yellow", value: "#f3e6b8", ink: "#7a6520" },
  { id: "brown", value: "#e6d3c4", ink: "#6e4e38" },
  { id: "blue", value: "#c9dff3", ink: "#355f82" },
];

export function workspaceColorValue(color) {
  if (!color) return WORKSPACE_COLORS[6].value;
  const hit = WORKSPACE_COLORS.find((c) => c.id === color || c.value === color);
  return hit?.value || color;
}

export function workspaceColorInk(color) {
  if (!color) return WORKSPACE_COLORS[6].ink;
  const hit = WORKSPACE_COLORS.find((c) => c.id === color || c.value === color);
  return hit?.ink || "#4a4038";
}

function quickTasksRef(uid) {
  return collection(db, "users", uid, "quickTasks");
}

function workspacesRef(uid) {
  return collection(db, "users", uid, "quickWorkspaces");
}

export function makeDefaultWorkspace() {
  return {
    id: DEFAULT_WORKSPACE_ID,
    name: "Personal",
    color: WORKSPACE_COLORS[6].value,
    createdAt: "1970-01-01T00:00:00.000Z",
  };
}

export function normalizeWorkspace(id, data = {}) {
  return {
    id,
    name: (data.name || "Workspace").trim() || "Workspace",
    color: workspaceColorValue(data.color),
    createdAt: data.createdAt || new Date().toISOString(),
  };
}

export function normalizeQuickTask(id, data = {}) {
  return {
    id,
    title: data.title || "",
    done: Boolean(data.done),
    dateKey: data.dateKey || "",
    workspaceId: data.workspaceId || DEFAULT_WORKSPACE_ID,
    dueDate: data.dueDate || null,
    createdAt: data.createdAt || new Date().toISOString(),
    completedAt: data.completedAt || null,
  };
}

export function listenQuickTasks(uid, cb, onError) {
  return onSnapshot(
    quickTasksRef(uid),
    (snap) => {
      const items = snap.docs
        .map((d) => normalizeQuickTask(d.id, d.data()))
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      cb(items);
    },
    (error) => onError?.(error)
  );
}

export function listenQuickWorkspaces(uid, cb, onError) {
  return onSnapshot(
    workspacesRef(uid),
    (snap) => {
      const items = snap.docs.map((d) => normalizeWorkspace(d.id, d.data()));
      const hasDefault = items.some((w) => w.id === DEFAULT_WORKSPACE_ID);
      const list = hasDefault ? items : [makeDefaultWorkspace(), ...items];
      list.sort((a, b) => {
        if (a.id === DEFAULT_WORKSPACE_ID) return -1;
        if (b.id === DEFAULT_WORKSPACE_ID) return 1;
        return a.createdAt < b.createdAt ? -1 : 1;
      });
      cb(list);
    },
    (error) => onError?.(error)
  );
}

export async function ensureDefaultWorkspace(uid) {
  if (!uid) return;
  await setDoc(
    doc(db, "users", uid, "quickWorkspaces", DEFAULT_WORKSPACE_ID),
    {
      name: "Personal",
      color: WORKSPACE_COLORS[6].value,
      createdAt: "1970-01-01T00:00:00.000Z",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function upsertQuickWorkspace(uid, workspace) {
  if (!uid || !workspace?.id) return;
  await setDoc(
    doc(db, "users", uid, "quickWorkspaces", workspace.id),
    {
      name: workspace.name || "Workspace",
      color: workspaceColorValue(workspace.color),
      createdAt: workspace.createdAt || new Date().toISOString(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function removeQuickWorkspaceDoc(uid, workspaceId) {
  if (!uid || !workspaceId || workspaceId === DEFAULT_WORKSPACE_ID) return;
  await deleteDoc(doc(db, "users", uid, "quickWorkspaces", workspaceId));
}

export async function upsertQuickTask(uid, task) {
  if (!uid || !task?.id) return;
  await setDoc(
    doc(db, "users", uid, "quickTasks", task.id),
    {
      title: task.title || "",
      done: Boolean(task.done),
      dateKey: task.dateKey || "",
      workspaceId: task.workspaceId || DEFAULT_WORKSPACE_ID,
      dueDate: task.dueDate || null,
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

async function clearCollection(uid, refFn) {
  let total = 0;
  for (let pass = 0; pass < 2; pass += 1) {
    const snap = await getDocs(refFn(uid));
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

/** Delete every quick task for this user (app reset). Retries once if anything remains. */
export async function clearAllQuickTaskDocs(uid) {
  if (!uid) return 0;
  const total = await clearCollection(uid, quickTasksRef);
  await clearCollection(uid, workspacesRef);
  const left = await getDocs(quickTasksRef(uid));
  if (!left.empty) {
    throw new Error("Some quick tasks could not be deleted from Firestore.");
  }
  return total;
}

export async function fetchQuickTasks(uid) {
  const snap = await getDocs(quickTasksRef(uid));
  return snap.docs.map((d) => normalizeQuickTask(d.id, d.data()));
}

/** Upload local-only items that are missing in the cloud (one-time / first sync). */
export async function migrateLocalQuickTasks(uid, localItems, clearedAt = 0) {
  if (!uid || !localItems?.length) return 0;
  const cut = Number(clearedAt) || 0;
  const eligible = localItems.filter((t) => {
    if (!t?.id) return false;
    if (!cut) return true;
    const created = new Date(t.createdAt || 0).getTime();
    return !Number.isNaN(created) && created > cut;
  });
  if (!eligible.length) return 0;

  const cloud = await fetchQuickTasks(uid);
  const cloudIds = new Set(cloud.map((t) => t.id));
  const missing = eligible.filter((t) => !cloudIds.has(t.id));
  if (!missing.length) return 0;

  const CHUNK = 400;
  for (let i = 0; i < missing.length; i += CHUNK) {
    const batch = writeBatch(db);
    missing.slice(i, i + CHUNK).forEach((task) => {
      batch.set(doc(db, "users", uid, "quickTasks", task.id), {
        title: task.title || "",
        done: Boolean(task.done),
        dateKey: task.dateKey || "",
        workspaceId: task.workspaceId || DEFAULT_WORKSPACE_ID,
        dueDate: task.dueDate || null,
        createdAt: task.createdAt || new Date().toISOString(),
        completedAt: task.completedAt || null,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  }
  return missing.length;
}
