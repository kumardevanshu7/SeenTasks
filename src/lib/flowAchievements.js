import { addDaysToKey, todayKey } from "./date";
import { flowCategories, flowProgress, flowProgressInCategory, snapshotForDay } from "./flowService";

/** 50 Everyday achievements — earned from category wins, streaks, grades, and setup. */
export const FLOW_ACHIEVEMENTS = [
  { id: "first-win", title: "First win", hint: "Finish every step in one tab today" },
  { id: "double-win", title: "Double winner", hint: "Complete two tabs in the same day" },
  { id: "triple-win", title: "Hat trick", hint: "Complete three tabs in the same day" },
  { id: "quad-win", title: "Quad sweep", hint: "Complete four tabs in the same day" },
  { id: "penta-win", title: "High five", hint: "Complete five tabs in the same day" },
  { id: "full-board", title: "Full board", hint: "Clear every tab in a flow in one day" },
  { id: "closer", title: "Closer", hint: "Finish the last open tab of the day" },
  { id: "any-step", title: "First tick", hint: "Mark any Everyday step done" },
  { id: "half-day", title: "Halfway hero", hint: "Hit 50% of a day’s steps" },
  { id: "perfect-day", title: "Perfect day", hint: "Finish 100% of a day’s steps" },
  { id: "perfect-5", title: "Five perfects", hint: "Five full-clear days" },
  { id: "perfect-10", title: "Ten perfects", hint: "Ten full-clear days" },
  { id: "a-plus", title: "A+ student", hint: "Earn an A+ on a daily card" },
  { id: "a-grade", title: "Honor roll", hint: "Earn an A on a daily card" },
  { id: "b-club", title: "B club", hint: "Ten days at B or better" },
  { id: "no-f-week", title: "No F week", hint: "Seven logged days without an F" },
  { id: "gold-week", title: "Gold week", hint: "Three A+ days in seven days" },
  { id: "win-streak-3", title: "Three-day fire", hint: "Win a tab three days in a row" },
  { id: "win-streak-7", title: "Week warrior", hint: "Win a tab seven days in a row" },
  { id: "win-streak-14", title: "Fortnight flame", hint: "Win a tab 14 days in a row" },
  { id: "win-streak-30", title: "Monthly machine", hint: "Win a tab 30 days in a row" },
  { id: "loyal-7", title: "Loyal tab", hint: "Same tab complete 7 days straight" },
  { id: "loyal-14", title: "Ride or die", hint: "Same tab complete 14 days straight" },
  { id: "loyal-30", title: "Tab marriage", hint: "Same tab complete 30 days straight" },
  { id: "wins-7", title: "Seven wins", hint: "Seven tab completions total" },
  { id: "wins-20", title: "Twenty wins", hint: "Twenty tab completions total" },
  { id: "wins-50", title: "Fifty wins", hint: "Fifty tab completions total" },
  { id: "wins-100", title: "Century club", hint: "One hundred tab completions" },
  { id: "steps-25", title: "25 ticks", hint: "Twenty-five done steps across days" },
  { id: "steps-100", title: "100 ticks", hint: "One hundred done steps across days" },
  { id: "steps-250", title: "250 ticks", hint: "Two hundred fifty done steps" },
  { id: "iron-10", title: "Iron tab", hint: "One tab fully done on 10 days" },
  { id: "iron-20", title: "Steel tab", hint: "One tab fully done on 20 days" },
  { id: "sweep-week", title: "Weekly sweep", hint: "Every tab wins at least once in 7 days" },
  { id: "balanced-week", title: "Balanced week", hint: "Three different tabs win in 7 days" },
  { id: "two-tabs", title: "Split focus", hint: "Keep two tabs on an Everyday flow" },
  { id: "five-tabs", title: "Tab garden", hint: "Keep five tabs on one flow" },
  { id: "rainbow", title: "Rainbow board", hint: "Six or more tabs on one flow" },
  { id: "everyday-on", title: "Everyday on", hint: "Have an Everyday flow" },
  { id: "two-flows", title: "Double life", hint: "Run two Everyday flows" },
  { id: "three-flows", title: "Triple track", hint: "Run three Everyday flows" },
  { id: "any-order-win", title: "Free range", hint: "Win a tab on an any-order flow" },
  { id: "sequence-win", title: "In order", hint: "Win a tab on a sequential flow" },
  { id: "first-report", title: "First report", hint: "Lock a daily report after midnight" },
  { id: "reports-7", title: "Week of cards", hint: "Seven daily reports saved" },
  { id: "reports-14", title: "Two-week log", hint: "Fourteen daily reports saved" },
  { id: "reports-30", title: "Month of cards", hint: "Thirty daily reports saved" },
  { id: "comeback", title: "Comeback", hint: "Win a tab after a day under 50%" },
  { id: "multi-flow-win", title: "Everywhere", hint: "Win a tab in two flows the same day" },
  { id: "always-finisher", title: "Always finisher", hint: "One tab complete on 80%+ of logged days (min 3)" },
];

