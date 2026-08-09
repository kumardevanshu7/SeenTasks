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

/** 10 light theme colors for Follow Flow (distinct from workspace/label palettes) */
export const FLOW_COLORS = [
  { id: "mint", value: "#d8f3e4", ink: "#1f6b48" },
  { id: "sky", value: "#d7ebfb", ink: "#1f5f8a" },
  { id: "peach", value: "#ffe2d1", ink: "#a14a28" },
  { id: "lilac", value: "#e8def8", ink: "#5c418a" },
  { id: "sand", value: "#f3e6d2", ink: "#7a5a32" },
  { id: "seafoam", value: "#d5f0ee", ink: "#1d6a66" },
  { id: "blush", value: "#f8d9e4", ink: "#8a3d5c" },
  { id: "butter", value: "#fff0bf", ink: "#7a620e" },
  { id: "fog", value: "#e4e9f2", ink: "#445066" },
  { id: "sage", value: "#e2edd8", ink: "#4a6440" },
];

export function flowColorValue(color) {
  if (!color) return FLOW_COLORS[0].value;
  const hit = FLOW_COLORS.find((c) => c.id === color || c.value === color);
  return hit?.value || color;
}

export function flowColorInk(color) {
  if (!color) return FLOW_COLORS[0].ink;
  const hit = FLOW_COLORS.find((c) => c.id === color || c.value === color);
  return hit?.ink || "#4a4038";
}

function flowsRef(uid) {
  return collection(db, "users", uid, "followFlows");
}

export function normalizeFlowStep(data = {}, index = 0) {
  return {
    id: data.id || `step-${index}`,
    title: (data.title || "").trim() || `Step ${index + 1}`,
    done: Boolean(data.done),
    completedAt: data.completedAt || null,
  };
}

export function normalizeFollowFlow(id, data = {}) {
  const steps = Array.isArray(data.steps)
    ? data.steps.map((s, i) => normalizeFlowStep(s, i))
    : [];
  return {
    id,
    name: (data.name || "Flow").trim() || "Flow",
    color: flowColorValue(data.color),
    steps,
    createdAt: data.createdAt || new Date().toISOString(),
  };
}

export function flowProgress(flow) {
  const steps = flow?.steps || [];
  const total = steps.length;
  const done = steps.filter((s) => s.done).length;
  const activeIndex = steps.findIndex((s) => !s.done);
  return {
    total,
    done,
    pct: total === 0 ? 0 : Math.round((done / total) * 100),
    activeIndex: activeIndex === -1 ? (total === 0 ? -1 : total) : activeIndex,
    complete: total > 0 && done === total,
  };
}

/** Step is actionable only when all previous steps are done. */
export function isFlowStepUnlocked(steps, index) {
  if (index < 0 || index >= (steps?.length || 0)) return false;
  for (let i = 0; i < index; i += 1) {
    if (!steps[i]?.done) return false;
  }
  return true;
}

export function listenFollowFlows(uid, cb, onError) {
  return onSnapshot(
    flowsRef(uid),
    (snap) => {
      const items = snap.docs
        .map((d) => normalizeFollowFlow(d.id, d.data()))
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      cb(items);
    },
    (error) => onError?.(error)
  );
}

export async function upsertFollowFlow(uid, flow) {
  if (!uid || !flow?.id) return;
  await setDoc(
    doc(db, "users", uid, "followFlows", flow.id),
    {
      name: flow.name || "Flow",
      color: flowColorValue(flow.color),
      steps: (flow.steps || []).map((s, i) => ({
        id: s.id || `step-${i}`,
        title: s.title || `Step ${i + 1}`,
        done: Boolean(s.done),
        completedAt: s.completedAt || null,
      })),
      createdAt: flow.createdAt || new Date().toISOString(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function removeFollowFlowDoc(uid, flowId) {
  if (!uid || !flowId) return;
  await deleteDoc(doc(db, "users", uid, "followFlows", flowId));
}

export async function clearAllFollowFlowDocs(uid) {
  if (!uid) return 0;
  let total = 0;
  for (let pass = 0; pass < 2; pass += 1) {
    const snap = await getDocs(flowsRef(uid));
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
