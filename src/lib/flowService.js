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
import { addDaysToKey, todayKey } from "./date";

/** 12 distinct light theme colors for Follow Flow */
export const FLOW_COLORS = [
  { id: "red", value: "#fecaca", ink: "#991b1b" },
  { id: "yellow", value: "#fff085", ink: "#854d0e" },
  { id: "lime", value: "#bbf451", ink: "#365314" },
  { id: "green", value: "#bbf7d0", ink: "#166534" },
  { id: "cyan", value: "#a5f3fc", ink: "#155e75" },
  { id: "blue", value: "#bae6fd", ink: "#075985" },
  { id: "indigo", value: "#c7d2fe", ink: "#3730a3" },
  { id: "purple", value: "#e9d5ff", ink: "#6b21a8" },
  { id: "pink", value: "#fbcfe8", ink: "#9d174d" },
  { id: "rose", value: "#fecdd3", ink: "#9f1239" },
  { id: "orange", value: "#fed7aa", ink: "#9a3412" },
  { id: "brown", value: "#e8d5c4", ink: "#6e3d1b" },
];

const LEGACY_COLOR_MAP = {
  mint: "green",
  sky: "blue",
  peach: "orange",
  lilac: "purple",
  sand: "brown",
  seafoam: "cyan",
  blush: "pink",
  butter: "yellow",
  fog: "indigo",
  sage: "lime",
};

export function flowColorValue(color) {
  if (!color) return FLOW_COLORS[0].value;
  const mapped = LEGACY_COLOR_MAP[color] || color;
  const hit = FLOW_COLORS.find((c) => c.id === mapped || c.value === mapped);
  return hit?.value || color;
}

export function flowColorInk(color) {
  if (!color) return FLOW_COLORS[0].ink;
  const mapped = LEGACY_COLOR_MAP[color] || color;
  const hit = FLOW_COLORS.find((c) => c.id === mapped || c.value === mapped);
  return hit?.ink || "#4a4038";
}

function flowsRef(uid) {
  return collection(db, "users", uid, "followFlows");
}

function isValidDateKey(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export const DEFAULT_FLOW_CATEGORY_ID = "main";

export function nextFlowCategoryColor(categories = []) {
  const used = new Set(
    (categories || [])
      .map((c) => FLOW_COLORS.find((x) => x.id === c.color || x.value === c.color)?.id)
      .filter(Boolean)
  );
  const free = FLOW_COLORS.find((c) => !used.has(c.id));
  return (free || FLOW_COLORS[categories.length % FLOW_COLORS.length]).id;
}

export function normalizeFlowCategory(data = {}, index = 0) {
  const name = (data.name || (index === 0 ? "Main" : `Category ${index + 1}`)).trim().slice(0, 32);
  const hit = FLOW_COLORS.find((c) => c.id === data.color || c.value === data.color);
  return {
    id: data.id || (index === 0 ? DEFAULT_FLOW_CATEGORY_ID : `cat-${index}`),
    name: name || "Category",
    color: hit?.id || FLOW_COLORS[index % FLOW_COLORS.length].id,
  };
}

export function flowCategories(flow) {
  const raw = Array.isArray(flow?.categories) ? flow.categories : [];
  if (raw.length > 0) return raw.map((c, i) => normalizeFlowCategory(c, i));
  return [normalizeFlowCategory({ id: DEFAULT_FLOW_CATEGORY_ID, name: "Main", color: "sky" }, 0)];
}

export function stepCategoryId(step, flow) {
  const cats = flowCategories(flow);
  const id = step?.categoryId || null;
  if (id && cats.some((c) => c.id === id)) return id;
  return cats[0]?.id || DEFAULT_FLOW_CATEGORY_ID;
}

export function normalizeFlowStep(data = {}, index = 0) {
  return {
    id: data.id || `step-${index}`,
    title: (data.title || "").trim() || `Step ${index + 1}`,
    done: Boolean(data.done),
    completedAt: data.completedAt || null,
    startDate: isValidDateKey(data.startDate) ? data.startDate : null,
    endDate: isValidDateKey(data.endDate) ? data.endDate : null,
    categoryId: data.categoryId || DEFAULT_FLOW_CATEGORY_ID,
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
          categories: Array.isArray(r.categories)
            ? r.categories.map((c) => ({
                id: c.id || "",
                name: (c.name || "Category").slice(0, 32),
                color: c.color || "",
                done: Number(c.done) || 0,
                total: Number(c.total) || 0,
                pct: Number(c.pct) || 0,
                grade: c.grade || gradeFromPct(Number(c.pct) || 0),
              })).filter((c) => c.id)
            : [],
        }))
        .filter((r) => r.dateKey)
        .slice(0, 31)
    : [];
  const repeat = data.repeat === "daily" ? "daily" : null;
  const labelIds = Array.isArray(data.labelIds)
    ? data.labelIds.filter(Boolean).map((x) => String(x).trim()).filter(Boolean)
    : data.labelId
      ? [String(data.labelId).trim()].filter(Boolean)
      : [];
  const endDate =
    repeat === "daily" && typeof data.endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.endDate)
      ? data.endDate
      : null;
  const categories = flowCategories({ categories: data.categories });
  const anyOrder = repeat === "daily" && Boolean(data.anyOrder);
  return {
    id,
    name: (data.name || "Flow").trim() || "Flow",
    color: flowColorValue(data.color),
    steps: steps.map((s) => ({
      ...s,
      categoryId: categories.some((c) => c.id === s.categoryId)
        ? s.categoryId
        : categories[0].id,
    })),
    categories,
    anyOrder,
    repeat,
    dayKey: data.dayKey || null,
    endDate,
    labelIds,
    reports,
    achievements: Array.isArray(data.achievements)
      ? data.achievements
          .filter((a) => a?.id)
          .map((a) => ({ id: String(a.id), unlockedAt: a.unlockedAt || null }))
          .slice(0, 50)
      : [],
    createdAt: data.createdAt || new Date().toISOString(),
  };
}