function everydayFlows(flows) {
  return (flows || []).filter((f) => f.repeat === "daily");
}

function catsWonOnDay(flow, dateKey) {
  const snap = snapshotForDay(flow, dateKey);
  if (!snap) return [];
  return (snap.categories || []).filter((c) => c.total > 0 && c.done >= c.total);
}

function anyWinOnDay(flow, dateKey) {
  return catsWonOnDay(flow, dateKey).length > 0;
}

function maxWinsSameDay(list) {
  const today = todayKey();
  const keys = new Set([today]);
  list.forEach((f) => (f.reports || []).forEach((r) => r.dateKey && keys.add(r.dateKey)));
  let max = 0;
  keys.forEach((k) => {
    list.forEach((f) => {
      max = Math.max(max, catsWonOnDay(f, k).length);
    });
  });
  return max;
}

function streakDays(list, pred) {
  let n = 0;
  let key = todayKey();
  for (let i = 0; i < 40; i += 1) {
    if (!list.some((f) => pred(f, key))) break;
    n += 1;
    key = addDaysToKey(key, -1);
  }
  return n;
}

function sameTabStreak(flow) {
  const cats = flowCategories(flow);
  let best = 0;
  cats.forEach((cat) => {
    let n = 0;
    let key = todayKey();
    for (let i = 0; i < 40; i += 1) {
      const won = catsWonOnDay(flow, key).some((c) => c.id === cat.id);
      if (!won) break;
      n += 1;
      key = addDaysToKey(key, -1);
    }
    best = Math.max(best, n);
  });
  return best;
}

function totalTabWins(list) {
  let n = 0;
  const today = todayKey();
  const keys = new Set([today]);
  list.forEach((f) => (f.reports || []).forEach((r) => r.dateKey && keys.add(r.dateKey)));
  keys.forEach((k) => {
    list.forEach((f) => {
      n += catsWonOnDay(f, k).length;
    });
  });
  return n;
}

function totalDoneSteps(list) {
  let n = 0;
  list.forEach((f) => {
    n += flowProgress(f, todayKey()).done;
    (f.reports || []).forEach((r) => {
      n += Number(r.done) || 0;
    });
  });
  return n;
}

function ironDays(flow) {
  const cats = flowCategories(flow);
  let best = 0;
  cats.forEach((cat) => {
    let d = 0;
    const keys = new Set([todayKey(), ...(flow.reports || []).map((r) => r.dateKey)]);
    keys.forEach((k) => {
      if (catsWonOnDay(flow, k).some((c) => c.id === cat.id)) d += 1;
    });
    best = Math.max(best, d);
  });
  return best;
}

function uniqueWinsInWindow(flow, days) {
  const end = todayKey();
  const ids = new Set();
  for (let i = 0; i < days; i += 1) {
    catsWonOnDay(flow, addDaysToKey(end, -i)).forEach((c) => ids.add(c.id));
  }
  return ids.size;
}

function allTabsWonInWindow(flow, days) {
  const cats = flowCategories(flow).filter((c) => {
    const p = flowProgressInCategory(flow, c.id);
    return p.total > 0 || (flow.reports || []).some((r) =>
      (r.categories || []).some((x) => x.id === c.id && x.total > 0)
    );
  });
  if (cats.length === 0) return false;
  const won = uniqueWinsInWindow(flow, days);
  return won >= cats.length;
}

