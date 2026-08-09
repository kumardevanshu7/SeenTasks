import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import CreateWorkspaceModal from "./CreateWorkspaceModal";
import { useTaskStore } from "../store/useTaskStore";
import { DEFAULT_WORKSPACE_ID, workspaceColorInk } from "../lib/quickTaskService";

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

  const remainingBySpace = useMemo(() => {
    const map = {};
    (quickTasks || []).forEach((t) => {
      if (t.done) return;
      const id = t.workspaceId || DEFAULT_WORKSPACE_ID;
      map[id] = (map[id] || 0) + 1;
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
            const left = remainingBySpace[ws.id] || 0;
            return (
              <Link
                key={ws.id}
                to={`/app/workspace/${ws.id}`}
                className="workspace-overview-card"
                style={{
                  "--ws-bg": ws.color,
                  "--ws-ink": workspaceColorInk(ws.color),
                }}
              >
                <span className="workspace-overview-name">{ws.name}</span>
                <span className="workspace-overview-count">
                  {left === 0 ? "All clear" : `${left} open`}
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
