import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowDown, ArrowLeft, ArrowUp, Check, ChevronDown, Lock, Pencil, Trash2, X } from "lucide-react";
import OnePasswordGate from "../components/OnePasswordGate";
import { useTaskStore } from "../store/useTaskStore";
import { flowColorInk, flowProgress, isEverydayActive, isFlowStepActiveOnDay, isFlowStepUnlocked } from "../lib/flowService";
import { labelColorInk } from "../lib/quickTaskService";
import { formatFriendly, todayKey } from "../lib/date";

export default function FlowPage() {
  const { flowId } = useParams();
  const navigate = useNavigate();
  const followFlows = useTaskStore((s) => s.followFlows);
  const quickLabels = useTaskStore((s) => s.quickLabels) || [];
  const addFlowStep = useTaskStore((s) => s.addFlowStep);
  const updateFlowStep = useTaskStore((s) => s.updateFlowStep);
  const toggleFlowStep = useTaskStore((s) => s.toggleFlowStep);
  const deleteFlowStep = useTaskStore((s) => s.deleteFlowStep);
  const reorderFlowSteps = useTaskStore((s) => s.reorderFlowSteps);
  const renameFollowFlow = useTaskStore((s) => s.renameFollowFlow);
  const updateFollowFlow = useTaskStore((s) => s.updateFollowFlow);
  const deleteFollowFlow = useTaskStore((s) => s.deleteFollowFlow);
  const rollEverydayFlows = useTaskStore((s) => s.rollEverydayFlows);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [startDraft, setStartDraft] = useState("");
  const [endStepDraft, setEndStepDraft] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [endDraft, setEndDraft] = useState("");
  const [gate, setGate] = useState(null);
  const [switchOpen, setSwitchOpen] = useState(false);
  const switchRef = useRef(null);

  const flow = useMemo(
    () => (followFlows || []).find((f) => f.id === flowId),
    [followFlows, flowId]
  );

  const flowList = useMemo(() => followFlows || [], [followFlows]);

  useEffect(() => {
    rollEverydayFlows();
    const id = window.setInterval(() => rollEverydayFlows(), 30_000);
    return () => window.clearInterval(id);
  }, [rollEverydayFlows]);

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
    setEndDraft(flow?.endDate || "");
  }, [flow?.id, flow?.name, flow?.endDate]);

  useEffect(() => {
    if (editing) {
      setTitleDraft(flow?.name || "");
      setEndDraft(flow?.endDate || "");
    }
  }, [editing, flow?.name, flow?.endDate]);

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
  const day = todayKey();
  const prog = flowProgress(flow, day);
  const steps = flow.steps || [];
  const isEveryday = flow.repeat === "daily";
  const everydayActive = isEveryday && isEverydayActive(flow, day);
  const flowLabels = (flow.labelIds || [])
    .map((id) => quickLabels.find((l) => l.id === id))
    .filter(Boolean);

  function submitStep() {
    const added = addFlowStep(flow.id, draft, {
      startDate: isEveryday && startDraft ? startDraft : null,
      endDate: isEveryday && endStepDraft ? endStepDraft : null,
    });
    if (added) {
      setDraft("");
      setStartDraft("");
      setEndStepDraft("");
    }
  }

  function stepWindowLabel(step) {
    if (!isEveryday) return null;
    if (step.startDate && step.startDate > day) {
      return `Starts ${formatFriendly(step.startDate)}`;
    }
    if (step.endDate && step.endDate < day) {
      return `Ended ${formatFriendly(step.endDate)}`;
    }
    const bits = [];
    if (step.startDate && step.startDate === day) bits.push("Starts today");
    if (step.endDate) bits.push(`Until ${formatFriendly(step.endDate)}`);
    return bits.length ? bits.join(" · ") : null;
  }

  function saveTitle() {
    const clean = titleDraft.trim();
    if (!clean) {
      setTitleDraft(flow.name);
      return;
    }
    if (clean !== flow.name) renameFollowFlow(flow.id, clean);
  }

  function saveEndDate() {
    if (!isEveryday) return;
    const next = endDraft || null;
    if ((flow.endDate || null) !== next) {
      updateFollowFlow(flow.id, { endDate: next });
    }
  }

  function toggleFlowLabel(labelId) {
    const cur = Array.isArray(flow.labelIds) ? flow.labelIds : [];
    const next = cur.includes(labelId)
      ? cur.filter((x) => x !== labelId)
      : [...cur, labelId];
    updateFollowFlow(flow.id, { labelIds: next });
  }

  function requestEdit() {
    if (editing) {
      saveTitle();
      saveEndDate();
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
      ? isEveryday
        ? "Answer your One Password question to rename, set end date, labels, or edit steps."
        : "Answer your One Password question to rename, reorder, or remove steps."
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
          <p className="eyebrow">{isEveryday ? "Everyday" : "Follow Flow"}</p>
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
            <h1>
              {flow.name}
              {isEveryday && (
                <em className="flow-everyday-badge">{everydayActive ? "Everyday" : "Ended"}</em>
              )}
            </h1>
          )}
          <p>
            {isEveryday
              ? steps.length === 0
                ? "Add today’s steps. Optional start/end dates per step. Progress resets at 12:00 AM."
                : !everydayActive
                  ? `Everyday ended${flow.endDate ? ` · ${formatFriendly(flow.endDate)}` : ""}.`
                  : prog.complete
                    ? "All steps done for today — report card lands after midnight."
                    : `${prog.done} of ${prog.total} today · resets at midnight.`
              : steps.length === 0
                ? "Add steps below. No dates — just the path."
                : prog.complete
                  ? "All steps complete."
                  : `${prog.done} of ${prog.total} complete · next unlocks after the current step.`}
            {isEveryday && everydayActive && flow.endDate
              ? ` Ends ${formatFriendly(flow.endDate)}.`
              : ""}
          </p>

          {isEveryday && (
            <div className="flow-meta-block">
              {editing ? (
                <>
                  <label className="flow-end-date-field">
                    <span>End date</span>
                    <input
                      className="text-input"
                      type="date"
                      value={endDraft}
                      min={todayKey()}
                      onChange={(e) => setEndDraft(e.target.value)}
                      onBlur={saveEndDate}
                      aria-label="Everyday end date"
                    />
                    {endDraft && (
                      <button
                        type="button"
                        className="flow-end-date-clear"
                        onClick={() => {
                          setEndDraft("");
                          updateFollowFlow(flow.id, { endDate: null });
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </label>
                  <div className="flow-label-field">
                    <span className="workspace-color-label">Labels</span>
                    {quickLabels.length === 0 ? (
                      <p className="flow-label-empty">
                        No labels yet — create them on a workspace Quick Tasks page.
                      </p>
                    ) : (
                      <div className="flow-label-pills" role="group" aria-label="Flow labels">
                        {quickLabels.map((label) => {
                          const selected = (flow.labelIds || []).includes(label.id);
                          return (
                            <button
                              key={label.id}
                              type="button"
                              className={`quick-label-pill${selected ? " is-selected" : ""}`}
                              style={{
                                "--label-bg": label.color,
                                "--label-ink": labelColorInk(label.color),
                              }}
                              onClick={() => toggleFlowLabel(label.id)}
                              aria-pressed={selected}
                            >
                              {label.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                flowLabels.length > 0 && (
                  <div className="flow-card-labels">
                    {flowLabels.map((l) => (
                      <span
                        key={l.id}
                        className="quick-task-label-chip is-static"
                        style={{
                          "--label-bg": l.color,
                          "--label-ink": labelColorInk(l.color),
                        }}
                      >
                        {l.name}
                      </span>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
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
          const onToday = !isEveryday || isFlowStepActiveOnDay(step, day);
          const unlocked = isFlowStepUnlocked(steps, index, day, isEveryday);
          const isActive = onToday && unlocked && !step.done;
          const locked = onToday && !unlocked;
          const scheduled = isEveryday && !onToday;
          const windowLabel = stepWindowLabel(step);
          let todayOrd = 0;
          if (onToday && isEveryday) {
            for (let i = 0; i <= index; i += 1) {
              if (isFlowStepActiveOnDay(steps[i], day)) todayOrd += 1;
            }
          }
          return (
            <li
              key={step.id}
              className={`flow-step${step.done && onToday ? " is-done" : ""}${isActive ? " is-active" : ""}${locked ? " is-locked" : ""}${scheduled ? " is-scheduled" : ""}`}
            >
              <div className="flow-step-rail" aria-hidden="true">
                <button
                  type="button"
                  className="flow-step-node"
                  disabled={locked || editing || scheduled || (isEveryday && !everydayActive)}
                  onClick={() =>
                    !editing &&
                    onToday &&
                    unlocked &&
                    (!isEveryday || everydayActive) &&
                    toggleFlowStep(flow.id, step.id)
                  }
                  aria-label={
                    scheduled
                      ? windowLabel || "Not active today"
                      : locked
                        ? "Locked until previous step is done"
                        : step.done
                          ? "Mark as not done"
                          : "Mark as done"
                  }
                >
                  {onToday && step.done ? (
                    <Check size={14} />
                  ) : locked || scheduled ? (
                    <Lock size={12} />
                  ) : null}
                </button>
              </div>

              <div className="flow-step-body">
                <div className="flow-step-main">
                  <span className="flow-step-index">
                    {isEveryday && onToday
                      ? `Today ${todayOrd}`
                      : `Step ${index + 1}`}
                  </span>
                  <strong className="flow-step-title">{step.title}</strong>
                  <span className="flow-step-status">
                    {scheduled
                      ? windowLabel || "Not today"
                      : step.done
                        ? "Done"
                        : locked
                          ? "Locked"
                          : "Do this next"}
                  </span>
                  {onToday && windowLabel && !scheduled && (
                    <span className="flow-step-window">{windowLabel}</span>
                  )}
                </div>

                {editing && (
                  <div className="flow-step-edit">
                    {isEveryday && (
                      <div className="flow-step-dates">
                        <label>
                          Start
                          <input
                            type="date"
                            className="text-input"
                            value={step.startDate || ""}
                            onChange={(e) =>
                              updateFlowStep(flow.id, step.id, {
                                startDate: e.target.value || null,
                              })
                            }
                            aria-label={`Start date for ${step.title}`}
                          />
                        </label>
                        <label>
                          End
                          <input
                            type="date"
                            className="text-input"
                            value={step.endDate || ""}
                            min={step.startDate || undefined}
                            onChange={(e) =>
                              updateFlowStep(flow.id, step.id, {
                                endDate: e.target.value || null,
                              })
                            }
                            aria-label={`End date for ${step.title}`}
                          />
                        </label>
                      </div>
                    )}
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

      <div className="flow-add-block">
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
        {isEveryday && (
          <div className="flow-add-dates">
            <label>
              Start <span className="flow-field-optional">(optional)</span>
              <input
                type="date"
                className="text-input"
                value={startDraft}
                onChange={(e) => setStartDraft(e.target.value)}
                aria-label="Step start date"
              />
            </label>
            <label>
              End <span className="flow-field-optional">(optional)</span>
              <input
                type="date"
                className="text-input"
                value={endStepDraft}
                min={startDraft || undefined}
                onChange={(e) => setEndStepDraft(e.target.value)}
                aria-label="Step end date"
              />
            </label>
          </div>
        )}
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