/** Everyday still running on this calendar day (inclusive of flow endDate). */
export function isEverydayActive(flow, day = null) {
  if (!flow || flow.repeat !== "daily") return false;
  const d = day || todayKey();
  if (flow.endDate && flow.endDate < d) return false;
  return true;
}

/** Step counts for this day: optional startDate ≤ day ≤ optional endDate. */
export function isFlowStepActiveOnDay(step, day = null) {
  const d = day || todayKey();
  if (step?.startDate && isValidDateKey(step.startDate) && step.startDate > d) return false;
  if (step?.endDate && isValidDateKey(step.endDate) && step.endDate < d) return false;
  return true;
}

/** Steps that belong in today’s Everyday sequence (all steps for one-shot flows). */
export function activeFlowSteps(flow, day = null) {
  const steps = flow?.steps || [];
  if (flow?.repeat !== "daily") return steps;
  const d = day || flow.dayKey || todayKey();
  return steps.filter((s) => isFlowStepActiveOnDay(s, d));
}

export function flowProgress(flow, day = null) {
  const d =
    day ||
    (flow?.repeat === "daily" ? flow.dayKey || todayKey() : null) ||
    todayKey();
  const steps = activeFlowSteps(flow, d);
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

export function flowProgressInCategory(flow, categoryId, day = null) {
  const d =
    day ||
    (flow?.repeat === "daily" ? flow.dayKey || todayKey() : null) ||
    todayKey();
  const steps = activeFlowSteps(flow, d).filter(
    (s) => stepCategoryId(s, flow) === categoryId
  );
  const total = steps.length;
  const done = steps.filter((s) => s.done).length;
  return {
    total,
    done,
    pct: total === 0 ? 0 : Math.round((done / total) * 100),
    complete: total > 0 && done === total,
  };
}

function categoryReportSlice(flow, dateKey) {
  return flowCategories(flow)
    .map((c) => {
      const p = flowProgressInCategory(flow, c.id, dateKey);
      if (p.total === 0) return null;
      const grade = gradeFromPct(p.pct);
      return {
        id: c.id,
        name: c.name,
        color: c.color,
        done: p.done,
        total: p.total,
        pct: p.pct,
        grade,
      };
    })
    .filter(Boolean);
}

export const REPORT_PERIODS = [
  { id: "week", days: 7, label: "7 days" },
  { id: "fortnight", days: 14, label: "2 weeks" },
  { id: "month", days: 30, label: "1 month" },
];

function normalizeStoredCategoryReport(c = {}) {
  const pct = Number(c.pct) || 0;
  return {
    id: c.id || "",
    name: (c.name || "Category").slice(0, 32),
    color: c.color || "",
    done: Number(c.done) || 0,
    total: Number(c.total) || 0,
    pct,
    grade: c.grade || gradeFromPct(pct),
  };
}

export function snapshotForDay(flow, dateKey) {
  if (!flow || !dateKey) return null;
  if (dateKey === todayKey()) return buildEverydayReport(flow, dateKey);
  const hit = (flow.reports || []).find((r) => r.dateKey === dateKey);
  if (!hit) return null;
  return {
    ...hit,
    categories: Array.isArray(hit.categories)
      ? hit.categories.map(normalizeStoredCategoryReport).filter((c) => c.id && c.total > 0)
      : [],
  };
}

function keysInWindow(endKey, days) {
  const list = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    list.push(addDaysToKey(endKey, -i));
  }
  return list;
}

