import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GitBranch, Plus } from "lucide-react";
import CreateFlowModal from "../components/CreateFlowModal";
import { useTaskStore } from "../store/useTaskStore";
import { flowColorInk, flowProgress } from "../lib/flowService";
import { formatFriendly } from "../lib/date";

function flowStartedLabel(createdAt) {
  if (!createdAt) return null;
  try {
    return formatFriendly(createdAt);
  } catch {
    return null;
  }
}

export default function FlowsPage() {
  const navigate = useNavigate();
  const followFlows = useTaskStore((s) => s.followFlows) || [];
  const addFollowFlow = useTaskStore((s) => s.addFollowFlow);
  const [createOpen, setCreateOpen] = useState(false);

  function handleCreate({ name, color }) {
    const created = addFollowFlow({ name, color });
    setCreateOpen(false);
    if (created?.id) navigate(`/app/flows/${created.id}`);
  }

  return (
    <div className="page narrow-page page-flows">
      <section className="simple-hero simple-hero-compact">
        <p className="eyebrow">Follow Flow Tasks</p>
        <h1>Flows</h1>
        <p>No calendar — just a sequence. Complete a step to unlock the next.</p>
      </section>

      {followFlows.length === 0 ? (
        <div className="flow-empty-stage">
          <GitBranch size={28} />
          <h2>Create flow</h2>
          <p>Name your path, pick a light theme color, then add steps one by one.</p>
          <button type="button" className="button button-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> Create flow
          </button>
        </div>
      ) : (
        <>
          <div className="flow-list-head">
            <h2>Your flows</h2>
            <button type="button" className="button button-secondary" onClick={() => setCreateOpen(true)}>
              <Plus size={15} /> Create flow
            </button>
          </div>
          <div className="flow-list">
            {followFlows.map((flow) => {
              const prog = flowProgress(flow);
              const started = flowStartedLabel(flow.createdAt);
              return (
                <Link
                  key={flow.id}
                  to={`/app/flows/${flow.id}`}
                  className="flow-list-card"
                  style={{
                    "--flow-bg": flow.color,
                    "--flow-ink": flowColorInk(flow.color),
                  }}
                >
                  <div>
                    <strong>{flow.name}</strong>
                    <span>
                      {prog.total === 0
                        ? "Add your first step"
                        : prog.complete
                          ? "All steps complete"
                          : `Step ${Math.min(prog.activeIndex + 1, prog.total)} of ${prog.total}`}
                      {started ? ` · Started ${started}` : ""}
                    </span>
                  </div>
                  <em>{prog.pct}%</em>
                </Link>
              );
            })}
          </div>
        </>
      )}

      <CreateFlowModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
