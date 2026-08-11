import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarDays, CircleAlert, Plus, Tag, Trash2, X } from "lucide-react";
import { useTaskStore } from "../store/useTaskStore";
import OnePasswordGate from "./OnePasswordGate";
import CreateLabelModal from "./CreateLabelModal";
import { DEFAULT_WORKSPACE_ID, labelColorInk, workspaceColorInk } from "../lib/quickTaskService";
import { formatClock, formatDateTime, formatDuration, formatFriendly, formatMonthDay, isBeforeToday, todayKey, toKey } from "../lib/date";

const LABEL_DRAG_TYPE = "application/x-seentasks-label";

function sortDayItems(items) {
  const byCreated = (a, b) => (a.createdAt < b.createdAt ? 1 : -1);
  const byCompleted = (a, b) => (a.completedAt < b.completedAt ? 1 : -1);
  return [
    ...items.filter((t) => !t.done).sort(byCreated),
    ...items.filter((t) => t.done).sort(byCompleted),
  ];
}

function isRecoveredQuickTask(item) {
  if (!item?.done || !item.completedAt || !item.dateKey) return false;
  return toKey(item.completedAt) > item.dateKey;
}

function belongsToDayDone(item, activeDate) {
  if (!item.done) return false;
  if (item.dateKey === activeDate) return true;
  return Boolean(item.completedAt && toKey(item.completedAt) === activeDate);
}

function taskWorkspaceId(task) {
  return task.workspaceId || DEFAULT_WORKSPACE_ID;
}

/** Open past its day: no due → midnight; with due → only after due date passes. */
function belongsInNotCompleted(task) {
  if (task?.done) return false;
  if (!task?.dateKey || !isBeforeToday(task.dateKey)) return false;
  if (task.dueDate && !isBeforeToday(task.dueDate)) return false;
  return true;
}

/** Past-day open task still waiting on a future/today due date. */
function isDueCarry(task) {
  if (task?.done || !task?.dateKey || !task?.dueDate) return false;
  return isBeforeToday(task.dateKey) && !isBeforeToday(task.dueDate);
}

