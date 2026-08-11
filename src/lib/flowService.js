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
  const reports = Array.isArray(data.reports)
    ? data.reports
        .map((r) => ({
          dateKey: r.dateKey || "",
          pct: Number(r.pct) || 0,
          grade: r.grade || gradeFromPct(Number(r.pct) || 0),
          feedback: r.feedback || feedbackForGrade(r.grade || gradeFromPct(Number(r.pct) || 0)),
          done: Number(r.done) || 0,
          total: Number(r.total) || 0,
        }))
        .filter((r) => r.dateKey)
        .slice(0, 30)
    : [];
  const repeat = data.repeat === "daily" ? "daily" : null;
  return {
    id,
    name: (data.name || "Flow").trim() || "Flow",
    color: flowColorValue(data.color),
    steps,
    repeat,
    dayKey: data.dayKey || null,
    reports,
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

/** School-style grades from completion percent. */
export function gradeFromPct(pct) {
  const n = Math.max(0, Math.min(100, Number(pct) || 0));
  if (n >= 97) return "A+";
  if (n >= 90) return "A";
  if (n >= 87) return "B+";
  if (n >= 80) return "B";
  if (n >= 77) return "C+";
  if (n >= 70) return "C";
  if (n >= 67) return "D+";
  if (n >= 60) return "D";
  if (n >= 50) return "E";
  return "F";
}

export function feedbackForGrade(grade) {
  switch (grade) {
    case "A+":
      return "Outstanding day — you finished every step.";
    case "A":
      return "Excellent work — almost a perfect day.";
    case "B+":
      return "Strong day — this rhythm is solid.";
    case "B":
      return "Good progress — a little more and you’re golden.";
    case "C+":
      return "Decent effort — keep pushing the sequence.";
    case "C":
      return "Halfway there — tomorrow can climb.";
    case "D+":
      return "A start — lock in a few more steps next time.";
    case "D":
      return "Light day — show up again tomorrow.";
    case "E":
      return "Barely scratched it — reset and try again.";
    default:
      return "Missed day — fresh slate starts now.";
  }
}

export function buildEverydayReport(flow, dateKey) {
  const prog = flowProgress(flow);
  const grade = gradeFromPct(prog.pct);
  return {
    dateKey,
    pct: prog.pct,
    grade,
    feedback: feedbackForGrade(grade),
    done: prog.done,
    total: prog.total,
  };
}

/** If an Everyday flow’s dayKey is before today, archive a report and reset steps. */
export function rollEverydayFlow(flow, today = null) {
  if (!flow || flow.repeat !== "daily") return { flow, changed: false, report: null };
  const day = today || todayKey();
  const dayKey = flow.dayKey || day;
  if (dayKey >= day) {
    if (flow.dayKey) return { flow, changed: false, report: null };
    return { flow: { ...flow, dayKey: day }, changed: true, report: null };
  }

  const report = buildEverydayReport(flow, dayKey);
  const reports = [report, ...(flow.reports || [])]
    .filter((r, i, arr) => r.dateKey && arr.findIndex((x) => x.dateKey === r.dateKey) === i)
    .slice(0, 30);
  const resetSteps = (flow.steps || []).map((s) => ({
    ...s,
    done: false,
    completedAt: null,
  }));
  return {
    flow: { ...flow, steps: resetSteps, dayKey: day, reports },
    changed: true,
    report,
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
      repeat: flow.repeat === "daily" ? "daily" : null,
      dayKey: flow.dayKey || null,
      reports: Array.isArray(flow.reports)
        ? flow.reports.slice(0, 30).map((r) => ({
            dateKey: r.dateKey || "",
            pct: Number(r.pct) || 0,
            grade: r.grade || "F",
            feedback: r.feedback || "",
            done: Number(r.done) || 0,
            total: Number(r.total) || 0,
          }))
        : [],
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
