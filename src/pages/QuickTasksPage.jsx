import { useMemo, useState } from "react";
import QuickTasks from "../components/QuickTasks";
import WorkspaceOverview from "../components/WorkspaceOverview";
import FlowOverview from "../components/FlowOverview";
import DateStrip from "../components/DateStrip";
import { todayKey, toKey } from "../lib/date";
import { useTaskStore } from "../store/useTaskStore";
import { DEFAULT_WORKSPACE_ID } from "../lib/quickTaskService";

export default function QuickTasksPage() {
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const quickTasks = useTaskStore((s) => s.quickTasks);
  const isToday = selectedDate === todayKey();

  const personalTasks = useMemo(
    () => (quickTasks || []).filter((t) => (t.workspaceId || DEFAULT_WORKSPACE_ID) === DEFAULT_WORKSPACE_ID),
    [quickTasks]
  );

  const counts = useMemo(() => {
    const map = {};
    personalTasks.forEach((task) => {
      if (task.dateKey) map[task.dateKey] = (map[task.dateKey] || 0) + 1;
      if (task.done && task.completedAt) {
        const doneKey = toKey(task.completedAt);
        if (doneKey && doneKey !== task.dateKey) {
          map[doneKey] = (map[doneKey] || 0) + 1;
        }
      }
    });
    return map;
  }, [personalTasks]);

  return (
    <div className="page narrow-page page-quick">
      <section className="simple-hero simple-hero-compact">
        <p className="eyebrow">Manual checklist</p>
        <h1>Quick tasks</h1>
        <p>
          {isToday
            ? "Everyday list here. Use workspaces for separate categories."
            : "Personal checklist for this day."}
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

      <FlowOverview />
    </div>
  );
}
