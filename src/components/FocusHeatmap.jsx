import { useMemo, useState } from "react";
import { format, subDays, eachDayOfInterval, startOfWeek, endOfWeek, parseISO } from "date-fns";
import { Clock, Flame, Sparkles, Timer, Trophy, Zap } from "lucide-react";
import { todayKey, formatFriendly } from "../lib/date";

export default function FocusHeatmap({ focusHistory = [] }) {
  const [hoveredDay, setHoveredDay] = useState(null);

  const { weeks, stats, monthLabels } = useMemo(() => {
    const today = new Date();
    const startDate = startOfWeek(subDays(today, 364), { weekStartsOn: 1 });
    const endDate = endOfWeek(today, { weekStartsOn: 1 });
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    // Map sessions per dayKey
    const sessionsByDay = {};
    (focusHistory || []).forEach((sess) => {
      const dKey = sess.dateKey || (sess.completedAt ? sess.completedAt.slice(0, 10) : null);
      if (!dKey) return;
      if (!sessionsByDay[dKey]) {
        sessionsByDay[dKey] = {
          sessions: [],
          totalMins: 0,
          extendedMins: 0,
          oneHourCount: 0,
        };
      }
      const dur = Number(sess.durationMinutes) || (sess.mode === "oneHour" ? 60 : 25);
      const ext = Number(sess.extendedMinutes) || 0;
      const total = Number(sess.totalMinutes) || (dur + ext);
      sessionsByDay[dKey].sessions.push(sess);
      sessionsByDay[dKey].totalMins += total;
      sessionsByDay[dKey].extendedMins += ext;
      if (sess.mode === "oneHour" || dur >= 50) {
        sessionsByDay[dKey].oneHourCount += 1;
      }
    });

    let totalActiveDays = 0;
    let totalSessions = 0;
    let grandTotalMins = 0;
    let grandTotalExtended = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const todayStr = todayKey();

    const weekCols = [];
    let currentWeek = [];

    allDays.forEach((dayObj) => {
      const dateStr = format(dayObj, "yyyy-MM-dd");
      const isFuture = dateStr > todayStr;
      const dayData = sessionsByDay[dateStr] || null;
      const totalMins = dayData?.totalMins || 0;
      const sessionCount = dayData?.sessions?.length || 0;
      const isActive = sessionCount > 0 && !isFuture;

      if (isActive) {
        totalActiveDays += 1;
        totalSessions += sessionCount;
        grandTotalMins += totalMins;
        grandTotalExtended += dayData?.extendedMins || 0;
        tempStreak += 1;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      } else if (!isFuture) {
        tempStreak = 0;
      }

      // Intensity level (0 to 4) based on deep focus minutes
      let level = 0;
      if (!isFuture && totalMins > 0) {
        if (totalMins < 60) level = 1;
        else if (totalMins < 120) level = 2; // ~1 hour
        else if (totalMins < 180) level = 3; // ~2 hours
        else level = 4; // 3+ hours
      }

      currentWeek.push({
        date: dayObj,
        dateKey: dateStr,
        dayOfMonth: format(dayObj, "d"),
        dayName: format(dayObj, "EEE"),
        monthName: format(dayObj, "MMM"),
        isFuture,
        isToday: dateStr === todayStr,
        totalMins,
        extendedMins: dayData?.extendedMins || 0,
        sessionCount,
        oneHourCount: dayData?.oneHourCount || 0,
        sessions: dayData?.sessions || [],
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
      const hasFocus = (sessionsByDay[k]?.sessions?.length || 0) > 0;
      if (hasFocus) {
        sCount += 1;
        checkDate = subDays(checkDate, 1);
      } else {
        if (k === todayStr && sCount === 0) {
          checkDate = subDays(checkDate, 1);
          const yk = format(checkDate, "yyyy-MM-dd");
          if ((sessionsByDay[yk]?.sessions?.length || 0) > 0) {
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

    const hours = Math.floor(grandTotalMins / 60);
    const mins = grandTotalMins % 60;
    const totalFocusTimeStr = hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ""}` : `${mins}m`;

    return {
      weeks: weekCols,
      monthLabels: mLabels,
      stats: {
        totalActiveDays,
        totalSessions,
        grandTotalMins,
        grandTotalExtended,
        totalFocusTimeStr,
        currentStreak,
        longestStreak,
      },
    };
  }, [focusHistory]);

  return (
    <div className="habit-heatmap-card focus-heatmap-card">
      <div className="habit-heatmap-head">
        <div className="habit-heatmap-title-wrap">
          <span className="habit-heatmap-icon focus-heatmap-badge">
            <Timer size={18} />
          </span>
          <div>
            <h3>1-Hour Work & Deep Focus Activity Map</h3>
            <p>Annual GitHub-style consistency grid for 1-hour sprints and extended focus sessions</p>
          </div>
        </div>

        <div className="habit-heatmap-legend">
          <span className="legend-label">Less</span>
          <span className="focus-heatmap-cell-sample level-0" />
          <span className="focus-heatmap-cell-sample level-1" />
          <span className="focus-heatmap-cell-sample level-2" />
          <span className="focus-heatmap-cell-sample level-3" />
          <span className="focus-heatmap-cell-sample level-4" />
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
            <div className="heatmap-grid" role="grid" aria-label="Focus contribution grid">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="heatmap-col" role="row">
                  {week.map((day) => (
                    <div
                      key={day.dateKey}
                      className={`focus-heatmap-cell level-${day.level}${day.isToday ? " is-today" : ""}${day.isFuture ? " is-future" : ""}`}
                      onMouseEnter={() => setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(null)}
                      aria-label={`${day.dateKey}: ${day.sessionCount} focus sessions (${day.totalMins}m)`}
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
                {hoveredDay.sessionCount === 0
                  ? hoveredDay.isFuture
                    ? "Upcoming day"
                    : "No focus sessions logged"
                  : `${hoveredDay.sessionCount} session${hoveredDay.sessionCount > 1 ? "s" : ""} · ${hoveredDay.totalMins} mins total focus${hoveredDay.extendedMins > 0 ? ` (+${hoveredDay.extendedMins}m extended)` : ""}`}
              </span>
              {hoveredDay.sessions.length > 0 && (
                <div className="hover-sessions-list">
                  {hoveredDay.sessions.slice(0, 3).map((s, idx) => (
                    <span key={idx} className="hover-session-tag">
                      🎯 {s.taskTitle} ({s.durationMinutes || 60}m{s.extendedMinutes ? ` +${s.extendedMinutes}m` : ""})
                    </span>
                  ))}
                  {hoveredDay.sessions.length > 3 && (
                    <span className="hover-session-more">+{hoveredDay.sessions.length - 3} more</span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <span className="hover-info-placeholder">
              Hover over any square to view your 1-hour sessions, task details, and extensions for that day.
            </span>
          )}
        </div>

        {/* Stats Chips */}
        <div className="habit-heatmap-stats-row">
          <div className="habit-stat-chip">
            <Flame size={14} className="stat-icon-flame" />
            <span className="stat-val">{stats.currentStreak}d</span>
            <span className="stat-lbl">Focus Streak</span>
          </div>
          <div className="habit-stat-chip">
            <Trophy size={14} className="stat-icon-trophy" />
            <span className="stat-val">{stats.longestStreak}d</span>
            <span className="stat-lbl">Best Streak</span>
          </div>
          <div className="habit-stat-chip">
            <Timer size={14} className="stat-icon-zap" />
            <span className="stat-val">{stats.totalSessions}</span>
            <span className="stat-lbl">1-Hr Sessions</span>
          </div>
          <div className="habit-stat-chip">
            <Clock size={14} className="stat-icon-sparkle" />
            <span className="stat-val">{stats.totalFocusTimeStr}</span>
            <span className="stat-lbl">Total Focus</span>
          </div>
          <div className="habit-stat-chip">
            <Zap size={14} className="stat-icon-zap" />
            <span className="stat-val">+{stats.grandTotalExtended}m</span>
            <span className="stat-lbl">Extra Extended</span>
          </div>
        </div>
      </div>
    </div>
  );
}
