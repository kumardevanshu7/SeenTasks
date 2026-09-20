import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, CheckSquare, X } from "lucide-react";
import { useTaskStore } from "../store/useTaskStore";
import { toKey, todayKey, isBeforeToday, formatFriendly } from "../lib/date";
import { isFlowStepActiveOnDay } from "../lib/flowService";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DEFAULT_RANGE = 30;

function getQuickTaskDayImpact(t) {
  const createdKey = t.dateKey;
  const dueKey = t.dueDate && String(t.dueDate).trim() ? String(t.dueDate).trim() : null;
  const compKey = t.done && t.completedAt ? toKey(t.completedAt) : (t.done ? createdKey : null);
  const impacts = [];

  if (dueKey && dueKey > createdKey) {
    if (compKey) {
      impacts.push({ dateKey: compKey, done: true });
      if (dueKey !== compKey && compKey <= dueKey) {
        impacts.push({ dateKey: dueKey, done: true });
      }
    } else {
      impacts.push({ dateKey: dueKey, done: false });
    }
  } else {
    const k = createdKey;
    if (k) {
      const isDoneOnCreated = Boolean(t.done && (!compKey || compKey === k));
      impacts.push({ dateKey: k, done: isDoneOnCreated });
    }
    if (compKey && compKey !== k) {
      impacts.push({ dateKey: compKey, done: true });
    }
  }

  return impacts;
}

/** Build a list of completed items for a given dateKey */
function buildDayDoneList(quickTasks, followFlows, dateKey) {
  const items = [];

  // Quick tasks completed on this day
  (quickTasks || []).forEach((t) => {
    if (!t.done) return;
    const compKey = t.completedAt ? toKey(t.completedAt) : (t.done ? t.dateKey : null);
    if (compKey === dateKey) {
      items.push({ type: "task", title: t.title || "Untitled task" });
    }
  });

  // Flow steps completed on this day
  (followFlows || []).forEach((flow) => {
    (flow.steps || []).forEach((step) => {
      if (!step.completedAt) return;
      const compKey = toKey(step.completedAt);
      if (compKey === dateKey) {
        items.push({ type: "step", title: step.title || "Untitled step", flowName: flow.name });
      }
    });
    // Check past reports for completed steps count (fallback if no completedAt on step)
    const report = (flow.reports || []).find((r) => r.dateKey === dateKey);
    if (report && report.done > 0 && report.doneSteps) {
      report.doneSteps.forEach((st) => {
        const alreadyAdded = items.some((i) => i.type === "step" && i.title === st.title && i.flowName === flow.name);
        if (!alreadyAdded) {
          items.push({ type: "step", title: st.title, flowName: flow.name });
        }
      });
    }
  });

  return items;
}

function DayDetailPopup({ dateKey, items, onClose }) {
  const popupRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (popupRef.current && !popupRef.current.contains(e.target)) onClose();
    }
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <motion.div
      ref={popupRef}
      className="day-detail-popup"
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={{ duration: 0.15 }}
    >
      <div className="day-detail-head">
        <div>
          <CheckCircle2 size={14} className="day-detail-icon" />
          <span>Completed on {formatFriendly(dateKey)}</span>
        </div>
        <button type="button" className="day-detail-close" onClick={onClose} aria-label="Close">
          <X size={13} />
        </button>
      </div>
      {items.length === 0 ? (
        <p className="day-detail-empty">Nothing marked done this day.</p>
      ) : (
        <ul className="day-detail-list">
          {items.map((item, i) => (
            <li key={i} className="day-detail-item">
              <CheckSquare size={12} className={`day-detail-item-icon ${item.type}`} />
              <div className="day-detail-item-body">
                <span className="day-detail-item-title">{item.title}</span>
                {item.flowName && (
                  <span className="day-detail-item-sub">{item.flowName}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

export default function DateStrip({ selected, onSelect, counts, stats, range = DEFAULT_RANGE, instantScroll = false }) {
  const tasks = useTaskStore((s) => s.tasks) || [];
  const quickTasks = useTaskStore((s) => s.quickTasks) || [];
  const followFlows = useTaskStore((s) => s.followFlows) || [];
  const scrollRef = useRef(null);
  const selectedRef = useRef(null);
  const today = todayKey();
  const [detailKey, setDetailKey] = useState(null);

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
      const impacts = getQuickTaskDayImpact(t);
      impacts.forEach(({ dateKey, done }) => {
        if (!dateKey) return;
        if (!map[dateKey]) map[dateKey] = { total: 0, done: 0 };
        map[dateKey].total += 1;
        if (done) map[dateKey].done += 1;
      });
    });

    // 3. Everyday Flows
    followFlows.forEach((f) => {
      (f.reports || []).forEach((r) => {
        if (!r.dateKey) return;
        const k = r.dateKey;
        if (!map[k]) map[k] = { total: 0, done: 0 };
        map[k].total += (r.total || 0);
        map[k].done += (r.done || 0);
      });

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

  // Memoize completed items for currently open detail key
  const detailItems = useMemo(() => {
    if (!detailKey) return [];
    return buildDayDoneList(quickTasks, followFlows, detailKey);
  }, [detailKey, quickTasks, followFlows]);

  function handlePillClick(key) {
    onSelect(key);
    // Show detail popup for past/today days that have data (not future)
    const isFuture = key > today;
    if (!isFuture) {
      setDetailKey((prev) => (prev === key ? null : key));
    } else {
      setDetailKey(null);
    }
  }

  return (
    <div className="date-strip-wrapper">
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
              onClick={() => handlePillClick(key)}
              className={`date-pill${isSelected ? " date-pill-selected" : ""}${isToday ? " date-pill-today" : ""}${detailKey === key ? " date-pill-detail-open" : ""}`}
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

      <AnimatePresence>
        {detailKey && (
          <DayDetailPopup
            key={detailKey}
            dateKey={detailKey}
            items={detailItems}
            onClose={() => setDetailKey(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
