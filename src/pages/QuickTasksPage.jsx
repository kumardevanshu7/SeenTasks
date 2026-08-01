import { useMemo, useState } from "react";
import QuickTasks from "../components/QuickTasks";
import DateStrip from "../components/DateStrip";
import { todayKey } from "../lib/date";
import { useTaskStore } from "../store/useTaskStore";

export default function QuickTasksPage() {
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const quickTasks = useTaskStore((s) => s.quickTasks);
  const isToday = selectedDate === todayKey();

  const counts = useMemo(() => {
    const map = {};
    quickTasks.forEach((task) => {
      map[task.dateKey] = (map[task.dateKey] || 0) + 1;
    });
    return map;
  }, [quickTasks]);

  return (
    <div className="page narrow-page page-quick">
      <section className="simple-hero">
        <p className="eyebrow">Manual checklist</p>
        <h1>Quick tasks</h1>
        <p>
          {isToday
            ? "Small things for today—add them, tick them off. Unfinished items move to Not completed at midnight."
            : "Quick tasks for this day. Anything left open after midnight sits in Not completed."}
        </p>
      </section>

      <DateStrip selected={selectedDate} onSelect={setSelectedDate} counts={counts} />
      <QuickTasks dateKey={selectedDate} />
    </div>
  );
}