function filterDayOpen(tasks, { activeDate, dayHasEnded, viewingToday }) {
  if (dayHasEnded) {
    return sortDayItems(
      tasks.filter((t) => t.dateKey === activeDate && !t.done && isDueCarry(t))
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

function QuickTaskRow({
  item,
  labels = [],
  workspaceRef = null,
  missed = false,
  dropReady = false,
  isDropTarget = false,
  onToggle,
  onRequestDelete,
  onClearLabel,
  onDragOverRow,
  onDragLeaveRow,
  onDropLabel,
}) {
  const isMirror = Boolean(workspaceRef);
  const recovered = !isMirror && isRecoveredQuickTask(item);
  const started = recovered ? formatDateTime(item.createdAt) : formatClock(item.createdAt);
  const ended = item.done
    ? recovered
      ? formatDateTime(item.completedAt)
      : formatClock(item.completedAt)
    : null;
  const duration = recovered ? formatDuration(item.createdAt, item.completedAt) : "";
  const stamp = formatMonthDay(item.dateKey);
  const dueOverdue = Boolean(item.dueDate && !item.done && isBeforeToday(item.dueDate));
  const dueToday = Boolean(item.dueDate && !item.done && item.dueDate === todayKey());
  const wsHref = workspaceRef ? `/app/workspace/${workspaceRef.id}` : null;
  const wsInk = workspaceRef ? workspaceColorInk(workspaceRef.color) : null;

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
              workspaceRef
                ? {
                    "--ws-color": workspaceRef.color,
                    "--ws-ink": wsInk,
                  }
                : undefined
            }
            aria-hidden="true"
            title="Complete this in its workspace"
          />
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
          {workspaceRef && (
            <span
              className="quick-task-workspace-chip"
              style={{
                "--ws-color": workspaceRef.color,
                "--ws-ink": wsInk,
              }}
            >
              {workspaceRef.name}
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
          {item.dueDate && (
            <span
              className={`quick-task-due${dueOverdue ? " is-overdue" : ""}${dueToday ? " is-due-today" : ""}`}
            >
              <CalendarDays size={11} aria-hidden="true" />
              {dueOverdue ? "Overdue · " : dueToday ? "Due today · " : "Due "}
              {formatFriendly(item.dueDate)}
            </span>
          )}
        </div>
        <div className="quick-task-times">
          {started && <span>Started {started}</span>}
          {ended ? (
            <span>Ended {ended}</span>
          ) : missed ? (
            <span>Left open past midnight</span>
          ) : isMirror ? (
            <span>Open in workspace</span>
          ) : (
            <span>In progress</span>
          )}
          {duration && <span>{duration} total</span>}
        </div>
      </div>

      {isMirror ? (
        <Link
          to={wsHref}
          className="quick-task-goto"
          style={
            workspaceRef
              ? {
                  "--ws-color": workspaceRef.color,
                  "--ws-ink": wsInk,
                }
              : undefined
          }
        >
          Go to workspace
          <ArrowUpRight size={13} aria-hidden="true" />
        </Link>
      ) : (
        <button
          type="button"
          className="quick-task-delete"
          onClick={() => onRequestDelete({ type: "one", id: item.id, title: item.title })}
          aria-label={`Delete ${item.title}`}
        >
          <Trash2 size={14} />
        </button>
      )}
    </li>
  );
}

/** Checklist for one workspace (Personal on home, or a dedicated workspace page). */
export default function QuickTasks({ dateKey, workspaceId = DEFAULT_WORKSPACE_ID }) {
  const [draft, setDraft] = useState("");
  const [dueDraft, setDueDraft] = useState("");
  const [labelDraft, setLabelDraft] = useState("");
  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [draggingLabel, setDraggingLabel] = useState(false);
  const [dropTargetId, setDropTargetId] = useState(null);
  const [dayNow, setDayNow] = useState(todayKey);
  const [deleteRequest, setDeleteRequest] = useState(null);
  const quickTasks = useTaskStore((s) => s.quickTasks);
  const quickLabels = useTaskStore((s) => s.quickLabels);
  const quickWorkspaces = useTaskStore((s) => s.quickWorkspaces);
  const addQuickTask = useTaskStore((s) => s.addQuickTask);
  const addQuickLabel = useTaskStore((s) => s.addQuickLabel);
  const deleteQuickLabel = useTaskStore((s) => s.deleteQuickLabel);
  const toggleQuickTask = useTaskStore((s) => s.toggleQuickTask);
  const addQuickTaskLabel = useTaskStore((s) => s.addQuickTaskLabel);
  const removeQuickTaskLabel = useTaskStore((s) => s.removeQuickTaskLabel);
  const clearQuickTaskLabels = useTaskStore((s) => s.clearQuickTaskLabels);
  const deleteQuickTask = useTaskStore((s) => s.deleteQuickTask);
  const spaceId = workspaceId || DEFAULT_WORKSPACE_ID;
  const isWorkspace = spaceId !== DEFAULT_WORKSPACE_ID;
  const showWorkspaceMirrors = !isWorkspace;

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

  useEffect(() => {
    const tick = () => setDayNow(todayKey());
    const id = window.setInterval(tick, 30_000);
    const onFocus = () => tick();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

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

  const activeList = [...dayOpen, ...dayDone];
  const mirrorList = showWorkspaceMirrors ? [...mirrorOpen, ...mirrorDone] : [];
  const displayList = [...activeList, ...mirrorList];
  const missedList = showWorkspaceMirrors
    ? [...notCompleted, ...mirrorMissed]
    : notCompleted;
  const canAdd = !dayHasEnded || viewingToday;

  function workspaceRefFor(item) {
    if (!showWorkspaceMirrors) return null;
    const id = taskWorkspaceId(item);
    if (id === DEFAULT_WORKSPACE_ID) return null;
    const ws = workspacesById[id];
    if (!ws) return { id, name: "Workspace", color: "#c9dff3" };
    return { id: ws.id, name: ws.name, color: ws.color };
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
      dayDone.forEach((t) => deleteQuickTask(t.id));
    } else if (request.type === "label" && request.id) {
      deleteQuickLabel(request.id);
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
    toggleQuickTask(id);
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
          <h2>{viewingToday ? "Today" : formatFriendly(activeDate)}</h2>
          <p>
            {dayHasEnded
              ? "This day has closed. Unfinished items sit in Not completed."
              : isWorkspace
                ? "Tasks in this workspace only. Drag a label onto any task."
                : "Your everyday checklist. Workspace tasks show here too—open the workspace to complete them."}
          </p>
        </div>

        <div className="quick-tasks-panel">
          {canAdd && (
            <div className="quick-tasks-composer">
              <div className="quick-tasks-input-row">
                <span className="quick-tasks-input-mark" aria-hidden="true" />
                <input
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
                    className={`quick-label-pill${!labelDraft ? " is-selected" : ""}`}
                    draggable
                    onDragStart={(e) => onLabelDragStart(e, "__none__")}
                    onDragEnd={onLabelDragEnd}
                    onClick={() => setLabelDraft("")}
                    title="Drag onto a task to clear its label"
                  >
                    None
                  </button>
                  {(quickLabels || []).map((label) => {
                    const selected = labelDraft === label.id;
                    return (
                      <button
                        key={label.id}
                        type="button"
                        className={`quick-label-pill${selected ? " is-selected" : ""}${draggingLabel ? " is-dragging-source" : ""}`}
                        style={{
                          "--label-bg": label.color,
                          "--label-ink": labelColorInk(label.color),
                        }}
                        draggable
                        onDragStart={(e) => onLabelDragStart(e, label.id)}
                        onDragEnd={onLabelDragEnd}
                        onClick={() => setLabelDraft(selected ? "" : label.id)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setDeleteRequest({
                            type: "label",
                            id: label.id,
                            title: label.name,
                          });
                        }}
                        title="Drag onto a task · click for new tasks · right-click to delete"
                      >
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

          {displayList.length === 0 && !dayHasEnded ? (
            <p className="quick-tasks-empty">Nothing here yet—type above and press Enter.</p>
          ) : displayList.length === 0 && dayHasEnded ? (
            <p className="quick-tasks-empty">
              {missedList.length > 0
                ? "Nothing was finished this day—open items are in Not completed below."
                : "Nothing logged for this day."}
            </p>
          ) : (
            <ul className="quick-tasks-list">
              {displayList.map((item) => {
                const workspaceRef = workspaceRefFor(item);
                const labelIds = Array.isArray(item.labelIds)
                  ? item.labelIds
                  : item.labelId
                    ? [item.labelId]
                    : [];
                const labels = labelIds.map((id) => labelsById[id]).filter(Boolean);
                return (
                  <QuickTaskRow
                    key={item.id}
                    item={item}
                    labels={labels}
                    workspaceRef={workspaceRef}
                    isDropTarget={!workspaceRef && dropTargetId === item.id}
                    onToggle={handleToggle}
                    onRequestDelete={setDeleteRequest}
                    {...(workspaceRef ? {} : rowDragProps)}
                  />
                );
              })}
            </ul>
          )}

          {displayList.length > 0 && (
            <div className="quick-tasks-footer">
              <span>
                {dayOpen.length} open
                {dayDone.length > 0 ? ` · ${dayDone.length} done` : ""}
                {mirrorList.length > 0 ? ` · ${mirrorList.length} from workspaces` : ""}
              </span>
              {dayDone.length > 0 && dayOpen.length === 0 && (
                <button
                  type="button"
                  className="quick-tasks-clear"
                  onClick={() => setDeleteRequest({ type: "clear" })}
                >
                  <X size={13} /> Clear completed
                </button>
              )}
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
                ? "No due date: open items move here at 12:00 AM. With a due date: they stay in tasks until that date passes."
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
