import { todayKey, toKey, addDaysToKey, daysBetween } from "./date";
import { flowProgress, isEverydayActive, stepCategoryId, flowCategories } from "./flowService";
import { EXPRESSIONS_MAP } from "./moodService";

export const ANALYTICS_RANGES = [
  { id: "7d", label: "7 Days", days: 7 },
  { id: "14d", label: "14 Days", days: 14 },
  { id: "30d", label: "30 Days", days: 30 },
  { id: "all", label: "All Time", days: 90 },
];

function getWeekdayName(dateKey) {
  const d = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function getShortDate(dateKey) {
  const d = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateKey;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatHourLabel(h) {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

/**
 * Aggregates complete analytics across quick tasks, Everyday flows, mood logs, and focus sessions.
 */
export function computeAnalytics({
  quickTasks = [],
  followFlows = [],
  workspaces = [],
  dailyMoods = {},
  focusHistory = [],
  streakShields = null,
  unlockedAchievementCount = 0,
}, rangeId = "7d") {
  const rangeConfig = ANALYTICS_RANGES.find((r) => r.id === rangeId) || ANALYTICS_RANGES[0];
  const numDays = rangeConfig.days;
  const today = todayKey();

  // Generate date list from oldest to today
  const dateKeys = [];
  for (let i = numDays - 1; i >= 0; i -= 1) {
    dateKeys.push(addDaysToKey(today, -i));
  }
  const dateSet = new Set(dateKeys);

  const everydayFlows = followFlows.filter((f) => f.repeat === "daily");

  // 1. Compute Daily Performance Series
  let totalTasksDone = 0;
  let totalTasksCount = 0;
  let totalFlowDone = 0;
  let totalFlowCount = 0;

  const hourlyCounts = Array(24).fill(0);

  const dailyTrend = dateKeys.map((k) => {
    // Tasks on this day
    const dayTasks = quickTasks.filter((t) => t.dateKey === k);
    const tasksDone = dayTasks.filter((t) => t.done).length;
    const tasksTotal = dayTasks.length;

    totalTasksDone += tasksDone;
    totalTasksCount += tasksTotal;

    // Flow steps on this day
    let flowDone = 0;
    let flowTotal = 0;
    everydayFlows.forEach((f) => {
      const rep = (f.reports || []).find((r) => r.dateKey === k);
      if (rep) {
        flowDone += rep.done || 0;
        flowTotal += rep.total || 0;
      } else if (k === today && isEverydayActive(f, k)) {
        const prog = flowProgress(f, k);
        flowDone += prog.done;
        flowTotal += prog.total;
      }
    });

    totalFlowDone += flowDone;
    totalFlowCount += flowTotal;

    const totalDone = tasksDone + flowDone;
    const totalAll = tasksTotal + flowTotal;
    const pct = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;

    return {
      dateKey: k,
      dayName: getWeekdayName(k),
      shortDate: getShortDate(k),
      isToday: k === today,
      tasksDone,
      tasksTotal,
      flowDone,
      flowTotal,
      totalDone,
      totalAll,
      pct,
    };
  });

  // 2. Hourly Activity Heatmap
  quickTasks.forEach((t) => {
    if (t.done && t.completedAt) {
      const d = new Date(t.completedAt);
      if (!Number.isNaN(d.getTime())) {
        hourlyCounts[d.getHours()] += 1;
      }
    }
  });

  const maxHourlyCount = Math.max(...hourlyCounts, 1);
  const totalHourlyCompletions = hourlyCounts.reduce((a, b) => a + b, 0);

  const hourlyDistribution = hourlyCounts.map((count, hour) => ({
    hour,
    label: formatHourLabel(hour),
    count,
    pct: Math.round((count / maxHourlyCount) * 100),
  }));

  // Group into 4 clean time periods
  const morningCount = hourlyCounts.slice(6, 12).reduce((a, b) => a + b, 0);
  const afternoonCount = hourlyCounts.slice(12, 18).reduce((a, b) => a + b, 0);
  const eveningCount = hourlyCounts.slice(18, 24).reduce((a, b) => a + b, 0);
  const lateNightCount = hourlyCounts.slice(0, 6).reduce((a, b) => a + b, 0);

  const periodBreakdown = [
    {
      id: "morning",
      label: "Morning",
      icon: "🌅",
      time: "6 AM – 12 PM",
      count: morningCount,
      pct: totalHourlyCompletions > 0 ? Math.round((morningCount / totalHourlyCompletions) * 100) : 0,
      color: "#f59e0b",
    },
    {
      id: "afternoon",
      label: "Afternoon",
      icon: "☀️",
      time: "12 PM – 6 PM",
      count: afternoonCount,
      pct: totalHourlyCompletions > 0 ? Math.round((afternoonCount / totalHourlyCompletions) * 100) : 0,
      color: "#3b82f6",
    },
    {
      id: "night",
      label: "Night",
      icon: "🌙",
      time: "6 PM – 12 AM",
      count: eveningCount,
      pct: totalHourlyCompletions > 0 ? Math.round((eveningCount / totalHourlyCompletions) * 100) : 0,
      color: "#8b5cf6",
    },
  ];

  // Identify Peak Hours
  let maxHour = 9;
  let maxVal = -1;
  hourlyCounts.forEach((cnt, h) => {
    if (cnt > maxVal) {
      maxVal = cnt;
      maxHour = h;
    }
  });
  const peakHourWindow = `${formatHourLabel(maxHour)} – ${formatHourLabel((maxHour + 2) % 24)}`;

  // 3. Overall Productivity Score
  const grandTotalDone = totalTasksDone + totalFlowDone;
  const grandTotalAll = totalTasksCount + totalFlowCount;
  const completionRate = grandTotalAll > 0 ? Math.round((grandTotalDone / grandTotalAll) * 100) : 0;

  let scoreBadge = "Rebuilding";
  if (completionRate >= 90) scoreBadge = "Master Focus";
  else if (completionRate >= 75) scoreBadge = "High Velocity";
  else if (completionRate >= 50) scoreBadge = "Consistent Steady";
  else if (completionRate > 0) scoreBadge = "Building Momentum";

  // 4. Category / Workspace Performance
  const categoryMap = {};

  everydayFlows.forEach((f) => {
    const cats = flowCategories(f);
    cats.forEach((cat) => {
      if (!categoryMap[cat.id]) {
        categoryMap[cat.id] = {
          id: cat.id,
          name: cat.name || f.name,
          color: cat.color || f.color,
          done: 0,
          total: 0,
        };
      }
      (f.steps || []).forEach((s) => {
        if (stepCategoryId(s, f) === cat.id) {
          categoryMap[cat.id].total += 1;
          if (s.done) categoryMap[cat.id].done += 1;
        }
      });
    });
  });

  workspaces.forEach((ws) => {
    const wsTasks = quickTasks.filter((t) => t.workspaceId === ws.id);
    if (wsTasks.length > 0) {
      categoryMap[ws.id] = {
        id: ws.id,
        name: ws.name,
        color: ws.color,
        done: wsTasks.filter((t) => t.done).length,
        total: wsTasks.length,
      };
    }
  });

  const categoryBreakdown = Object.values(categoryMap)
    .map((c) => ({
      ...c,
      pct: c.total > 0 ? Math.round((c.done / c.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  // 5. Mood Energy Analytics
  const moodEntries = [];
  dateKeys.forEach((k) => {
    const entry = dailyMoods[k];
    if (entry && entry.moodId) {
      const meta = EXPRESSIONS_MAP[entry.moodId] || null;
      moodEntries.push({
        dateKey: k,
        shortDate: getShortDate(k),
        moodId: entry.moodId,
        title: entry.title || meta?.title || entry.moodId,
        emoji: entry.emoji || meta?.emoji || "✨",
        tag: entry.tag || meta?.tag || "Focus",
        note: entry.note || "",
        recordedAt: entry.recordedAt,
      });
    }
  });

  const moodCounts = {};
  moodEntries.forEach((m) => {
    moodCounts[m.title] = (moodCounts[m.title] || 0) + 1;
  });
  const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // 6. Focus Sessions Analytics
  let totalFocusMins = 0;
  let totalFocusSessions = 0;
  if (Array.isArray(focusHistory)) {
    focusHistory.forEach((sess) => {
      totalFocusMins += sess.minutes || 25;
      totalFocusSessions += 1;
    });
  }

  // 7. Smart Insights
  const smartInsights = [];

  const dayOfWeekDone = {};
  const dayOfWeekTotal = {};
  dailyTrend.forEach((d) => {
    dayOfWeekDone[d.dayName] = (dayOfWeekDone[d.dayName] || 0) + d.totalDone;
    dayOfWeekTotal[d.dayName] = (dayOfWeekTotal[d.dayName] || 0) + d.totalAll;
  });
  let bestDay = "Today";
  let bestDayRate = -1;
  Object.keys(dayOfWeekDone).forEach((dn) => {
    const tot = dayOfWeekTotal[dn] || 0;
    if (tot > 0) {
      const rate = (dayOfWeekDone[dn] || 0) / tot;
      if (rate > bestDayRate) {
        bestDayRate = rate;
        bestDay = dn;
      }
    }
  });

  if (bestDayRate > 0) {
    smartInsights.push({
      type: "peak-day",
      icon: "🔥",
      title: `${bestDay} is your strongest execution day`,
      description: `You hit an average of ${Math.round(bestDayRate * 100)}% completion on ${bestDay}s. Schedule your hardest deep work here.`,
    });
  }

  if (grandTotalDone > 0) {
    smartInsights.push({
      type: "peak-hour",
      icon: "⚡",
      title: `Prime Focus Window: ${peakHourWindow}`,
      description: `Your highest output occurs around ${peakHourWindow}. Block notifications during this window to enter flow state faster.`,
    });
  }

  if (topMood) {
    smartInsights.push({
      type: "mood",
      icon: "🧘",
      title: `Dominant Mindset: “${topMood}”`,
      description: `Your most frequent nightly reflection is ${topMood}. Consistent mindset tracking sharpens daily clarity.`,
    });
  }

  if (categoryBreakdown.length > 0) {
    const topCat = categoryBreakdown[0];
    smartInsights.push({
      type: "category",
      icon: "🎯",
      title: `Top Focus Domain: ${topCat.name}`,
      description: `${topCat.name} leads your workspace with ${topCat.done} completions (${topCat.pct}% completion rate).`,
    });
  }

  return {
    rangeId,
    numDays,
    overview: {
      totalTasksDone,
      totalTasksCount,
      totalFlowDone,
      totalFlowCount,
      grandTotalDone,
      grandTotalAll,
      completionRate,
      scoreBadge,
      activeShields: streakShields?.remaining ?? 2,
      achievementsCount: unlockedAchievementCount,
      totalFocusMins,
      totalFocusSessions,
    },
    dailyTrend,
    hourlyDistribution,
    periodBreakdown,
    totalHourlyCompletions,
    peakHourWindow,
    categoryBreakdown,
    moodEntries,
    topMood,
    smartInsights,
  };
}
