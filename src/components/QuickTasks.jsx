import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarDays, CalendarRange, ChevronDown, ChevronRight, CircleAlert, Clock, Filter, GitBranch, Moon, Plus, Sunrise, Tag, Timer, Trash2, X } from "lucide-react";
import { useTaskStore } from "../store/useTaskStore";
import OnePasswordGate from "./OnePasswordGate";
import CreateLabelModal from "./CreateLabelModal";
import FocusTimerModal from "./FocusTimerModal";
import MoodTrackerModal from "./MoodTrackerModal";
import { DEFAULT_WORKSPACE_ID, labelColorInk, workspaceColorInk } from "../lib/quickTaskService";
import { flowColorInk, isEverydayActive, isFlowStepActiveOnDay, isFlowStepUnlocked } from "../lib/flowService";
import { addDaysToKey, formatDateTime, formatDuration, formatDelayDays, formatFriendly, formatMonthDay, delayedCompletionMessage, isBeforeToday, taskDelayDays, todayKey, toKey } from "../lib/date";
import { playTickSound, triggerConfetti } from "../lib/audioConfetti";
import { isMoodWindowOpen } from "../lib/moodService";

function getUpcomingWeekend(baseKey) {
  const d = new Date(baseKey);
  const day = d.getDay(); // 0 is Sunday, 6 is Saturday
  const daysUntilSat = (6 - day + 7) % 7 || 7;
  return addDaysToKey(baseKey, daysUntilSat);
}

function getUpcomingMonday(baseKey) {
  const d = new Date(baseKey);
  const day = d.getDay();
  const daysUntilMon = (1 - day + 7) % 7 || 7;
  return addDaysToKey(baseKey, daysUntilMon);
}

const LABEL_DRAG_TYPE = "application/x-seentasks-label";

function taskMatchesFilter(task, filterId) {
  if (!filterId) return true;
  const labelIds = Array.isArray(task.labelIds)
    ? task.labelIds.filter(Boolean).map(String)
    : task.labelId
      ? [String(task.labelId)]
      : [];
  if (filterId === "__none__") {
    return labelIds.length === 0;
  }
  return labelIds.includes(String(filterId));
}

/** Build Quick Tasks mirror rows from active Everyday flow steps. */
function buildEverydayMirrors(followFlows, activeDate, dayNow, quickTasks = []) {
  const isPast = isBeforeToday(activeDate);
  const flows = (followFlows || []).filter((f) => {
    if (isPast) {
      return (f.reports || []).some((r) => r.dateKey === activeDate) || isEverydayActive(f, activeDate);
    }
    return isEverydayActive(f, activeDate) && (f.dayKey || dayNow) === activeDate;
  });

  const items = [];
  flows.forEach((flow) => {
    const report = (flow.reports || []).find((r) => r.dateKey === activeDate);
    const steps = flow.steps || [];
    steps.forEach((step, index) => {
      if (!isFlowStepActiveOnDay(step, activeDate)) return;
      let isDone = false;
      if (isPast) {
        if (report) {
          if (report.pct === 100 || report.grade === "A+" || (report.total > 0 && report.done >= report.total)) {
            isDone = true;
          } else if (step.completedAt && toKey(step.completedAt) === activeDate) {
            isDone = true;
          } else if (report.done > 0 && index < report.done) {
            isDone = true;
          } else {
            isDone = false;
          }
        } else {
          isDone = Boolean(step.completedAt && toKey(step.completedAt) === activeDate);
        }
      } else {
        isDone = Boolean(step.done);
      }

      // Check if quickTasks has a matching completed record for this flow step on this date
      const mirrorKey = `flow:${flow.id}:${step.id}`;
      const qtMatch = (quickTasks || []).find((q) => q.id === mirrorKey && q.dateKey === activeDate);
      if (qtMatch?.done) {
        isDone = true;
      }

      const unlocked = isFlowStepUnlocked(steps, index, activeDate, true, {
        anyOrder: Boolean(flow.anyOrder),
        categoryId: step.categoryId,
      });
      items.push({
        id: mirrorKey,
        title: step.title,
        done: isDone,
        dateKey: activeDate,
        labelIds: Array.isArray(flow.labelIds) ? flow.labelIds : [],
        createdAt: flow.createdAt || null,
        completedAt: isDone ? (step.completedAt || activeDate) : null,
        dueDate: step.endDate || null,
        flowLocked: !isPast && !unlocked && !isDone,
        flowRef: {
          id: flow.id,
          name: flow.name,
          color: flow.color,
        },
      });
    });
  });
  return items;
}

function sortDayItems(items) {
  const byCreated = (a, b) => (a.createdAt < b.createdAt ? 1 : -1);
  const byCompleted = (a, b) => (a.completedAt < b.completedAt ? 1 : -1);
  return [
    ...items.filter((t) => !t.done).sort(byCreated),
    ...items.filter((t) => t.done).sort(byCompleted),
  ];
}

/** Finished after midnight (no due) or after the due day. */
function isRecoveredQuickTask(item) {
  if (!item?.done || !item.completedAt) return false;
  return taskDelayDays(item) > 0;
}

function belongsToDayDone(item, activeDate) {
  if (!item.done) return false;
  if (item.dateKey === activeDate) return true;
  return Boolean(item.completedAt && toKey(item.completedAt) === activeDate);
}

function taskWorkspaceId(task) {
  return task.workspaceId || DEFAULT_WORKSPACE_ID;
}

/**
 * Not completed:
 * - no dueDate → after 12:00 AM on the day after dateKey
 * - with dueDate → only after the due day ends (never before due)
 */
