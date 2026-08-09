import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import QuickTasks from "../components/QuickTasks";
import DateStrip from "../components/DateStrip";
import OnePasswordGate from "../components/OnePasswordGate";
import { todayKey, toKey } from "../lib/date";
import { useTaskStore } from "../store/useTaskStore";
import { DEFAULT_WORKSPACE_ID, workspaceColorInk } from "../lib/quickTaskService";

export default function WorkspacePage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const workspaces = useTaskStore((s) => s.quickWorkspaces);
  const quickTasks = useTaskStore((s) => s.quickTasks);
  const deleteQuickWorkspace = useTaskStore((s) => s.deleteQuickWorkspace);

  const workspace = useMemo(
    () => (workspaces || []).find((w) => w.id === workspaceId),
    [workspaces, workspaceId]
  );

  const scopedTasks = useMemo(
    () => (quickTasks || []).filter((t) => (t.workspaceId || DEFAULT_WORKSPACE_ID) === workspaceId),
    [quickTasks, workspaceId]
  );

  const counts = useMemo(() => {
    const map = {};
    scopedTasks.forEach((task) => {
      if (task.dateKey) map[task.dateKey] = (map[task.dateKey] || 0) + 1;
      if (task.done && task.completedAt) {
        const doneKey = toKey(task.completedAt);
        if (doneKey && doneKey !== task.dateKey) {
          map[doneKey] = (map[doneKey] || 0) + 1;
        }
      }
    });
    return map;
  }, [scopedTasks]);

  const openLeft = scopedTasks.filter((t) => !t.done).length;

  if (!workspaceId || workspaceId === DEFAULT_WORKSPACE_ID) {
    return <Navigate to="/app" replace />;
  }

  if (workspaces?.length && !workspace) {
    return <Navigate to="/app" replace />;
  }

  const theme = workspace?.color || "#c9dff3";
  const ink = workspaceColorInk(theme);

  return (
    <div className="workspace-page-shell" style={{ "--ws-bg": theme, "--ws-ink": ink }}>
      <div className="page narrow-page page-quick page-workspace">
        <Link to="/app" className="workspace-back">
          <ArrowLeft size={16} /> Quick tasks
        </Link>

        <section className="simple-hero simple-hero-compact workspace-hero">
          <div className="workspace-hero-top">
            <div>
              <p className="eyebrow">Workspace</p>
              <h1>{workspace?.name || "Workspace"}</h1>
            </div>
            <div className="workspace-open-pill" aria-label="Open tasks">
              <span aria-hidden="true" />
              {openLeft === 0 ? "All clear" : `${openLeft} open`}
            </div>
          </div>
          <p className="workspace-hero-copy">
            {openLeft === 0
              ? "No open tasks — add something below."
              : `${openLeft} open task${openLeft === 1 ? "" : "s"} left in this space.`}
          </p>
          {workspace && workspace.id !== DEFAULT_WORKSPACE_ID && (
            <button type="button" className="workspace-hero-delete" onClick={() => setDeleteOpen(true)}>
              Delete workspace
            </button>
          )}
        </section>

        <DateStrip
          selected={selectedDate}
          onSelect={setSelectedDate}
          counts={counts}
          range={14}
          instantScroll
        />
        <QuickTasks dateKey={selectedDate} workspaceId={workspaceId} />

        <OnePasswordGate
          open={deleteOpen}
          title={`Delete workspace “${workspace?.name || ""}”`}
          description="Open tasks move to Personal. Answer your One Password question to continue."
          onClose={() => setDeleteOpen(false)}
          onConfirm={() => {
            deleteQuickWorkspace(workspaceId);
            setDeleteOpen(false);
            navigate("/app");
          }}
        />
      </div>
    </div>
  );
}