function sumSnapshots(snaps) {
  const done = snaps.reduce((n, r) => n + (Number(r.done) || 0), 0);
  const total = snaps.reduce((n, r) => n + (Number(r.total) || 0), 0);
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const grade = gradeFromPct(pct);
  return { done, total, pct, grade, feedback: feedbackForGrade(grade) };
}

/** Average completion across the last `days` calendar days (includes today if in range). */
export function periodReportForFlow(flow, days, endKey = todayKey()) {
  if (!flow || flow.repeat !== "daily") return null;
  const created = flow.createdAt ? String(flow.createdAt).slice(0, 10) : null;
  const snaps = keysInWindow(endKey, days)
    .filter((k) => !created || k >= created)
    .filter((k) => !flow.endDate || k <= flow.endDate)
    .map((k) => snapshotForDay(flow, k))
    .filter(Boolean);
  if (!snaps.length) return null;
  const sum = sumSnapshots(snaps);
  return {
    dateKey: endKey,
    periodDays: days,
    daysLogged: snaps.length,
    ...sum,
  };
}

export function periodReportsForCategories(flow, days, endKey = todayKey()) {
  if (!flow || flow.repeat !== "daily") return [];
  const created = flow.createdAt ? String(flow.createdAt).slice(0, 10) : null;
  const keys = keysInWindow(endKey, days)
    .filter((k) => !created || k >= created)
    .filter((k) => !flow.endDate || k <= flow.endDate);
  const cats = flowCategories(flow);
  return cats
    .map((cat) => {
      const snaps = keys
        .map((k) => {
          const day = snapshotForDay(flow, k);
          if (!day) return null;
          const row = (day.categories || []).find((c) => c.id === cat.id);
          return row && row.total > 0 ? row : null;
        })
        .filter(Boolean);
      if (!snaps.length) return null;
      const sum = sumSnapshots(snaps);
      return {
        category: cat,
        report: {
          dateKey: endKey,
          periodDays: days,
          daysLogged: snaps.length,
          ...sum,
        },
      };
    })
    .filter(Boolean);
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
  const prog = flowProgress(flow, dateKey);
  const grade = gradeFromPct(prog.pct);
  return {
    dateKey,
    pct: prog.pct,
    grade,
    feedback: feedbackForGrade(grade),
    done: prog.done,
    total: prog.total,
    categories: categoryReportSlice(flow, dateKey),
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

  const shouldReport = !flow.endDate || dayKey <= flow.endDate;
  const report = shouldReport ? buildEverydayReport(flow, dayKey) : null;
  const reports = report
    ? [report, ...(flow.reports || [])]
        .filter((r, i, arr) => r.dateKey && arr.findIndex((x) => x.dateKey === r.dateKey) === i)
        .slice(0, 31)
    : flow.reports || [];
  const stillActive = isEverydayActive(flow, day);
  const resetSteps = stillActive
    ? (flow.steps || []).map((s) => ({
        ...s,
        done: false,
        completedAt: null,
      }))
    : flow.steps || [];
  return {
    flow: { ...flow, steps: resetSteps, dayKey: day, reports },
    changed: true,
    report,
  };
}

/**
 * After ticking any step in any-order mode, done items bubble to the top
 * of their category in the order they were completed.
 */
export function reorderAnyOrderInCategory(flow, categoryId) {
  const steps = [...(flow?.steps || [])];
  const cid = categoryId || flowCategories(flow)[0]?.id;
  const indexes = [];
  const cat = [];
  steps.forEach((s, i) => {
    if (stepCategoryId(s, flow) === cid) {
      indexes.push(i);
      cat.push(s);
    }
  });
  const done = cat
    .filter((s) => s.done)
    .sort((a, b) => {
      const ta = a.completedAt || "";
      const tb = b.completedAt || "";
      if (ta === tb) return 0;
      return ta < tb ? -1 : 1;
    });
  const open = cat.filter((s) => !s.done);
  const nextCat = [...done, ...open];
  const out = [...steps];
  indexes.forEach((idx, j) => {
    out[idx] = nextCat[j];
  });
  return out;
}

/**
 * Step is actionable when all earlier same-category steps are done.
 * Everyday any-order mode unlocks every step that is active today.
 */
export function isFlowStepUnlocked(steps, index, day = null, everyday = false, opts = {}) {
  if (index < 0 || index >= (steps?.length || 0)) return false;
  const d = day || todayKey();
  const step = steps[index];
  if (everyday && !isFlowStepActiveOnDay(step, d)) return false;
  if (opts.anyOrder) return true;
  const cid = opts.categoryId || step?.categoryId || DEFAULT_FLOW_CATEGORY_ID;
  for (let i = 0; i < index; i += 1) {
    const prev = steps[i];
    const prevCid = prev?.categoryId || DEFAULT_FLOW_CATEGORY_ID;
    if (prevCid !== cid) continue;
    if (everyday && !isFlowStepActiveOnDay(prev, d)) continue;
    if (!prev?.done) return false;
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
        startDate: isValidDateKey(s.startDate) ? s.startDate : null,
        endDate: isValidDateKey(s.endDate) ? s.endDate : null,
        categoryId: s.categoryId || DEFAULT_FLOW_CATEGORY_ID,
      })),
      categories: flowCategories(flow).map((c, i) => ({
        id: c.id || `cat-${i}`,
        name: c.name || `Category ${i + 1}`,
        color: c.color || FLOW_COLORS[i % FLOW_COLORS.length].id,
      })),
      anyOrder: flow.repeat === "daily" && Boolean(flow.anyOrder),
      repeat: flow.repeat === "daily" ? "daily" : null,
      dayKey: flow.dayKey || null,
      endDate:
        flow.repeat === "daily" &&
        typeof flow.endDate === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(flow.endDate)
          ? flow.endDate
          : null,
      labelIds: Array.isArray(flow.labelIds)
        ? flow.labelIds.filter(Boolean).map((x) => String(x).trim()).filter(Boolean)
        : [],
      reports: Array.isArray(flow.reports)
        ? flow.reports.slice(0, 31).map((r) => ({
            dateKey: r.dateKey || "",
            pct: Number(r.pct) || 0,
            grade: r.grade || "F",
            feedback: r.feedback || "",
            done: Number(r.done) || 0,
            total: Number(r.total) || 0,
            categories: Array.isArray(r.categories)
              ? r.categories.map((c) => ({
                  id: c.id || "",
                  name: (c.name || "Category").slice(0, 32),
                  color: c.color || "",
                  done: Number(c.done) || 0,
                  total: Number(c.total) || 0,
                  pct: Number(c.pct) || 0,
                  grade: c.grade || "F",
                })).filter((c) => c.id)
              : [],
          }))
        : [],
      achievements: Array.isArray(flow.achievements)
        ? flow.achievements
            .filter((a) => a?.id)
            .map((a) => ({ id: String(a.id), unlockedAt: a.unlockedAt || null }))
            .slice(0, 50)
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