function belongsInNotCompleted(task) {
  if (task?.done) return false;
  if (!task?.dateKey || !isBeforeToday(task.dateKey)) return false;
  if (task.dueDate && !isBeforeToday(task.dueDate)) return false;
  return true;
}

/** Past-day open task still waiting on a future/today due date — stays in Today. */
function isDueCarry(task) {
  if (task?.done || !task?.dateKey || !task?.dueDate) return false;
  return isBeforeToday(task.dateKey) && !isBeforeToday(task.dueDate);
}

function filterDayOpen(tasks, { activeDate, dayHasEnded, viewingToday }) {
  if (dayHasEnded) {
    return sortDayItems(
      tasks.filter((t) => t.dateKey === activeDate && !t.done)
    );
  }
  return sortDayItems(
    tasks.filter((t) => {
      if (t.done) return false;
      if (t.dateKey === activeDate) return true;
      if (viewingToday && isDueCarry(t)) return true;
      return false;
    })
  );
}

function filterDayDone(tasks, activeDate) {
  return sortDayItems(tasks.filter((t) => belongsToDayDone(t, activeDate)));
}

function filterNotCompleted(tasks, { viewingToday, dayHasEnded, activeDate }) {
  if (viewingToday) {
    return tasks
      .filter((t) => belongsInNotCompleted(t))
      .sort((a, b) => {
        if (a.dateKey === b.dateKey) return a.createdAt < b.createdAt ? 1 : -1;
        return a.dateKey < b.dateKey ? 1 : -1;
      });
  }
  if (dayHasEnded) {
    return sortDayItems(
      tasks.filter((t) => t.dateKey === activeDate && belongsInNotCompleted(t))
    );
  }
  return [];
}

function SnoozeMenu({ onSnooze, onClose, activeDate }) {
  const tomorrow = addDaysToKey(activeDate || todayKey(), 1);
  const weekend = getUpcomingWeekend(activeDate || todayKey());
  const nextWeek = getUpcomingMonday(activeDate || todayKey());

  return (
    <div className="quick-task-snooze-menu" onClick={(e) => e.stopPropagation()}>
      <div className="quick-task-snooze-head">
        <Clock size={12} />
        <span>Reschedule</span>
      </div>
      <button
        type="button"
        className="quick-task-snooze-opt"
        onClick={() => onSnooze(tomorrow)}
      >
        <div className="snooze-opt-title">
          <Sunrise size={13} className="snooze-opt-icon" />
          <span>Tomorrow</span>
        </div>
        <small>{formatFriendly(tomorrow)}</small>
      </button>
      <button
        type="button"
        className="quick-task-snooze-opt"
        onClick={() => onSnooze(weekend)}
      >
        <div className="snooze-opt-title">
          <CalendarDays size={13} className="snooze-opt-icon" />
          <span>This Weekend</span>
        </div>
        <small>{formatFriendly(weekend)}</small>
      </button>
      <button
        type="button"
        className="quick-task-snooze-opt"
        onClick={() => onSnooze(nextWeek)}
      >
        <div className="snooze-opt-title">
          <CalendarRange size={13} className="snooze-opt-icon" />
          <span>Next Week</span>
        </div>
        <small>{formatFriendly(nextWeek)}</small>
      </button>
    </div>
  );
}

