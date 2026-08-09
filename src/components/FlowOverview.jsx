import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, GitBranch, Plus } from "lucide-react";
import CreateFlowModal from "./CreateFlowModal";
import { useTaskStore } from "../store/useTaskStore";
import { flowColorInk, flowProgress } from "../lib/flowService";

export default function FlowOverview() {
  const navigate = useNavigate();
  const followFlows = useTaskStore((s) => s.followFlows);
  const addFollowFlow = useTaskStore((s) => s.addFollowFlow);
  const [createOpen, setCreateOpen] = useState(false);

  const flows = useMemo(() => followFlows || [], [followFlows]);

  function handleCreate({ name, color }) {
    const created = addFollowFlow({ name, color });
    setCreateOpen(false);
    if (created?.id) navigate(`/app/flows/${created.id}`);
  }

  return (
    <section className="flow-overview" aria-label="Follow Flow Tasks">
      <div className="flow-overview-head">
        <div>
          <h2>Follow Flow Tasks</h2>
          <p>Step-by-step paths with no dates — finish one to unlock the next.</p>
        </div>
        <Link to="/app/flows" className="button button-secondary flow-overview-open">
          Open flows <ArrowRight size={14} />
        </Link>
      </div>

      {flows.length === 0 ? (
        <button type="button" className="flow-overview-empty" onClick={() => setCreateOpen(true)}>
          <GitBranch size={18} />
          <span>
            <strong>Create your first flow</strong>
            <em>Name it, pick a theme, then add steps one by one.</em>
          </span>
          <Plus size={16} />
        </button>
      ) : (
        <div className="flow-overview-grid">
          {flows.slice(0, 4).map((flow) => {
            const prog = flowProgress(flow);
            return (
              <Link
                key={flow.id}
                to={`/app/flows/${flow.id}`}
                className="flow-overview-card"
                style={{
                  "--flow-bg": flow.color,
                  "--flow-ink": flowColorInk(flow.color),
                }}
              >
                <span className="flow-overview-name">{flow.name}</span>
                <span className="flow-overview-meta">
                  {prog.total === 0
                    ? "No steps yet"
                    : prog.complete
                      ? "Complete"
                      : `${prog.done}/${prog.total} done`}
                </span>
              </Link>
            );
          })}
          <button type="button" className="flow-overview-new" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> New flow
          </button>
        </div>
      )}

      <CreateFlowModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
    </section>
  );
}
