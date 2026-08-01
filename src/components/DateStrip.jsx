import { useEffect, useMemo, useRef } from "react";
import { useTaskStore } from "../store/useTaskStore";
import { toKey, todayKey } from "../lib/date";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DEFAULT_RANGE = 30;

export default function DateStrip({ selected, onSelect, counts, range = DEFAULT_RANGE, instantScroll = false }) {
  const tasks = useTaskStore((s) => s.tasks);
  const scrollRef = useRef(null);
  const selectedRef = useRef(null);
  const today = todayKey();

  const byDate = useMemo(() => {
    if (counts) return counts;
    const map = {};
    tasks.forEach((task) => {
      if (task.status === "aborted") return;
      map[task.dateKey] = (map[task.dateKey] || 0) + 1;
    });
    return map;
  }, [tasks, counts]);

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
        const count = byDate[key];
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
            {count ? <span className="date-count">{count}</span> : <span className="date-count-empty" />}
          </button>
        );
      })}
    </div>
  );
}
