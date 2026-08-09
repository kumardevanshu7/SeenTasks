import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowDown, ArrowLeft, ArrowUp, Check, Lock, Pencil, Trash2, X } from "lucide-react";
import OnePasswordGate from "../components/OnePasswordGate";
import { useTaskStore } from "../store/useTaskStore";
import { flowColorInk, flowProgress, isFlowStepUnlocked } from "../lib/flowService";

export default function FlowPage() {
  const { flowId } = useParams();
  const navigate = useNavigate();
  const followFlows = useTaskStore((s) => s.followFlows);
  const addFlowStep = useTaskStore((s) => s.addFlowStep);
  const toggleFlowStep = useTaskStore((s) => s.toggleFlowStep);
  const deleteFlowStep = useTaskStore((s) => s.deleteFlowStep);
  const reorderFlowSteps = useTaskStore((s) => s.reorderFlowSteps);
  const deleteFollowFlow = useTaskStore((s) => s.deleteFollowFlow);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [gate, setGate] = useState(null); // { type: 'edit' | 'delete-flow' | 'delete-step', stepId?, title? }

  const flow = useMemo(
    () => (followFlows || []).find((f) => f.id === flowId),
    [followFlows, flowId]
  );

  if (followFlows?.length && !flow) {
    return <Navigate to="/app/flows" replace />;
  }

  if (!flow) {
    return (
      <div className="page narrow-page page-flow">
        <p className="flow-loading">Loading flow…</p>
      </div>
    );
  }

  const ink = flowColorInk(flow.color);
  const prog = flowProgress(flow);
  const steps = flow.steps || [];

  function submitStep() {
    const added = addFlowStep(flow.id, draft);
    if (added) setDraft("");
  }

  function requestEdit() {
    if (editing) {
      setEditing(false);
      return;
    }
    setGate({ type: "edit" });
  }

  function runGateConfirm() {
    if (!gate) return;
    if (gate.type === "edit") {
      setEditing(true);
    } else if (gate.type === "delete-flow") {
      deleteFollowFlow(flow.id);
      setGate(null);
      navigate("/app/flows");
      return;
    } else if (gate.type === "delete-step" && gate.stepId) {
      deleteFlowStep(flow.id, gate.stepId);
    }
    setGate(null);
  }

  const gateTitle =
    gate?.type === "edit"
      ? "Edit this flow"
      : gate?.type === "delete-step"
        ? `Delete step “${gate.title || ""}”`
        : `Delete flow “${flow.name}”`;

  const gateDescription =
    gate?.type === "edit"
      ? "Answer your One Password question to reorder or remove steps."
      : gate?.type === "delete-step"
        ? "Answer your One Password question to delete this step."
        : "This removes the whole step path. Answer your One Password question to continue.";

  return (
    <div
      className="page narrow-page page-flow"
      style={{ "--flow-bg": flow.color, "--flow-ink": ink }}
    >
      <Link to="/app/flows" className="workspace-back">
        <ArrowLeft size={16} /> Flows
      </Link>

      <header className="flow-page-head">
        <div>
          <p className="eyebrow">Follow Flow</p>
          <h1>{flow.name}</h1>
          <p>
            {steps.length === 0
              ? "Add steps below. No dates — just the path."
              : prog.complete
                ? "All steps complete."
                : `${prog.done} of ${prog.total} complete · next unlocks after the current step.`}
          </p>
        </div>
        <div className="flow-page-actions">
          <button
            type="button"
            className={`button button-secondary${editing ? " is-active" : ""}`}
            onClick={requestEdit}
          >
            {editing ? <X size={14} /> : <Pencil size={14} />}
            {editing ? "Done" : "Edit"}
          </button>
          <button
            type="button"
            className="flow-delete-link"
            onClick={() => setGate({ type: "delete-flow" })}
          >
            Delete flow
          </button>
        </div>
      </header>

      <ol className="flow-stepper" aria-label="Flow steps">
        {steps.map((step, index) => {
          const unlocked = isFlowStepUnlocked(steps, index);
          const isActive = unlocked && !step.done;
          const locked = !unlocked;
          return (
            <li
              key={step.id}
              className={`flow-step${step.done ? " is-done" : ""}${isActive ? " is-active" : ""}${locked ? " is-locked" : ""}`}
            >
              <div className="flow-step-rail" aria-hidden="true">
                <button
                  type="button"
                  className="flow-step-node"
                  disabled={locked || editing}
                  onClick={() => !editing && unlocked && toggleFlowStep(flow.id, step.id)}
                  aria-label={
                    locked
                      ? "Locked until previous step is done"
                      : step.done
                        ? "Mark as not done"
                        : "Mark as done"
                  }
                >
                  {step.done ? <Check size={14} /> : locked ? <Lock size={12} /> : null}
                </button>
              </div>

              <div className="flow-step-body">
                <div className="flow-step-main">
                  <span className="flow-step-index">Step {index + 1}</span>
                  <strong className="flow-step-title">{step.title}</strong>
                  <span className="flow-step-status">
                    {step.done ? "Done" : locked ? "Locked" : "Do this next"}
                  </span>
                </div>

                {editing && (
                  <div className="flow-step-edit">
                    <button
                      type="button"
                      className="icon-button"
                      disabled={index === 0}
                      onClick={() => reorderFlowSteps(flow.id, index, index - 1)}
                      aria-label="Move up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      disabled={index === steps.length - 1}
                      onClick={() => reorderFlowSteps(flow.id, index, index + 1)}
                      aria-label="Move down"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button-danger"
                      onClick={() =>
                        setGate({ type: "delete-step", stepId: step.id, title: step.title })
                      }
                      aria-label="Delete step"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {steps.length === 0 && !editing && (
        <p className="flow-steps-empty">No steps yet — add the first one below.</p>
      )}

      <div className="flow-add-row">
        <input
          className="text-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitStep();
            }
          }}
          placeholder="Add a step…"
          maxLength={120}
          aria-label="Add a step"
        />
        <button
          type="button"
          className="button button-primary"
          disabled={!draft.trim()}
          onClick={submitStep}
        >
          Add
        </button>
      </div>

      <OnePasswordGate
        open={Boolean(gate)}
        title={gateTitle}
        description={gateDescription}
        onClose={() => setGate(null)}
        onConfirm={runGateConfirm}
      />
    </div>
  );
}