function gradesInWindow(flow, days) {
  const end = todayKey();
  const out = [];
  for (let i = 0; i < days; i += 1) {
    const snap = snapshotForDay(flow, addDaysToKey(end, -i));
    if (snap && snap.total > 0) out.push(snap.grade);
  }
  return out;
}

export function mostReliableCategory(flow) {
  if (!flow || flow.repeat !== "daily") return null;
  const cats = flowCategories(flow);
  const keys = [...new Set([todayKey(), ...(flow.reports || []).map((r) => r.dateKey).filter(Boolean)])];
  let best = null;
  cats.forEach((cat) => {
    let completeDays = 0;
    let logged = 0;
    keys.forEach((k) => {
      const snap = snapshotForDay(flow, k);
      const row = (snap?.categories || []).find((c) => c.id === cat.id);
      if (!row || row.total <= 0) return;
      logged += 1;
      if (row.done >= row.total) completeDays += 1;
    });
    if (!logged) return;
    const rate = completeDays / logged;
    const cand = { ...cat, completeDays, logged, rate };
    if (
      !best ||
      rate > best.rate ||
      (rate === best.rate && completeDays > best.completeDays)
    ) {
      best = cand;
    }
  });
  return best;
}

export function evaluateUnlockedIds(flows) {
  const list = everydayFlows(flows);
  const unlocked = new Set();
  if (!list.length) return unlocked;

  unlocked.add("everyday-on");
  if (list.length >= 2) unlocked.add("two-flows");
  if (list.length >= 3) unlocked.add("three-flows");

  const maxTabs = Math.max(0, ...list.map((f) => flowCategories(f).length));
  if (maxTabs >= 2) unlocked.add("two-tabs");
  if (maxTabs >= 5) unlocked.add("five-tabs");
  if (maxTabs >= 6) unlocked.add("rainbow");

  const today = todayKey();
  const maxSame = maxWinsSameDay(list);
  if (maxSame >= 1) unlocked.add("first-win");
  if (maxSame >= 2) unlocked.add("double-win");
  if (maxSame >= 3) unlocked.add("triple-win");
  if (maxSame >= 4) unlocked.add("quad-win");
  if (maxSame >= 5) unlocked.add("penta-win");

  list.forEach((f) => {
    const cats = flowCategories(f);
    const todayWins = catsWonOnDay(f, today);
    const activeCats = cats.filter((c) => flowProgressInCategory(f, c.id, today).total > 0);
    if (activeCats.length > 0 && todayWins.length === activeCats.length) {
      unlocked.add("full-board");
      if (activeCats.length > 1) unlocked.add("closer");
    } else if (todayWins.length > 0 && todayWins.length === activeCats.length - 1 && activeCats.length > 1) {
      /* last remaining still open — closer unlocks when last is done, covered by full-board */
    }
    if (todayWins.length > 0 && todayWins.length === activeCats.length && activeCats.length > 1) {
      unlocked.add("closer");
    }

    const prog = flowProgress(f, today);
    if (prog.done > 0) unlocked.add("any-step");
    if (prog.pct >= 50 && prog.total > 0) unlocked.add("half-day");
    if (prog.complete) unlocked.add("perfect-day");

    if ((f.reports || []).length >= 1) unlocked.add("first-report");
    if ((f.reports || []).length >= 7) unlocked.add("reports-7");
    if ((f.reports || []).length >= 14) unlocked.add("reports-14");
    if ((f.reports || []).length >= 30) unlocked.add("reports-30");

    const perfects = (f.reports || []).filter((r) => (r.pct || 0) >= 97).length + (prog.complete ? 1 : 0);
    if (perfects >= 5) unlocked.add("perfect-5");
    if (perfects >= 10) unlocked.add("perfect-10");

    const grades = [
      ...(f.reports || []).map((r) => r.grade),
      prog.total > 0 ? (prog.pct >= 97 ? "A+" : prog.pct >= 90 ? "A" : null) : null,
    ].filter(Boolean);
    if (grades.some((g) => g === "A+")) unlocked.add("a-plus");
    if (grades.some((g) => g === "A" || g === "A+")) unlocked.add("a-grade");
    const bOrBetter = (f.reports || []).filter((r) =>
      ["A+", "A", "B+", "B"].includes(r.grade)
    ).length;
    if (bOrBetter >= 10) unlocked.add("b-club");

    const weekGrades = gradesInWindow(f, 7);
    if (weekGrades.length >= 7 && weekGrades.every((g) => g !== "F")) unlocked.add("no-f-week");
    if (weekGrades.filter((g) => g === "A+").length >= 3) unlocked.add("gold-week");

    const loyal = sameTabStreak(f);
    if (loyal >= 7) unlocked.add("loyal-7");
    if (loyal >= 14) unlocked.add("loyal-14");
    if (loyal >= 30) unlocked.add("loyal-30");

    const iron = ironDays(f);
    if (iron >= 10) unlocked.add("iron-10");
    if (iron >= 20) unlocked.add("iron-20");

    if (allTabsWonInWindow(f, 7)) unlocked.add("sweep-week");
    if (uniqueWinsInWindow(f, 7) >= 3) unlocked.add("balanced-week");

    if (todayWins.length && f.anyOrder) unlocked.add("any-order-win");
    if (todayWins.length && !f.anyOrder) unlocked.add("sequence-win");
    (f.reports || []).forEach((r) => {
      const wins = (r.categories || []).filter((c) => c.total > 0 && c.done >= c.total);
      if (wins.length && f.anyOrder) unlocked.add("any-order-win");
      if (wins.length && !f.anyOrder) unlocked.add("sequence-win");
    });

    const reliable = mostReliableCategory(f);
    if (reliable && reliable.logged >= 3 && reliable.rate >= 0.8) {
      unlocked.add("always-finisher");
    }

    const reportsSorted = [...(f.reports || [])].sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1));
    if (reportsSorted[0] && (reportsSorted[0].pct || 0) < 50 && todayWins.length > 0) {
      unlocked.add("comeback");
    }
  });

  const anyStreak = streakDays(list, anyWinOnDay);
  if (anyStreak >= 3) unlocked.add("win-streak-3");
  if (anyStreak >= 7) unlocked.add("win-streak-7");
  if (anyStreak >= 14) unlocked.add("win-streak-14");
  if (anyStreak >= 30) unlocked.add("win-streak-30");

  const wins = totalTabWins(list);
  if (wins >= 7) unlocked.add("wins-7");
  if (wins >= 20) unlocked.add("wins-20");
  if (wins >= 50) unlocked.add("wins-50");
  if (wins >= 100) unlocked.add("wins-100");

  const steps = totalDoneSteps(list);
  if (steps >= 25) unlocked.add("steps-25");
  if (steps >= 100) unlocked.add("steps-100");
  if (steps >= 250) unlocked.add("steps-250");

  let twoFlowSameDay = false;
  const keys = new Set([today]);
  list.forEach((f) => (f.reports || []).forEach((r) => r.dateKey && keys.add(r.dateKey)));
  keys.forEach((k) => {
    const n = list.filter((f) => anyWinOnDay(f, k)).length;
    if (n >= 2) twoFlowSameDay = true;
  });
  if (twoFlowSameDay) unlocked.add("multi-flow-win");

  return unlocked;
}

export function mergeAchievementRecords(existing, unlockedIds) {
  const map = {};
  (existing || []).forEach((a) => {
    if (a?.id) map[a.id] = { id: a.id, unlockedAt: a.unlockedAt || new Date().toISOString() };
  });
  const now = new Date().toISOString();
  unlockedIds.forEach((id) => {
    if (!map[id]) map[id] = { id, unlockedAt: now };
  });
  return FLOW_ACHIEVEMENTS.map((def) => map[def.id]).filter(Boolean);
}

export function applyAchievementsToFlows(flows) {
  const ids = evaluateUnlockedIds(flows);
  return (flows || []).map((f) => {
    if (f.repeat !== "daily") return f;
    const achievements = mergeAchievementRecords(f.achievements, ids);
    if (achievements.length === (f.achievements || []).length) return f;
    return { ...f, achievements };
  });
}
