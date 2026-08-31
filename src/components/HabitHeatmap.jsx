import { useMemo, useState } from "react";
import { format, subDays, eachDayOfInterval, startOfWeek, endOfWeek, parseISO } from "date-fns";
import { Calendar, Flame, Sparkles, Trophy, Zap } from "lucide-react";
import { todayKey, formatFriendly } from "../lib/date";
import { MOOD_EXPRESSIONS } from "../lib/moodService";

export default function HabitHeatmap({ quickTasks = [], followFlows = [], dailyMoods = {} }) {
  const [hoveredDay, setHoveredDay] = useState(null);

  // Build 52-week calendar matrix ending with today's week
  const { weeks, stats, monthLabels } = useMemo(() => {
    const today = new Date();
    const startDate = startOfWeek(subDays(today, 364), { weekStartsOn: 1 });
    const endDate = endOfWeek(today, { weekStartsOn: 1 });
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    // Map tasks completed per dayKey
    const tasksPerDay = {};
    (quickTasks || []).forEach((t) => {
      if (t.done) {
        const dKey = t.completedAt ? t.completedAt.slice(0, 10) : t.dateKey;
        if (dKey) {
          tasksPerDay[dKey] = (tasksPerDay[dKey] || 0) + 1;
        }
      }
    });

    // Map flow reports / completions
    const flowReportsPerDay = {};
    (followFlows || []).forEach((f) => {
      (f.reports || []).forEach((r) => {
        if (r.dateKey && (r.done > 0 || r.score > 0)) {
          flowReportsPerDay[r.dateKey] = {
            done: r.done,
            total: r.total,
            score: r.score,
            grade: r.grade,
          };
        }
      });
    });

    let totalActiveDays = 0;
    let totalCompletedItems = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const todayStr = todayKey();

    // Group into 7-day columns (weeks)
    const weekCols = [];
    let currentWeek = [];

    allDays.forEach((dayObj) => {
      const dateStr = format(dayObj, "yyyy-MM-dd");
      const isFuture = dateStr > todayStr;
      const taskCount = tasksPerDay[dateStr] || 0;
      const flowReport = flowReportsPerDay[dateStr] || null;
      const moodEntry = dailyMoods[dateStr] || null;
      const moodObj = moodEntry?.moodId
        ? MOOD_EXPRESSIONS.find((m) => m.id === moodEntry.moodId)
        : null;

      const activityScore = taskCount + (flowReport?.done || 0) + (moodObj ? 1 : 0);
      const isActive = activityScore > 0 && !isFuture;

      if (isActive) {
        totalActiveDays += 1;
        totalCompletedItems += taskCount + (flowReport?.done || 0);
        tempStreak += 1;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      } else if (!isFuture) {
        tempStreak = 0;
      }

      // Intensity level (0 to 4)
      let level = 0;
      if (!isFuture && activityScore > 0) {
        if (activityScore === 1) level = 1;
        else if (activityScore <= 3) level = 2;
        else if (activityScore <= 6) level = 3;
        else level = 4;
      }

      currentWeek.push({
        date: dayObj,
        dateKey: dateStr,
        dayOfMonth: format(dayObj, "d"),
        dayName: format(dayObj, "EEE"),
        monthName: format(dayObj, "MMM"),
        isFuture,
        isToday: dateStr === todayStr,
        taskCount,
        flowReport,
        moodObj,
        moodThought: moodEntry?.thought || "",
        activityScore,
        level,
      });

      if (currentWeek.length === 7) {
        weekCols.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      weekCols.push(currentWeek);
    }

    // Calculate current streak backwards from today
    let checkDate = parseISO(todayStr);
    let sCount = 0;
    while (true) {
      const k = format(checkDate, "yyyy-MM-dd");
      const hasAct = (tasksPerDay[k] || 0) > 0 || (flowReportsPerDay[k]?.done || 0) > 0 || !!dailyMoods[k];
      if (hasAct) {
        sCount += 1;
        checkDate = subDays(checkDate, 1);
      } else {
        // If today has 0 activity yet, check if yesterday was active
        if (k === todayStr && sCount === 0) {
          checkDate = subDays(checkDate, 1);
          const yk = format(checkDate, "yyyy-MM-dd");
          if ((tasksPerDay[yk] || 0) > 0 || (flowReportsPerDay[yk]?.done || 0) > 0 || !!dailyMoods[yk]) {
            continue;
          }
        }
        break;
      }
    }
    const currentStreak = sCount;

    // Month labels for header
    const mLabels = [];
    let lastMonth = "";
    weekCols.forEach((w, colIdx) => {
      const firstDay = w[0];
      const m = firstDay.monthName;
      if (m !== lastMonth && Number(firstDay.dayOfMonth) <= 14) {
        mLabels.push({ label: m, colIndex: colIdx });
        lastMonth = m;
      }
    });

    return {
      weeks: weekCols,
      monthLabels: mLabels,
      stats: {
        totalActiveDays,
        totalCompletedItems,
        currentStreak,
        longestStreak,
      },
    };
  }, [quickTasks, followFlows, dailyMoods]);

  return (
    <div className="habit-heatmap-card">
      <div className="habit-heatmap-head">
        <div className="habit-heatmap-title-wrap">
          <span className="habit-heatmap-icon">
            <Calendar size={18} />
          </span>
          <div>
            <h3>365-Day Activity & Consistency Heatmap</h3>
            <p>Daily completed tasks, everyday routines, and evening reflections</p>
          </div>
        </div>

        <div className="habit-heatmap-legend">
          <span className="legend-label">Less</span>
          <span className="heatmap-cell-sample level-0" />
          <span className="heatmap-cell-sample level-1" />
          <span className="heatmap-cell-sample level-2" />
          <span className="heatmap-cell-sample level-3" />
          <span className="heatmap-cell-sample level-4" />
          <span className="legend-label">More</span>
        </div>
      </div>

      {/* Grid wrapper with horizontal scrolling support */}
      <div className="habit-heatmap-scroll">
        <div className="habit-heatmap-matrix-wrap">
          {/* Month labels row */}
          <div className="heatmap-months-row">
            <div className="heatmap-weekday-spacer" />
            <div className="heatmap-months-track">
              {monthLabels.map((m, i) => (
                <span
                  key={i}
                  className="heatmap-month-label"
                  style={{ left: `calc(${m.colIndex} * 14px)` }}
                >
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          <div className="heatmap-body-row">
            {/* Weekday indicators */}
            <div className="heatmap-weekdays-col" aria-hidden="true">
              <span>Mon</span>
              <span></span>
              <span>Wed</span>
              <span></span>
              <span>Fri</span>
              <span></span>
              <span>Sun</span>
            </div>

            {/* 52 Week Columns */}
            <div className="heatmap-grid" role="grid" aria-label="Contribution grid">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="heatmap-col" role="row">
                  {week.map((day) => (
                    <div
                      key={day.dateKey}
                      className={`heatmap-cell level-${day.level}${day.isToday ? " is-today" : ""}${day.isFuture ? " is-future" : ""}`}
                      onMouseEnter={() => setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(null)}
                      aria-label={`${day.dateKey}: ${day.activityScore} activities`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hover Info Banner / Tooltip */}
      <div className="habit-heatmap-footer">
        <div className="habit-heatmap-hover-info">
          {hoveredDay ? (
            <div className="hover-info-content">
              <strong>{formatFriendly(hoveredDay.dateKey)}</strong>
              <span>
                {hoveredDay.activityScore === 0
                  ? hoveredDay.isFuture
                    ? "Upcoming day"
                    : "No activities logged"
                  : `${hoveredDay.taskCount} tasks · ${hoveredDay.flowReport ? `Flow Grade: ${hoveredDay.flowReport.grade || "A"}` : "No flow"}${hoveredDay.moodObj ? ` · Mood: ${hoveredDay.moodObj.emoji} ${hoveredDay.moodObj.vibeTag}` : ""}`}
              </span>
              {hoveredDay.moodThought && (
                <em className="hover-mood-thought">“{hoveredDay.moodThought}”</em>
              )}
            </div>
          ) : (
            <span className="hover-info-placeholder">
              Hover over any square to inspect your day’s work and reflection.
            </span>
          )}
        </div>

        {/* 4 Stats Chips */}
        <div className="habit-heatmap-stats-row">
          <div className="habit-stat-chip">
            <Flame size={14} className="stat-icon-flame" />
            <span className="stat-val">{stats.currentStreak}d</span>
            <span className="stat-lbl">Current Streak</span>
          </div>
          <div className="habit-stat-chip">
            <Trophy size={14} className="stat-icon-trophy" />
            <span className="stat-val">{stats.longestStreak}d</span>
            <span className="stat-lbl">Best Streak</span>
          </div>
          <div className="habit-stat-chip">
            <Zap size={14} className="stat-icon-zap" />
            <span className="stat-val">{stats.totalActiveDays}</span>
            <span className="stat-lbl">Active Days</span>
          </div>
          <div className="habit-stat-chip">
            <Sparkles size={14} className="stat-icon-sparkle" />
            <span className="stat-val">{stats.totalCompletedItems}</span>
            <span className="stat-lbl">Total Done</span>
          </div>
        </div>
      </div>
    </div>
  );
}
