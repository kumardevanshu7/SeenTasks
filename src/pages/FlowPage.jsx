import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowDown, ArrowLeft, ArrowUp, Check, ChevronDown, Lock, Pencil, Plus, Trash2, Trophy, X } from "lucide-react";
import OnePasswordGate from "../components/OnePasswordGate";
import { useTaskStore } from "../store/useTaskStore";
import { FLOW_COLORS, flowCategories, flowColorInk, flowColorValue, flowProgress, flowProgressInCategory, isEverydayActive, isFlowStepActiveOnDay, isFlowStepUnlocked, nextFlowCategoryColor, stepCategoryId } from "../lib/flowService";
import { labelColorInk } from "../lib/quickTaskService";
import { formatFriendly, todayKey, toKey } from "../lib/date";
import { playTickSound, triggerConfetti } from "../lib/audioConfetti";

function CategoryColorRow({ value, onChange, label }) {
  return (
    <div className="flow-cat-color-panel">
      <span className="workspace-color-label">{label}</span>
      <div className="flow-cat-color-row" role="radiogroup" aria-label={label}>
        {FLOW_COLORS.map((c) => {
          const selected = value === c.id || value === c.value;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={c.id}
              className={`workspace-color-swatch${selected ? " is-selected" : ""}`}
              style={{ background: c.value }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange(c.id);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function EverydayMiniCalendar({ flow }) {
  const today = todayKey();
  const live = flowProgress(flow, today);
  const byKey = useMemo(() => {
    const map = {};
    (flow.reports || []).forEach((r) => {
      if (r?.dateKey) map[r.dateKey] = r;
    });
    return map;
  }, [flow.reports]);

  const cells = useMemo(() => {
    const list = [];
    const created = flow.createdAt ? toKey(flow.createdAt) : null;
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = toKey(d);
      const beforeStart = created && key < created;
      const afterEnd = flow.endDate && key > flow.endDate;
      let pct = null;
      let grade = null;
      if (!beforeStart && !afterEnd) {
        if (key === today) {
          const hasActive = (flow.steps || []).some((s) => isFlowStepActiveOnDay(s, today));
          pct = hasActive || live.total > 0 ? live.pct : null;
        } else if (byKey[key]) {
          pct = byKey[key].pct;
          grade = byKey[key].grade;
        }
      }
      list.push({
        key,
        day: d.getDate(),
        wd: d.toLocaleDateString(undefined, { weekday: "narrow" }),
        pct,
        grade,
        isToday: key === today,
        empty: pct === null,
      });
    }
    return list;
  }, [byKey, flow.createdAt, flow.endDate, flow.steps, live.pct, live.total, today]);

  return (
    <section className="flow-mini-cal" aria-label="Daily completion calendar">
      <div className="flow-mini-cal-head">
        <h2>Daily pulse</h2>
        <p>Last 14 days — % of that day’s active steps done</p>
      </div>
      <div className="flow-mini-cal-grid" role="list">
        {cells.map((cell) => {
          const tone =
            cell.empty ? "empty" : cell.pct >= 90 ? "high" : cell.pct >= 60 ? "mid" : "low";
          return (
            <div
              key={cell.key}
              role="listitem"
              className={`flow-mini-cal-cell is-${tone}${cell.isToday ? " is-today" : ""}`}
              title={
                cell.empty
                  ? formatFriendly(cell.key)
                  : `${formatFriendly(cell.key)} · ${cell.pct}%${cell.grade ? ` · ${cell.grade}` : ""}`
              }
            >
              <span className="flow-mini-cal-wd">{cell.wd}</span>
              <strong className="flow-mini-cal-day">{cell.day}</strong>
              <em className="flow-mini-cal-pct">{cell.empty ? "—" : `${cell.pct}%`}</em>
            </div>
          );
        })}
      </div>
    </section>
  );
}

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
  const addFlowCategory = useTaskStore((s) => s.addFlowCategory);
  const renameFlowCategory = useTaskStore((s) => s.renameFlowCategory);
  const setFlowCategoryColor = useTaskStore((s) => s.setFlowCategoryColor);
  const deleteFlowCategory = useTaskStore((s) => s.deleteFlowCategory);
  const deleteFollowFlow = useTaskStore((s) => s.deleteFollowFlow);
  const rollEverydayFlows = useTaskStore((s) => s.rollEverydayFlows);
  const soundEnabled = useTaskStore((s) => s.soundEnabled);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [startDraft, setStartDraft] = useState("");
  const [endStepDraft, setEndStepDraft] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [endDraft, setEndDraft] = useState("");
  const [gate, setGate] = useState(null);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [addingCat, setAddingCat] = useState(false);
  const [catDraft, setCatDraft] = useState("");
  const [catColorId, setCatColorId] = useState(FLOW_COLORS[1].id);
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

  const day = todayKey();
  const prog = flowProgress(flow, day);
  const steps = flow.steps || [];
  const isEveryday = flow.repeat === "daily";
  const everydayActive = isEveryday && isEverydayActive(flow, day);
  const anyOrder = isEveryday && Boolean(flow.anyOrder);
  const categories = isEveryday ? flowCategories(flow) : [];
  const activeCat = categories.some((c) => c.id === activeCategoryId)
    ? activeCategoryId
    : categories[0]?.id || null;
  const activeCatMeta = categories.find((c) => c.id === activeCat) || null;
  const themeBg = isEveryday && activeCatMeta
    ? flowColorValue(activeCatMeta.color)
    : flow.color;
  const ink = flowColorInk(isEveryday && activeCatMeta ? activeCatMeta.color : flow.color);
  const visibleSteps = isEveryday && activeCat
    ? steps.filter((s) => stepCategoryId(s, flow) === activeCat)
    : steps;
  const flowLabels = (flow.labelIds || [])
    .map((id) => quickLabels.find((l) => l.id === id))
    .filter(Boolean);

  function submitStep() {
    const added = addFlowStep(flow.id, draft, {
      startDate: isEveryday && startDraft ? startDraft : null,
      endDate: isEveryday && endStepDraft ? endStepDraft : null,
      categoryId: isEveryday ? activeCat : null,
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
    } else if (gate.type === "delete-category" && gate.categoryId) {
      deleteFlowCategory(flow.id, gate.categoryId);
      if (activeCategoryId === gate.categoryId) setActiveCategoryId(null);
    }
    setGate(null);
  }

  const gateTitle =
    gate?.type === "edit"
      ? "Edit this flow"
      : gate?.type === "delete-step"
        ? `Delete step “${gate.title || ""}”`
        : gate?.type === "delete-category"
          ? `Delete category “${gate.title || ""}”`
          : `Delete flow “${flow.name}”`;

  const gateDescription =
    gate?.type === "edit"
      ? isEveryday
        ? "Answer your One Password question to rename, set end date, labels, categories, or edit steps."
        : "Answer your One Password question to rename, reorder, or remove steps."
      : gate?.type === "delete-step"
        ? "Answer your One Password question to delete this step."
        : gate?.type === "delete-category"
          ? "Steps in this tab move to another category. Answer your One Password question to continue."
          : "This removes the whole step path. Answer your One Password question to continue.";

  return (
    <div
      className="page narrow-page page-flow"
      style={{ "--flow-bg": themeBg, "--flow-ink": ink }}
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
                    : `${prog.done} of ${prog.total} today · resets at midnight${anyOrder ? " · tick any step" : ""}.`
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
                  <label className="flow-everyday-toggle">
                    <input
                      type="checkbox"
                      checked={anyOrder}
                      onChange={(e) => updateFollowFlow(flow.id, { anyOrder: e.target.checked })}
                    />
                    <span>
                      <strong>Tick any step</strong>
                      <small>Complete in any order — the list reorders as you tick.</small>
                    </span>
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

      {isEveryday && (
        <div className="flow-cat-block">
        <div className="flow-cat-tabs" role="tablist" aria-label="Flow categories">
          {categories.map((cat) => {
            const selected = cat.id === activeCat;
            const catDone = steps.filter(
              (s) => stepCategoryId(s, flow) === cat.id && isFlowStepActiveOnDay(s, day) && s.done
            ).length;
            const catTotal = steps.filter(
              (s) => stepCategoryId(s, flow) === cat.id && isFlowStepActiveOnDay(s, day)
            ).length;
            const catBg = flowColorValue(cat.color);
            const catInk = flowColorInk(cat.color);
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={selected}
                className={`flow-cat-tab${selected ? " is-active" : ""}`}
                style={{
                  "--cat-bg": catBg,
                  "--cat-ink": catInk,
                  background: selected ? "#fff" : catBg,
                  color: catInk,
                }}
                onClick={() => setActiveCategoryId(cat.id)}
              >
                {editing && selected ? (
                  <input
                    className="flow-cat-rename"
                    defaultValue={cat.name}
                    maxLength={32}
                    aria-label="Category name"
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      const next = e.target.value.trim();
                      if (next && next !== cat.name) renameFlowCategory(flow.id, cat.id, next);
                    }}
                  />
                ) : (
                  <span>{cat.name}</span>
                )}
                {catTotal > 0 && catDone === catTotal && (
                  <span className="flow-cat-winner" title="Winner — this tab is complete today">
                    <Trophy size={13} aria-hidden="true" />
                  </span>
                )}
                {catTotal > 0 && (
                  <em>
                    {catDone}/{catTotal}
                  </em>
                )}
              </button>
            );
          })}
          {editing && addingCat ? (
            <form
              className="flow-cat-add-form"
              onSubmit={(e) => {
                e.preventDefault();
                const created = addFlowCategory(flow.id, catDraft, catColorId);
                if (created?.id) {
                  setActiveCategoryId(created.id);
                  setCatDraft("");
                  setAddingCat(false);
                }
              }}
            >
              <input
                className="flow-cat-rename"
                value={catDraft}
                onChange={(e) => setCatDraft(e.target.value)}
                placeholder="Category name"
                maxLength={32}
                autoFocus
                aria-label="New category name"
              />
              <button type="submit" className="icon-button" disabled={!catDraft.trim()} aria-label="Save category">
                <Check size={14} />
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={() => {
                  setAddingCat(false);
                  setCatDraft("");
                }}
                aria-label="Cancel"
              >
                <X size={14} />
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="flow-cat-add"
              onClick={() => {
                if (!editing) {
                  setGate({ type: "edit" });
                  return;
                }
                setCatColorId(nextFlowCategoryColor(categories));
                setAddingCat(true);
              }}
              aria-label="Add category"
            >
              <Plus size={16} />
            </button>
          )}
          {editing && categories.length > 1 && activeCat && (
            <button
              type="button"
              className="flow-cat-delete"
              onClick={() => {
                const cat = categories.find((c) => c.id === activeCat);
                setGate({
                  type: "delete-category",
                  categoryId: activeCat,
                  title: cat?.name || "",
                });
              }}
            >
              Delete tab
            </button>
          )}
        </div>
        {editing && addingCat && (
          <CategoryColorRow
            label="Tab color"
            value={catColorId}
            onChange={setCatColorId}
          />
        )}
        {editing && !addingCat && activeCat && (
          <CategoryColorRow
            label="Tab color"
            value={categories.find((c) => c.id === activeCat)?.color}
            onChange={(id) => setFlowCategoryColor(flow.id, activeCat, id)}
          />
        )}
        </div>
      )}

      {isEveryday && activeCatMeta && flowProgressInCategory(flow, activeCat, day).complete && (
        <p className="flow-winner-banner">
          <Trophy size={16} aria-hidden="true" />
          Winner — {activeCatMeta.name} is complete today
        </p>
      )}

      <ol className="flow-stepper" aria-label="Flow steps">
        {visibleSteps.map((step, visIndex) => {
          const index = steps.findIndex((s) => s.id === step.id);
          const onToday = !isEveryday || isFlowStepActiveOnDay(step, day);
          const unlocked = isFlowStepUnlocked(steps, index, day, isEveryday, {
            anyOrder,
            categoryId: activeCat || step.categoryId,
          });
          const isActive = onToday && unlocked && !step.done;
          const locked = onToday && !unlocked;
          const scheduled = isEveryday && !onToday;
          const windowLabel = stepWindowLabel(step);
          let todayOrd = 0;
          if (onToday && isEveryday) {
            for (let i = 0; i <= visIndex; i += 1) {
              if (isFlowStepActiveOnDay(visibleSteps[i], day)) todayOrd += 1;
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
                  onClick={() => {
                    if (!editing && onToday && unlocked && (!isEveryday || everydayActive)) {
                      const willBeDone = !step.done;
                      toggleFlowStep(flow.id, step.id);
                      if (willBeDone) {
                        if (soundEnabled) playTickSound();
                        triggerConfetti();
                      }
                    }
                  }}
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
                      : `Step ${visIndex + 1}`}
                  </span>
                  <strong className="flow-step-title">{step.title}</strong>
                  <span className="flow-step-status">
                    {scheduled
                      ? windowLabel || "Not today"
                      : step.done
                        ? "Done"
                        : locked
                          ? "Locked"
                          : anyOrder
                            ? "Open"
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
                      disabled={visIndex === 0}
                      onClick={() =>
                        reorderFlowSteps(flow.id, visIndex, visIndex - 1, isEveryday ? activeCat : null)
                      }
                      aria-label="Move up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      disabled={visIndex === visibleSteps.length - 1}
                      onClick={() =>
                        reorderFlowSteps(flow.id, visIndex, visIndex + 1, isEveryday ? activeCat : null)
                      }
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

      {visibleSteps.length === 0 && !editing && (
        <p className="flow-steps-empty">
          {isEveryday ? "No steps in this tab — add one below." : "No steps yet — add the first one below."}
        </p>
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

      {isEveryday && <EverydayMiniCalendar flow={flow} />}

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
