import { useMemo, useState } from "react";
import QuickTasks from "../components/QuickTasks";
import WorkspaceOverview from "../components/WorkspaceOverview";
import DateStrip from "../components/DateStrip";
import { todayKey, toKey } from "../lib/date";
import { useTaskStore } from "../store/useTaskStore";
import { DEFAULT_WORKSPACE_ID } from "../lib/quickTaskService";

export default function QuickTasksPage() {
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const quickTasks = useTaskStore((s) => s.quickTasks);
  const isToday = selectedDate === todayKey();

  const counts = useMemo(() => {
    const map = {};
    (quickTasks || []).forEach((task) => {
      if (task.dateKey) map[task.dateKey] = (map[task.dateKey] || 0) + 1;
      if (task.done && task.completedAt) {
        const doneKey = toKey(task.completedAt);
        if (doneKey && doneKey !== task.dateKey) {
          map[doneKey] = (map[doneKey] || 0) + 1;
        }
      }
    });
    return map;
  }, [quickTasks]);

  return (
    <div className="page narrow-page page-quick">
      <section className="simple-hero simple-hero-compact">
        <p className="eyebrow">Manual checklist</p>
        <h1>Quick tasks</h1>
        <p>
          {isToday
            ? "Everyday list here. Workspace tasks appear below too."
            : "Checklist for this day, including workspace tasks."}
        </p>
      </section>

      <WorkspaceOverview />

      <DateStrip
        selected={selectedDate}
        onSelect={setSelectedDate}
        counts={counts}
        range={14}
        instantScroll
      />
      <QuickTasks dateKey={selectedDate} workspaceId={DEFAULT_WORKSPACE_ID} />
    </div>
  );
}
