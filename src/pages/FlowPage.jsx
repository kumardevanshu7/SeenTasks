import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowDown, ArrowLeft, ArrowUp, Check, ChevronDown, Lock, Pencil, Trash2, X } from "lucide-react";
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
  const renameFollowFlow = useTaskStore((s) => s.renameFollowFlow);
  const deleteFollowFlow = useTaskStore((s) => s.deleteFollowFlow);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [gate, setGate] = useState(null);
  const [switchOpen, setSwitchOpen] = useState(false);
  const switchRef = useRef(null);

  const flow = useMemo(
    () => (followFlows || []).find((f) => f.id === flowId),
    [followFlows, flowId]
  );

  const flowList = useMemo(() => followFlows || [], [followFlows]);

  useEffect(() => {
    if (!switchOpen) return undefined;
    function onDoc(e) {
      if (switchRef.current && !switchRef.current.contains(e.target)) {
        setSwitchOpen(false);
      }
    }
    function onKey(e) {
      if (e.key === "Escape") setSwitchOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [switchOpen]);

  useEffect(() => {
    setTitleDraft(flow?.name || "");
  }, [flow?.id, flow?.name]);

  useEffect(() => {
    if (editing) setTitleDraft(flow?.name || "");
  }, [editing, flow?.name]);

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

  function saveTitle() {
    const clean = titleDraft.trim();
    if (!clean) {
      setTitleDraft(flow.name);
      return;
    }
    if (clean !== flow.name) renameFollowFlow(flow.id, clean);
  }

  function requestEdit() {
    if (editing) {
      saveTitle();
      setEditing(false);
      return;
    }
    setGate({ type: "edit" });
  }

  function goFlow(id) {
    setSwitchOpen(false);
    if (!id || id === flowId) return;
    setEditing(false);
    navigate(`/app/flows/${id}`);
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
      ? "Answer your One Password question to rename, reorder, or remove steps."
      : gate?.type === "delete-step"
        ? "Answer your One Password question to delete this step."
        : "This removes the whole step path. Answer your One Password question to continue.";

  return (
    <div
      className="page narrow-page page-flow"
      style={{ "--flow-bg": flow.color, "--flow-ink": ink }}
    >
      <div className="workspace-topbar">
        <Link to="/app/flows" className="workspace-back">
          <ArrowLeft size={16} /> Flows
        </Link>

        {flowList.length > 1 && (
          <div className="workspace-switcher flow-switcher" ref={switchRef}>
            <button
              type="button"
              className="workspace-switcher-btn"
              aria-haspopup="listbox"
              aria-expanded={switchOpen}
              onClick={() => setSwitchOpen((v) => !v)}
            >
              Switch flow
              <ChevronDown size={15} aria-hidden="true" />
            </button>
            {switchOpen && (
              <ul className="workspace-switcher-menu" role="listbox" aria-label="Flows">
                {flowList.map((item) => {
                  const active = item.id === flowId;
                  return (
                    <li key={item.id} role="option" aria-selected={active}>
                      <button
                        type="button"
                        className={`workspace-switcher-item${active ? " is-active" : ""}`}
                        onClick={() => goFlow(item.id)}
                      >
                        <span
                          className="workspace-switcher-dot"
                          style={{ background: item.color }}
                          aria-hidden="true"
                        />
                        <span className="workspace-switcher-name">{item.name}</span>
                        {active && <Check size={14} aria-hidden="true" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      <header className="flow-page-head">
        <div>
          <p className="eyebrow">Follow Flow</p>
          {editing ? (
            <input
              className="flow-title-input"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveTitle();
                  e.currentTarget.blur();
                } else if (e.key === "Escape") {
                  setTitleDraft(flow.name);
                  e.currentTarget.blur();
                }
              }}
              maxLength={48}
              aria-label="Flow title"
              autoFocus
            />
          ) : (
            <h1>{flow.name}</h1>
          )}
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
