import { useEffect, useMemo, useRef } from "react";
import { useTaskStore } from "../store/useTaskStore";
import { toKey, todayKey, isBeforeToday } from "../lib/date";
import { isFlowStepActiveOnDay } from "../lib/flowService";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DEFAULT_RANGE = 30;

export default function DateStrip({ selected, onSelect, counts, stats, range = DEFAULT_RANGE, instantScroll = false }) {
  const tasks = useTaskStore((s) => s.tasks) || [];
  const quickTasks = useTaskStore((s) => s.quickTasks) || [];
  const followFlows = useTaskStore((s) => s.followFlows) || [];
  const scrollRef = useRef(null);
  const selectedRef = useRef(null);
  const today = todayKey();

  const dayStatsMap = useMemo(() => {
    if (stats) return stats;
    const map = {};

    // 1. Regular board tasks
    tasks.forEach((t) => {
      if (t.status === "aborted" || !t.dateKey) return;
      const k = t.dateKey;
      if (!map[k]) map[k] = { total: 0, done: 0 };
      map[k].total += 1;
      if (t.status === "completed") map[k].done += 1;
    });

    // 2. Quick tasks
    quickTasks.forEach((t) => {
      const k = t.dateKey;
      if (!k) return;
      if (!map[k]) map[k] = { total: 0, done: 0 };
      map[k].total += 1;
      if (t.done) map[k].done += 1;
    });

    // 3. Everyday Flows
    followFlows.forEach((f) => {
      // Past reports
      (f.reports || []).forEach((r) => {
        if (!r.dateKey) return;
        const k = r.dateKey;
        if (!map[k]) map[k] = { total: 0, done: 0 };
        map[k].total += (r.total || 0);
        map[k].done += (r.done || 0);
      });

      // Today active steps
      const activeTodaySteps = (f.steps || []).filter((s) => isFlowStepActiveOnDay(s, today));
      if (activeTodaySteps.length > 0) {
        if (!map[today]) map[today] = { total: 0, done: 0 };
        map[today].total += activeTodaySteps.length;
        map[today].done += activeTodaySteps.filter((s) => s.done).length;
      }
    });

    return map;
  }, [tasks, quickTasks, followFlows, stats, today]);

  const days = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    const list = [];
    const span = Math.max(1, Number(range) || DEFAULT_RANGE);
    for (let offset = -span; offset <= span; offset += 1) {
      const d = new Date(base);
      d.setDate(base.getDate() + offset);
      list.push(d);
    }
    return list;
  }, [range]);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({
      behavior: instantScroll ? "auto" : "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [selected, instantScroll]);

  return (
    <div className="date-strip" ref={scrollRef} role="tablist" aria-label="Pick a day">
      {days.map((date) => {
        const key = toKey(date);
        const isSelected = key === selected;
        const isToday = key === today;
        const st = dayStatsMap[key];
        const hasData = st && st.total > 0;
        const pct = hasData ? Math.round((st.done / st.total) * 100) : null;
        const count = counts?.[key];

        return (
          <button
            key={key}
            ref={isSelected ? selectedRef : null}
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelect(key)}
            className={`date-pill${isSelected ? " date-pill-selected" : ""}${isToday ? " date-pill-today" : ""}`}
          >
            <span className="date-weekday">{WEEKDAYS[date.getDay()]}</span>
            <span className="date-number">{date.getDate()}</span>
            {isToday && <span className="date-today-dot">Today</span>}
            {pct !== null ? (
              <span
                className={`date-pct-badge${pct === 100 ? " is-complete" : pct > 0 ? " is-partial" : " is-zero"}`}
                title={`${st.done}/${st.total} completed (${pct}%)`}
              >
                {pct}%
              </span>
            ) : count ? (
              <span className="date-count">{count}</span>
            ) : (
              <span className="date-pct-empty" />
            )}
          </button>
        );
      })}
    </div>
  );
}
