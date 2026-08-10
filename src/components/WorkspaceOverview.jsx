import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import CreateWorkspaceModal from "./CreateWorkspaceModal";
import { useTaskStore } from "../store/useTaskStore";
import { DEFAULT_WORKSPACE_ID, workspaceColorInk } from "../lib/quickTaskService";
import { prefetchRoute } from "../lib/prefetchRoute";

export default function WorkspaceOverview() {
  const navigate = useNavigate();
  const workspaces = useTaskStore((s) => s.quickWorkspaces);
  const quickTasks = useTaskStore((s) => s.quickTasks);
  const addQuickWorkspace = useTaskStore((s) => s.addQuickWorkspace);
  const [createOpen, setCreateOpen] = useState(false);

  const customSpaces = useMemo(
    () => (workspaces || []).filter((w) => w.id !== DEFAULT_WORKSPACE_ID),
    [workspaces]
  );

  const statsBySpace = useMemo(() => {
    const map = {};
    (quickTasks || []).forEach((t) => {
      const id = t.workspaceId || DEFAULT_WORKSPACE_ID;
      if (!map[id]) map[id] = { total: 0, done: 0, open: 0 };
      map[id].total += 1;
      if (t.done) map[id].done += 1;
      else map[id].open += 1;
    });
    return map;
  }, [quickTasks]);

  function handleCreate({ name, color }) {
    const created = addQuickWorkspace({ name, color });
    setCreateOpen(false);
    if (created?.id) navigate(`/app/workspace/${created.id}`);
  }

  return (
    <section className="workspace-overview" aria-label="Workspaces">
      <div className="workspace-overview-head">
        <div>
          <h2>Workspaces</h2>
          <p>Separate lists for each category. Open one to add tasks there.</p>
        </div>
        <button type="button" className="button button-secondary workspace-overview-new" onClick={() => setCreateOpen(true)}>
          <Plus size={15} /> New workspace
        </button>
      </div>

      {customSpaces.length === 0 ? (
        <p className="workspace-overview-empty">No workspaces yet — create one for Job, Insta, YouTube, etc.</p>
      ) : (
        <div className="workspace-overview-grid">
          {customSpaces.map((ws) => {
            const stats = statsBySpace[ws.id] || { total: 0, done: 0, open: 0 };
            const pct = stats.total === 0 ? 0 : Math.round((stats.done / stats.total) * 100);
            const radius = 16;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - (pct / 100) * circumference;
            return (
              <Link
                key={ws.id}
                to={`/app/workspace/${ws.id}`}
                className="workspace-overview-card"
                onPointerEnter={() => prefetchRoute(`/app/workspace/${ws.id}`)}
                onTouchStart={() => prefetchRoute(`/app/workspace/${ws.id}`)}
                style={{
                  "--ws-bg": ws.color,
                  "--ws-ink": workspaceColorInk(ws.color),
                }}
              >
                <div className="workspace-overview-card-top">
                  <span className="workspace-overview-name">{ws.name}</span>
                  <div
                    className="workspace-progress"
                    role="img"
                    aria-label={
                      stats.total === 0
                        ? "No tasks yet"
                        : `${stats.done} of ${stats.total} complete`
                    }
                  >
                    <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
                      <circle className="workspace-progress-track" cx="20" cy="20" r={radius} />
                      <circle
                        className="workspace-progress-value"
                        cx="20"
                        cy="20"
                        r={radius}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                      />
                    </svg>
                    <span className="workspace-progress-label">
                      {stats.total === 0 ? "—" : `${pct}%`}
                    </span>
                  </div>
                </div>
                <span className="workspace-overview-count">
                  {stats.total === 0
                    ? "No tasks yet"
                    : stats.open === 0
                      ? "All clear"
                      : `${stats.open} open`}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <CreateWorkspaceModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
    </section>
  );
}
