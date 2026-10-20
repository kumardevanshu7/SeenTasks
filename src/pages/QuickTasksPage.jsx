import { useMemo, useState } from "react";
import { CheckSquare, History } from "lucide-react";
import QuickTasks from "../components/QuickTasks";
import WorkspaceOverview from "../components/WorkspaceOverview";
import WorkspaceLogs from "../components/WorkspaceLogs";
import DateStrip from "../components/DateStrip";
import { todayKey, toKey } from "../lib/date";
import { useTaskStore } from "../store/useTaskStore";
import { DEFAULT_WORKSPACE_ID } from "../lib/quickTaskService";

export default function QuickTasksPage() {
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [activeTab, setActiveTab] = useState("tasks"); // "tasks" | "logs"
  const [logFilterLabelId, setLogFilterLabelId] = useState(null);
  const quickTasks = useTaskStore((s) => s.quickTasks);
  const isToday = selectedDate === todayKey();

  const personalTasks = useMemo(
    () => (quickTasks || []).filter((t) => (t.workspaceId || DEFAULT_WORKSPACE_ID) === DEFAULT_WORKSPACE_ID && !t.flowRef),
    [quickTasks]
  );
  const openCount = useMemo(() => personalTasks.filter((t) => !t.done).length, [personalTasks]);
  const completedCount = useMemo(() => personalTasks.filter((t) => t.done).length, [personalTasks]);

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

      {/* Tab Switcher for Personal Workspace */}
      <div className="workspace-tabs-bar" role="tablist" aria-label="Quick tasks view">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "tasks"}
          className={`workspace-tab-btn${activeTab === "tasks" ? " is-active" : ""}`}
          onClick={() => setActiveTab("tasks")}
        >
          <CheckSquare size={14} aria-hidden="true" />
          <span>Checklist</span>
          {openCount > 0 && <span className="workspace-tab-badge">{openCount}</span>}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "logs"}
          className={`workspace-tab-btn${activeTab === "logs" ? " is-active" : ""}`}
          onClick={() => setActiveTab("logs")}
        >
          <History size={14} aria-hidden="true" />
          <span>Personal logs</span>
          {completedCount > 0 && (
            <span className="workspace-tab-badge is-done">{completedCount}</span>
          )}
        </button>
      </div>

      {activeTab === "logs" ? (
        <WorkspaceLogs
          workspaceId={DEFAULT_WORKSPACE_ID}
          workspaceName="Personal"
          workspaceColor="#e8e1d6"
          initialLabelId={logFilterLabelId}
          onSwitchToTasks={() => setActiveTab("tasks")}
        />
      ) : (
        <>
          <DateStrip
            selected={selectedDate}
            onSelect={setSelectedDate}
            counts={counts}
            range={14}
            instantScroll
          />
          <QuickTasks
            dateKey={selectedDate}
            workspaceId={DEFAULT_WORKSPACE_ID}
            onOpenLogs={(labelId) => {
              setLogFilterLabelId(labelId);
              setActiveTab("logs");
            }}
          />
        </>
      )}
    </div>
  );
}