function QuickTaskRow({
  item,
  labels = [],
  workspaceRef = null,
  flowRef = null,
  hideMirrorChip = false,
  missed = false,
  dropReady = false,
  isDropTarget = false,
  onToggle,
  onRequestDelete,
  onClearLabel,
  onDragOverRow,
  onDragLeaveRow,
  onDropLabel,
  onSnooze,
  onStartFocus,
}) {
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const isMirror = Boolean(workspaceRef || flowRef);
  const mirrorRef = flowRef || workspaceRef;
  const recovered = !isMirror && isRecoveredQuickTask(item);
  const delayDays = isMirror ? 0 : taskDelayDays(item);
  const delayLabel = formatDelayDays(delayDays);
  const delayNote =
    recovered && delayDays > 0 ? delayedCompletionMessage(delayDays) : "";
  const started = formatDateTime(item.createdAt);
  const ended = item.done ? formatDateTime(item.completedAt) : null;
  const duration = item.done ? formatDuration(item.createdAt, item.completedAt) : "";
  const stamp = formatMonthDay(item.dateKey);
  const dueOverdue = Boolean(item.dueDate && !item.done && isBeforeToday(item.dueDate));
  const dueToday = Boolean(item.dueDate && !item.done && item.dueDate === todayKey());
  const mirrorHref = flowRef
    ? `/app/flows/${flowRef.id}`
    : workspaceRef
      ? `/app/workspace/${workspaceRef.id}`
      : null;
  const mirrorInk = mirrorRef
    ? flowRef
    : workspaceRef
      ? workspaceColorInk(workspaceRef.color)
      : null;
  const mirrorChipLabel = flowRef ? flowRef.name : workspaceRef?.name;
  const gotoLabel = flowRef ? "Go to flow" : "Go to workspace";
  const openHint = flowRef
    ? item.flowLocked
      ? "Locked in flow sequence"
      : "Open in Everyday flow"
    : "Open in workspace";
  const missedHint = item.dueDate
    ? "Left open past the due date"
    : "Left open past midnight";

  return (
    <li
      className={`quick-task-row${item.done ? " quick-task-done" : ""}${missed ? " quick-task-missed" : ""}${recovered ? " quick-task-recovered" : ""}${isMirror ? " quick-task-mirror" : ""}${dropReady ? " quick-task-drop-ready" : ""}${isDropTarget ? " quick-task-drop-target" : ""}`}
      onDragOver={isMirror ? undefined : (e) => onDragOverRow?.(e, item.id)}
      onDragLeave={isMirror ? undefined : () => onDragLeaveRow?.(item.id)}
      onDrop={isMirror ? undefined : (e) => onDropLabel?.(e, item.id)}
    >
      <div className="quick-task-rail">
        {isMirror ? (
          <span
            className={`quick-task-check quick-task-check-locked${item.done ? " is-done" : ""}`}
            style={
              mirrorRef
                ? {
                    "--ws-color": mirrorRef.color,
                    "--ws-ink": mirrorInk,
                  }
                : undefined
            }
            aria-hidden="true"
            title={flowRef ? "Complete this in its Everyday flow" : "Complete this in its workspace"}
          >
            {item.done && (
              <svg className="quick-task-tick" viewBox="0 0 12 12" aria-hidden="true">
                <path
                  d="M2.4 6.2 L4.9 8.7 L9.6 3.4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
        ) : (
          <button
            type="button"
            className="quick-task-check"
            onClick={() => onToggle(item.id)}
            aria-label={item.done ? "Mark as not done" : "Mark as done"}
            aria-pressed={item.done}
          >
            {item.done && (
              <svg className="quick-task-tick" viewBox="0 0 12 12" aria-hidden="true">
                <path
                  d="M2.4 6.2 L4.9 8.7 L9.6 3.4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        )}
      </div>

      {(missed || recovered) && (
        <div className="quick-task-stamp">
          <span>{stamp.month}</span>
          <strong>{stamp.day}</strong>
        </div>
      )}

      <div className="quick-task-body">
        <div className="quick-task-title-row">
          {mirrorRef && !hideMirrorChip && (
            <span
              className="quick-task-workspace-chip"
              style={{
                "--ws-color": mirrorRef.color,
                "--ws-ink": mirrorInk,
              }}
            >
              {mirrorChipLabel}
            </span>
          )}
          {labels.length > 0 && !isMirror && (
            <>
              {labels.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className="quick-task-label-chip"
                  style={{
                    "--label-bg": l.color,
                    "--label-ink": labelColorInk(l.color),
                  }}
                  onClick={() => onClearLabel?.(item.id, l.id)}
                  title="Click to remove label"
                >
                  {l.name}
                  <X size={10} aria-hidden="true" />
                </button>
              ))}
            </>
          )}
          {labels.length > 0 && isMirror && (
            <>
              {labels.map((l) => (
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
            </>
          )}
          <span className="quick-task-title">{item.title}</span>
          {delayLabel && (missed || recovered) && (
            <span className="quick-task-delay-badge" title={delayNote || undefined}>
              Delayed · {delayLabel}
            </span>
          )}
          {item.dueDate && (
            <span
              className={`quick-task-due${dueOverdue ? " is-overdue" : ""}${dueToday ? " is-due-today" : ""}`}
            >
              <CalendarDays size={11} aria-hidden="true" />
              {flowRef
                ? dueToday
                  ? "Ends today · "
                  : dueOverdue
                    ? "Ended · "
                    : "Until "
                : dueOverdue
                  ? "Overdue · "
                  : dueToday
                    ? "Due today · "
                    : "Due "}
              {formatFriendly(item.dueDate)}
            </span>
          )}
        </div>
        <div className="quick-task-times">
          {started && <span>Started {started}</span>}
          {ended ? (
            <span>Ended {ended}</span>
          ) : missed ? (
            <span>{missedHint}</span>
          ) : isMirror ? (
            <span>{openHint}</span>
          ) : (
            <span>In progress</span>
          )}
          {duration && <span>{duration} total</span>}
        </div>
        {delayNote && <p className="quick-task-delay-note">{delayNote}</p>}
      </div>

      {isMirror ? (
        !hideMirrorChip ? (
          <Link
            to={mirrorHref}
            className="quick-task-goto"
            style={
              mirrorRef
                ? {
                    "--ws-color": mirrorRef.color,
                    "--ws-ink": mirrorInk,
                  }
                : undefined
            }
          >
            {gotoLabel}
            <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        ) : null
      ) : (
        <div className="quick-task-row-actions">
          {!item.done && (
            <>
              <button
                type="button"
                className="quick-task-action-btn"
                onClick={() => onStartFocus?.(item.id, item.title)}
                title="Start 25m Focus Timer"
                aria-label="Focus timer"
              >
                <Timer size={13} />
              </button>
              <div className="quick-task-snooze-wrap">
                <button
                  type="button"
                  className={`quick-task-action-btn${snoozeOpen ? " is-active" : ""}`}
                  onClick={() => setSnoozeOpen((cur) => !cur)}
                  title="Reschedule task"
                  aria-label="Reschedule task"
                >
                  <Clock size={13} />
                </button>
                {snoozeOpen && (
                  <SnoozeMenu
                    activeDate={item.dateKey}
                    onSnooze={(newDate) => {
                      setSnoozeOpen(false);
                      onSnooze?.(item.id, newDate);
                    }}
                    onClose={() => setSnoozeOpen(false)}
                  />
                )}
              </div>
            </>
          )}
          <button
            type="button"
            className="quick-task-delete"
            onClick={() => onRequestDelete({ type: "one", id: item.id, title: item.title })}
            aria-label={`Delete ${item.title}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </li>
  );
}

/** Checklist for one workspace (Personal on home, or a dedicated workspace page). */
export default function QuickTasks({ dateKey, workspaceId = DEFAULT_WORKSPACE_ID }) {
  const [draft, setDraft] = useState("");
  const [dueDraft, setDueDraft] = useState("");
  const [labelDraft, setLabelDraft] = useState("");
  const [filterLabelId, setFilterLabelId] = useState(null);
  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [draggingLabel, setDraggingLabel] = useState(false);
  const [dropTargetId, setDropTargetId] = useState(null);
  const [dayNow, setDayNow] = useState(todayKey);
  const [deleteRequest, setDeleteRequest] = useState(null);
  const inputRef = useRef(null);
  const lastTapRef = useRef({ time: 0, id: null });
  const lastDoubleActionRef = useRef(0);
  const [timerModalOpen, setTimerModalOpen] = useState(false);
  const [moodModalOpen, setMoodModalOpen] = useState(false);
  const quickTasks = useTaskStore((s) => s.quickTasks);
  const quickLabels = useTaskStore((s) => s.quickLabels);
  const quickWorkspaces = useTaskStore((s) => s.quickWorkspaces);
  const followFlows = useTaskStore((s) => s.followFlows);
  const rollEverydayFlows = useTaskStore((s) => s.rollEverydayFlows);
  const addQuickTask = useTaskStore((s) => s.addQuickTask);
  const addQuickLabel = useTaskStore((s) => s.addQuickLabel);
  const deleteQuickLabel = useTaskStore((s) => s.deleteQuickLabel);
  const toggleQuickTask = useTaskStore((s) => s.toggleQuickTask);
  const snoozeQuickTask = useTaskStore((s) => s.snoozeQuickTask);
  const setFocusTimer = useTaskStore((s) => s.setFocusTimer);
  const soundEnabled = useTaskStore((s) => s.soundEnabled);
  const addQuickTaskLabel = useTaskStore((s) => s.addQuickTaskLabel);
  const removeQuickTaskLabel = useTaskStore((s) => s.removeQuickTaskLabel);
  const clearQuickTaskLabels = useTaskStore((s) => s.clearQuickTaskLabels);
  const deleteQuickTask = useTaskStore((s) => s.deleteQuickTask);
  const spaceId = workspaceId || DEFAULT_WORKSPACE_ID;
  const isWorkspace = spaceId !== DEFAULT_WORKSPACE_ID;
  const showWorkspaceMirrors = !isWorkspace;
  const showFlowMirrors = !isWorkspace;

  const labelsById = useMemo(() => {
    const map = {};
    (quickLabels || []).forEach((l) => {
      map[l.id] = l;
    });
    return map;
  }, [quickLabels]);

  const workspacesById = useMemo(() => {
    const map = {};
    (quickWorkspaces || []).forEach((w) => {
      map[w.id] = w;
    });
    return map;
  }, [quickWorkspaces]);

  const activeFilterObj = useMemo(() => {
    if (!filterLabelId) return null;
    if (filterLabelId === "__none__") return { id: "__none__", name: "None (Unlabeled)", color: null };
    return labelsById[filterLabelId] || { id: filterLabelId, name: "Label", color: null };
  }, [filterLabelId, labelsById]);

  useEffect(() => {
    function onFocusInput() {
      inputRef.current?.focus();
    }
    window.addEventListener("focus-quick-task-input", onFocusInput);
    return () => window.removeEventListener("focus-quick-task-input", onFocusInput);
  }, []);

  useEffect(() => {
    const tick = () => {
      setDayNow(todayKey());
      if (showFlowMirrors) rollEverydayFlows();
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    const onFocus = () => tick();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [rollEverydayFlows, showFlowMirrors]);

  const scoped = useMemo(
    () => quickTasks.filter((t) => taskWorkspaceId(t) === spaceId),
    [quickTasks, spaceId]
  );

  const foreign = useMemo(
    () =>
      showWorkspaceMirrors
        ? quickTasks.filter((t) => taskWorkspaceId(t) !== DEFAULT_WORKSPACE_ID)
        : [],
    [quickTasks, showWorkspaceMirrors]
  );

  const activeDate = dateKey || dayNow;
  const viewingToday = activeDate === dayNow;
  const dayHasEnded = isBeforeToday(activeDate);
  const dayOpts = { activeDate, dayHasEnded, viewingToday };

  const dayOpen = useMemo(
    () => filterDayOpen(scoped, dayOpts),
    [scoped, activeDate, dayHasEnded, viewingToday]
  );

  const dayDone = useMemo(
    () => filterDayDone(scoped, activeDate),
    [scoped, activeDate]
  );

  const notCompleted = useMemo(
    () => filterNotCompleted(scoped, dayOpts),
    [scoped, viewingToday, dayHasEnded, activeDate]
  );

  const mirrorOpen = useMemo(
    () => filterDayOpen(foreign, dayOpts),
    [foreign, activeDate, dayHasEnded, viewingToday]
  );

  const mirrorDone = useMemo(
    () => filterDayDone(foreign, activeDate),
    [foreign, activeDate]
  );

  const mirrorMissed = useMemo(
    () => filterNotCompleted(foreign, dayOpts),
    [foreign, viewingToday, dayHasEnded, activeDate]
  );

  const rawFlowMirrors = useMemo(
    () => (showFlowMirrors ? buildEverydayMirrors(followFlows, activeDate, dayNow, quickTasks) : []),
    [showFlowMirrors, followFlows, activeDate, dayNow, quickTasks]
  );

  const filteredDayOpen = useMemo(
    () => (filterLabelId ? dayOpen.filter((t) => taskMatchesFilter(t, filterLabelId)) : dayOpen),
    [dayOpen, filterLabelId]
  );

  const filteredDayDone = useMemo(
    () => (filterLabelId ? dayDone.filter((t) => taskMatchesFilter(t, filterLabelId)) : dayDone),
    [dayDone, filterLabelId]
  );

  const filteredNotCompleted = useMemo(
    () => (filterLabelId ? notCompleted.filter((t) => taskMatchesFilter(t, filterLabelId)) : notCompleted),
    [notCompleted, filterLabelId]
  );

  const filteredMirrorOpen = useMemo(
    () => (filterLabelId ? mirrorOpen.filter((t) => taskMatchesFilter(t, filterLabelId)) : mirrorOpen),
    [mirrorOpen, filterLabelId]
  );

  const filteredMirrorDone = useMemo(
    () => (filterLabelId ? mirrorDone.filter((t) => taskMatchesFilter(t, filterLabelId)) : mirrorDone),
    [mirrorDone, filterLabelId]
  );

  const filteredMirrorMissed = useMemo(
    () => (filterLabelId ? mirrorMissed.filter((t) => taskMatchesFilter(t, filterLabelId)) : mirrorMissed),
    [mirrorMissed, filterLabelId]
  );

  const filteredFlowMirrors = useMemo(
    () => (filterLabelId ? rawFlowMirrors.filter((t) => taskMatchesFilter(t, filterLabelId)) : rawFlowMirrors),
    [rawFlowMirrors, filterLabelId]
  );

  const [collapsedFlows, setCollapsedFlows] = useState({});

  const flowGroups = useMemo(() => {
    const map = {};
    (filteredFlowMirrors || []).forEach((item) => {
      const fid = item.flowRef?.id || "other";
      if (!map[fid]) {
        map[fid] = {
          flowRef: item.flowRef,
          items: [],
        };
      }
      map[fid].items.push(item);
    });
    return Object.values(map);
  }, [filteredFlowMirrors]);

  function toggleFlowCollapse(flowId) {
    setCollapsedFlows((cur) => ({
      ...cur,
      [flowId]: !cur[flowId],
    }));
  }

  const activeList = [...filteredDayOpen, ...filteredDayDone];
  const mirrorList = showWorkspaceMirrors ? [...filteredMirrorOpen, ...filteredMirrorDone] : [];
  const displayList = [...activeList, ...mirrorList, ...filteredFlowMirrors];
  const missedList = showWorkspaceMirrors
    ? [...filteredNotCompleted, ...filteredMirrorMissed]
    : filteredNotCompleted;
  const canAdd = !dayHasEnded || viewingToday;

  function workspaceRefFor(item) {
    if (!showWorkspaceMirrors) return null;
    const id = taskWorkspaceId(item);
    if (id === DEFAULT_WORKSPACE_ID) return null;
    const ws = workspacesById[id];
    if (!ws) return { id, name: "Workspace", color: "#c9dff3" };
    return { id: ws.id, name: ws.name, color: ws.color };
  }

  function toggleFilter(labelId) {
    const now = Date.now();
    if (now - lastDoubleActionRef.current < 350) return;
    lastDoubleActionRef.current = now;
    setFilterLabelId((cur) => (cur === labelId ? null : labelId));
  }

  function handleLabelClick(labelId) {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 320;
    if (lastTapRef.current.id === labelId && now - lastTapRef.current.time < DOUBLE_TAP_DELAY) {
      lastTapRef.current = { time: 0, id: null };
      toggleFilter(labelId);
      return;
    }
    lastTapRef.current = { time: now, id: labelId };

    if (labelId === "__none__") {
      setLabelDraft("");
    } else {
      setLabelDraft((cur) => (cur === labelId ? "" : labelId));
    }
  }

  function handleLabelDoubleClick(labelId) {
    toggleFilter(labelId);
  }

  function submit() {
    if (!canAdd) return;
    const target = viewingToday || !dayHasEnded ? activeDate : dayNow;
    const added = addQuickTask({
      title: draft,
      dateKey: target,
      workspaceId: spaceId,
      dueDate: isWorkspace && dueDraft ? dueDraft : null,
      labelId: isWorkspace && labelDraft ? labelDraft : null,
    });
    if (added) {
      setDraft("");
      setDueDraft("");
      setLabelDraft("");
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") {
      setDraft("");
      setDueDraft("");
      setLabelDraft("");
    }
  }

  function runDelete(request) {
    if (!request) return;
    if (request.type === "clear") {
      filteredDayDone.forEach((t) => deleteQuickTask(t.id));
    } else if (request.type === "label" && request.id) {
      deleteQuickLabel(request.id);
      if (filterLabelId === request.id) setFilterLabelId(null);
    } else if (request.type === "clear-label" && request.taskId) {
      if (request.labelId) removeQuickTaskLabel(request.taskId, request.labelId);
      else clearQuickTaskLabels(request.taskId);
    } else if (request.id) {
      deleteQuickTask(request.id);
    }
    setDeleteRequest(null);
  }

  function requestRemoveLabelFromTask(taskId, labelId) {
    const task = quickTasks.find((t) => t.id === taskId);
    const label = labelsById[labelId];
    setDeleteRequest({
      type: "clear-label",
      taskId,
      labelId,
      title: label?.name || task?.title || "label",
    });
  }

  function requestClearTaskLabels(taskId) {
    const task = quickTasks.find((t) => t.id === taskId);
    setDeleteRequest({
      type: "clear-label",
      taskId,
      title: task?.title || "task",
    });
  }

  function handleCreateLabel({ name, color }) {
    const created = addQuickLabel({ name, color });
    setLabelModalOpen(false);
    if (created?.id) setLabelDraft(created.id);
  }

  function readDroppedLabelId(e) {
    return (
      e.dataTransfer.getData(LABEL_DRAG_TYPE) ||
      e.dataTransfer.getData("text/plain") ||
      ""
    ).trim();
  }

  function onLabelDragStart(e, labelId) {
    e.dataTransfer.setData(LABEL_DRAG_TYPE, labelId);
    e.dataTransfer.setData("text/plain", labelId);
    e.dataTransfer.effectAllowed = "copy";
    setDraggingLabel(true);
    setDropTargetId(null);
  }

  function onLabelDragEnd() {
    setDraggingLabel(false);
    setDropTargetId(null);
  }

  function onDragOverRow(e, taskId) {
    if (!draggingLabel && ![...e.dataTransfer.types].includes(LABEL_DRAG_TYPE) && ![...e.dataTransfer.types].includes("text/plain")) {
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDropTargetId(taskId);
  }

  function onDragLeaveRow(taskId) {
    setDropTargetId((cur) => (cur === taskId ? null : cur));
  }

  function onDropLabel(e, taskId) {
    e.preventDefault();
    const labelId = readDroppedLabelId(e);
    setDraggingLabel(false);
    setDropTargetId(null);
    if (!labelId || labelId === "__none__") {
      if (labelId === "__none__") requestClearTaskLabels(taskId);
      return;
    }
    addQuickTaskLabel(taskId, labelId);
  }

  function handleToggle(id) {
    setDraggingLabel(false);
    setDropTargetId(null);
    const task = quickTasks.find((t) => t.id === id);
    const willBeDone = !task?.done;
    toggleQuickTask(id);
    if (willBeDone) {
      if (soundEnabled) playTickSound();
      triggerConfetti();
    }
  }

  function handleSnooze(id, newDate) {
    snoozeQuickTask(id, newDate);
    if (soundEnabled) playTickSound();
  }

  function handleStartFocus(id, title) {
    setFocusTimer({
      active: true,
      taskId: id,
      taskTitle: title,
      secondsLeft: 25 * 60,
      mode: "focus",
      running: true,
    });
    window.dispatchEvent(new CustomEvent("open-focus-timer"));
  }

  const rowDragProps = isWorkspace
    ? {
        dropReady: draggingLabel,
        onDragOverRow,
        onDragLeaveRow,
        onDropLabel,
        onClearLabel: requestRemoveLabelFromTask,
      }
    : {};

  return (
    <div className="quick-tasks-stack">
      <section className="quick-tasks" aria-label="Quick tasks for the day">
        <div className="quick-section-head">
          <div className="quick-section-title-wrap">
            <h2>{viewingToday ? "Today" : formatFriendly(activeDate)}</h2>
            <div className="quick-head-tools">
              <button
                type="button"
                className="quick-head-tool-btn"
                onClick={() => setTimerModalOpen(true)}
                title="Open Focus Timer (25m Focus / 5m Break)"
              >
                <Timer size={14} />
                <span>Focus timer</span>
              </button>
              <button
                type="button"
                className="quick-head-tool-btn"
                onClick={() => setMoodModalOpen(true)}
                title="Daily Mood & Expression Reflection (Open 11:00 PM – 11:59 PM)"
              >
                <Moon size={14} />
                <span>Nightly mood</span>
                {isMoodWindowOpen() && <span className="quick-tool-live-dot" title="Window is Live!" />}
              </button>
            </div>
          </div>
          <p>
            {dayHasEnded
              ? "This day has closed. Unfinished items sit in Not completed."
              : isWorkspace
                ? "Tasks in this workspace only. Drag a label onto any task · Double-tap label to filter."
                : "Your everyday checklist. Workspace and Everyday flow steps show here too."}
          </p>
        </div>

        <div className="quick-tasks-panel">
          {canAdd && (
            <div className="quick-tasks-composer">
              <div className="quick-tasks-input-row">
                <span className="quick-tasks-input-mark" aria-hidden="true" />
                <input
                  ref={inputRef}
                  className="quick-tasks-input"
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Add a quick task"
                  aria-label="Add a quick task"
                  maxLength={200}
                />
                {isWorkspace && (
                  <label className={`quick-tasks-due-inline${dueDraft ? " has-date" : ""}`}>
                    <CalendarDays size={14} aria-hidden="true" />
                    <input
                      type="date"
                      className="quick-tasks-due-input"
                      value={dueDraft}
                      min={dayNow}
                      onChange={(e) => setDueDraft(e.target.value)}
                      aria-label="Optional expected deadline"
                      title="Expected deadline (optional)"
                    />
                    {dueDraft && (
                      <button
                        type="button"
                        className="quick-tasks-due-clear"
                        onClick={(e) => {
                          e.preventDefault();
                          setDueDraft("");
                        }}
                        aria-label="Clear deadline"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </label>
                )}
                {draft.trim() && (
                  <button type="button" className="quick-tasks-add" onClick={submit}>
                    Add
                  </button>
                )}
              </div>

              {isWorkspace && (
                <div className="quick-label-tray" aria-label="Task labels">
                  <Tag size={13} className="quick-label-tray-icon" aria-hidden="true" />
                  <button
                    type="button"
                    className={`quick-label-pill${!labelDraft ? " is-selected" : ""}${filterLabelId === "__none__" ? " is-filtered" : ""}`}
                    draggable
                    onDragStart={(e) => onLabelDragStart(e, "__none__")}
                    onDragEnd={onLabelDragEnd}
                    onClick={() => handleLabelClick("__none__")}
                    onDoubleClick={() => handleLabelDoubleClick("__none__")}
                    title="Double-tap to filter unlabeled tasks · Click for new tasks · Drag onto task to clear label"
                    aria-pressed={filterLabelId === "__none__"}
                  >
                    {filterLabelId === "__none__" && (
                      <Filter size={10} className="quick-label-filter-icon" aria-hidden="true" />
                    )}
                    None
                  </button>
                  {(quickLabels || []).map((label) => {
                    const selected = labelDraft === label.id;
                    const isFiltered = filterLabelId === label.id;
                    return (
                      <button
                        key={label.id}
                        type="button"
                        className={`quick-label-pill${selected ? " is-selected" : ""}${isFiltered ? " is-filtered" : ""}${draggingLabel ? " is-dragging-source" : ""}`}
                        style={{
                          "--label-bg": label.color,
                          "--label-ink": labelColorInk(label.color),
                        }}
                        draggable
                        onDragStart={(e) => onLabelDragStart(e, label.id)}
                        onDragEnd={onLabelDragEnd}
                        onClick={() => handleLabelClick(label.id)}
                        onDoubleClick={() => handleLabelDoubleClick(label.id)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setDeleteRequest({
                            type: "label",
                            id: label.id,
                            title: label.name,
                          });
                        }}
                        title="Double-tap to filter · Drag onto a task · Click for new tasks · Right-click to delete"
                        aria-pressed={isFiltered}
                      >
                        {isFiltered && (
                          <Filter size={10} className="quick-label-filter-icon" aria-hidden="true" />
                        )}
                        {label.name}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className="quick-label-create"
                    onClick={() => setLabelModalOpen(true)}
                  >
                    <Plus size={13} /> Create label
                  </button>
                </div>
              )}
            </div>
          )}

          {filterLabelId && (
            <div className="quick-filter-banner" role="status">
              <div className="quick-filter-banner-text">
                <Filter size={13} aria-hidden="true" />
                <span>
                  Filtered by label:{" "}
                  <strong>{activeFilterObj?.name || "Label"}</strong>
                </span>
                <span className="quick-filter-banner-count">
                  ({displayList.length} {displayList.length === 1 ? "task" : "tasks"})
                </span>
              </div>
              <button
                type="button"
                className="quick-filter-banner-clear"
                onClick={() => setFilterLabelId(null)}
                title="Clear filter and show all tasks"
              >
                Show all <X size={12} aria-hidden="true" />
              </button>
            </div>
          )}

          {displayList.length === 0 && !dayHasEnded ? (
            filterLabelId ? (
              <div className="quick-tasks-empty-wrap">
                <p className="quick-tasks-empty">
                  No tasks found with label “{activeFilterObj?.name || "selected"}”.
                </p>
                <button
                  type="button"
                  className="quick-filter-empty-reset"
                  onClick={() => setFilterLabelId(null)}
                >
                  Show all tasks
                </button>
              </div>
            ) : (
              <p className="quick-tasks-empty">Nothing here yet—type above and press Enter.</p>
            )
          ) : displayList.length === 0 && dayHasEnded ? (
            filterLabelId ? (
              <div className="quick-tasks-empty-wrap">
                <p className="quick-tasks-empty">
                  No tasks found with label “{activeFilterObj?.name || "selected"}”.
                </p>
                <button
                  type="button"
                  className="quick-filter-empty-reset"
                  onClick={() => setFilterLabelId(null)}
                >
                  Show all tasks
                </button>
              </div>
            ) : (
              <p className="quick-tasks-empty">
                {missedList.length > 0
                  ? "Nothing was finished this day—open items are in Not completed below."
                  : "Nothing logged for this day."}
              </p>
            )
          ) : (
            <div className="quick-tasks-groups-wrap">
              {/* Regular Quick Tasks & Workspace Mirrors */}
              {(activeList.length > 0 || mirrorList.length > 0) && (
                <ul className="quick-tasks-list">
                  {[...activeList, ...mirrorList].map((item) => {
                    const workspaceRef = item.flowRef ? null : workspaceRefFor(item);
                    const labelIds = Array.isArray(item.labelIds)
                      ? item.labelIds
                      : item.labelId
                        ? [item.labelId]
                        : [];
                    const labels = labelIds.map((id) => labelsById[id]).filter(Boolean);
                    const isMirror = Boolean(workspaceRef);
                    return (
                      <QuickTaskRow
                        key={item.id}
                        item={item}
                        labels={labels}
                        workspaceRef={workspaceRef}
                        flowRef={null}
                        isDropTarget={!isMirror && dropTargetId === item.id}
                        onToggle={handleToggle}
                        onRequestDelete={setDeleteRequest}
                        onSnooze={handleSnooze}
                        onStartFocus={handleStartFocus}
                        {...(isMirror ? {} : rowDragProps)}
                      />
                    );
                  })}
                </ul>
              )}

              {/* Grouped & Collapsible Everyday Flows */}
              {flowGroups.map((group) => {
                const fid = group.flowRef?.id || "flow";
                const isCollapsed = Boolean(collapsedFlows[fid]);
                const doneCount = group.items.filter((t) => t.done).length;
                const totalCount = group.items.length;
                const allDone = doneCount === totalCount;

                return (
                  <div
                    key={fid}
                    className={`quick-flow-group${isCollapsed ? " is-collapsed" : ""}`}
                    style={{ "--flow-tint": group.flowRef.color }}
                  >
                    <div
                      className="quick-flow-group-head"
                      onClick={() => toggleFlowCollapse(fid)}
                      role="button"
                      tabIndex={0}
                      aria-expanded={!isCollapsed}
                    >
                      <div className="quick-flow-group-head-left">
                        <span className="quick-flow-group-toggle" aria-hidden="true">
                          {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                        </span>
                        <span className="quick-flow-group-icon">
                          <GitBranch size={13} />
                        </span>
                        <strong className="quick-flow-group-title">{group.flowRef.name}</strong>
                        <span className={`quick-flow-group-pill${allDone ? " is-done" : ""}`}>
                          {doneCount}/{totalCount} done
                        </span>
                      </div>

                      <div className="quick-flow-group-head-right" onClick={(e) => e.stopPropagation()}>
                        <Link to={`/app/flows/${fid}`} className="quick-flow-group-link">
                          Open flow <ArrowUpRight size={12} />
                        </Link>
                      </div>
                    </div>

                    {!isCollapsed && (
                      <ul className="quick-tasks-list quick-flow-group-list">
                        {group.items.map((item) => (
                          <QuickTaskRow
                            key={item.id}
                            item={item}
                            labels={[]}
                            workspaceRef={null}
                            flowRef={item.flowRef}
                            hideMirrorChip={true}
                            isDropTarget={false}
                            onToggle={handleToggle}
                            onRequestDelete={setDeleteRequest}
                            onSnooze={handleSnooze}
                            onStartFocus={handleStartFocus}
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {displayList.length > 0 && (
            <div className="quick-tasks-footer">
              <span>
                {filteredDayOpen.length} open
                {filteredDayDone.length > 0 ? ` · ${filteredDayDone.length} done` : ""}
                {filteredMirrorOpen.length > 0 || filteredMirrorDone.length > 0
                  ? ` · ${filteredMirrorOpen.length + filteredMirrorDone.length} from workspaces`
                  : ""}
                {filteredFlowMirrors.length > 0 ? ` · ${filteredFlowMirrors.length} from Everyday` : ""}
                {filterLabelId && (
                  <span className="quick-tasks-filter-note"> · Filter active</span>
                )}
              </span>
              <div className="quick-tasks-footer-actions">
                {filterLabelId && (
                  <button
                    type="button"
                    className="quick-tasks-clear quick-tasks-filter-clear-btn"
                    onClick={() => setFilterLabelId(null)}
                    title="Clear label filter"
                  >
                    <X size={12} /> Clear filter
                  </button>
                )}
                {filteredDayDone.length > 0 && filteredDayOpen.length === 0 && (
                  <button
                    type="button"
                    className="quick-tasks-clear"
                    onClick={() => setDeleteRequest({ type: "clear" })}
                  >
                    <X size={13} /> Clear completed
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {(missedList.length > 0 || viewingToday) && (
        <section className="quick-missed" aria-label="Not completed">
          <div className="quick-section-head">
            <h2>
              <CircleAlert size={18} />
              Not completed
            </h2>
            <p>
              {viewingToday
                ? "No due date: open items move here at 12:00 AM with a delayed label. With a due date: they stay in Today until that date passes."
                : "Left unfinished when this day ended (or after the due date)."}
            </p>
          </div>

          <div className="quick-tasks-panel quick-missed-panel">
            {missedList.length === 0 ? (
              <p className="quick-tasks-empty">All clear—nothing carried past midnight.</p>
            ) : (
              <ul className="quick-tasks-list">
                {missedList.map((item) => {
                  const workspaceRef = workspaceRefFor(item);
                  return (
                    <QuickTaskRow
                      key={item.id}
                      item={item}
                      labels={
                        (Array.isArray(item.labelIds)
                          ? item.labelIds
                          : item.labelId
                            ? [item.labelId]
                            : []
                        )
                          .map((id) => labelsById[id])
                          .filter(Boolean)
                      }
                      workspaceRef={workspaceRef}
                      missed
                      isDropTarget={!workspaceRef && dropTargetId === item.id}
                      onToggle={handleToggle}
                      onRequestDelete={setDeleteRequest}
                      onSnooze={handleSnooze}
                      onStartFocus={handleStartFocus}
                      {...(workspaceRef ? {} : rowDragProps)}
                    />
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      )}

      <CreateLabelModal
        open={labelModalOpen}
        onClose={() => setLabelModalOpen(false)}
        onCreate={handleCreateLabel}
      />

      <MoodTrackerModal
        open={moodModalOpen}
        onClose={() => setMoodModalOpen(false)}
      />

      <OnePasswordGate
        open={Boolean(deleteRequest)}
        title={
          deleteRequest?.type === "clear"
            ? "Clear all completed tasks"
            : deleteRequest?.type === "label"
              ? `Delete label “${deleteRequest?.title || ""}”`
              : deleteRequest?.type === "clear-label"
                ? `Remove label “${deleteRequest?.title || ""}”`
                : `Delete “${deleteRequest?.title || "task"}”`
        }
        description={
          deleteRequest?.type === "label"
            ? "Tasks keep their text; this label is removed from them."
            : deleteRequest?.type === "clear-label"
              ? "Answer your One Password question to remove this label from the task."
              : "Answer your One Password question to delete this."
        }
        onClose={() => setDeleteRequest(null)}
        onConfirm={() => {
          const pending = deleteRequest;
          setDeleteRequest(null);
          runDelete(pending);
        }}
      />
    </div>
  );
}
