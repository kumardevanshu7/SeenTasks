import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useTaskStore } from "../store/useTaskStore";
import { toKey, todayKey, formatFriendly } from "../lib/date";
import TaskCard from "../components/TaskCard";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function CalendarPage() {
  const tasks = useTaskStore((s) => s.tasks);
  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selected, setSelected] = useState(todayKey());

  // Map of dateKey -> counts for quick lookup.
  const byDate = useMemo(() => {
    const map = {};
    tasks.forEach((task) => {
      if (task.status === "aborted") return;
      map[task.dateKey] = map[task.dateKey] || { total: 0, done: 0 };
      map[task.dateKey].total += 1;
      if (task.status === "completed") map[task.dateKey].done += 1;
    });
    return map;
  }, [tasks]);

  const cells = useMemo(() => {
    const first = new Date(view.year, view.month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const list = [];
    for (let i = 0; i < startPad; i += 1) list.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) list.push(new Date(view.year, view.month, d));
    return list;
  }, [view]);

  const selectedTasks = tasks.filter((t) => t.dateKey === selected && t.status !== "aborted");

  function shift(delta) {
    setView((v) => {
      const m = v.month + delta;
      return { year: v.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
  }

  return (
    <div className="page narrow-page">
      <section className="simple-hero">
        <p className="eyebrow">See your days</p>
        <h1>Calendar</h1>
        <p>Look back and ahead. Pick any day to see what you planned and what you finished.</p>
      </section>

      <section className="content-card calendar-card">
        <div className="calendar-nav">
          <button className="icon-button" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft size={17} /></button>
          <h2>{MONTHS[view.month]} {view.year}</h2>
          <button className="icon-button" onClick={() => shift(1)} aria-label="Next month"><ChevronRight size={17} /></button>
        </div>

        <div className="calendar-grid calendar-weekdays">
          {WEEKDAYS.map((day) => <span key={day} className="calendar-weekday">{day}</span>)}
        </div>
        <div className="calendar-grid calendar-days">
          {cells.map((date, index) => {
            if (!date) return <span key={`pad-${index}`} className="calendar-cell calendar-cell-empty" />;
            const key = toKey(date);
            const counts = byDate[key];
            const isToday = key === todayKey();
            const isSelected = key === selected;
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={`calendar-cell${isSelected ? " calendar-cell-selected" : ""}${isToday ? " calendar-cell-today" : ""}`}
              >
                <span className="calendar-date">{date.getDate()}</span>
                {counts && (
                  <span className="calendar-dot" title={`${counts.total} task${counts.total === 1 ? "" : "s"}`}>
                    {counts.done === counts.total ? <em className="dot-done" /> : <em className="dot-open" />}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="content-card calendar-day">
        <div className="card-heading"><span className="heading-icon"><CalendarDays size={18} /></span><div><h2>{formatFriendly(selected)}</h2><p>{selectedTasks.length} task{selectedTasks.length === 1 ? "" : "s"} on this day</p></div></div>
        {selectedTasks.length === 0 ? (
          <div className="soft-empty"><CalendarDays size={24} /><h3>Nothing here</h3><p>No tasks planned for this day.</p></div>
        ) : (
          <div className="task-list bin-list"><AnimatePresence mode="popLayout">{selectedTasks.map((task) => <TaskCard key={task.id} task={task} />)}</AnimatePresence></div>
        )}
      </section>
    </div>
  );
}
