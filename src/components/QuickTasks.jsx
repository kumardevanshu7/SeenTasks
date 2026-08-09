import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, CircleAlert, Trash2, X } from "lucide-react";
import { useTaskStore } from "../store/useTaskStore";
import OnePasswordGate from "./OnePasswordGate";
import { DEFAULT_WORKSPACE_ID } from "../lib/quickTaskService";
import { formatClock, formatDateTime, formatDuration, formatFriendly, formatMonthDay, isBeforeToday, todayKey, toKey } from "../lib/date";

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

function QuickTaskRow({ item, missed = false, onToggle, onRequestDelete }) {
  const recovered = isRecoveredQuickTask(item);
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

  return (
    <li className={`quick-task-row${item.done ? " quick-task-done" : ""}${missed ? " quick-task-missed" : ""}${recovered ? " quick-task-recovered" : ""}`}>
      <div className="quick-task-rail">
        <button
          type="button"
          className="quick-task-check"
          onClick={() => onToggle(item.id)}
          aria-label={item.done ? "Mark as not done" : "Mark as done"}
          aria-pressed={item.done}
        >
          <AnimatePresence initial={false}>
            {item.done && (
              <motion.svg
                key="tick"
                className="quick-task-tick"
                viewBox="0 0 12 12"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                aria-hidden="true"
              >
                <motion.path
                  d="M2.4 6.2 L4.9 8.7 L9.6 3.4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  exit={{ pathLength: 0 }}
                  transition={{ duration: 0.32, ease: "easeOut", delay: 0.04 }}
                />
              </motion.svg>
            )}
          </AnimatePresence>
        </button>
      </div>

      {(missed || recovered) && (
        <div className="quick-task-stamp">
          <span>{stamp.month}</span>
          <strong>{stamp.day}</strong>
        </div>
      )}

      <div className="quick-task-body">
        <div className="quick-task-title-row">
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
          ) : (
            <span>In progress</span>
          )}
          {duration && <span>{duration} total</span>}
        </div>
      </div>

      <button
        type="button"
        className="quick-task-delete"
        onClick={() => onRequestDelete({ type: "one", id: item.id, title: item.title })}
        aria-label={`Delete ${item.title}`}
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}

/** Checklist for one workspace (Personal on home, or a dedicated workspace page). */
export default function QuickTasks({ dateKey, workspaceId = DEFAULT_WORKSPACE_ID }) {
  const [draft, setDraft] = useState("");
  const [dueDraft, setDueDraft] = useState("");
  const [dayNow, setDayNow] = useState(todayKey);
  const [deleteRequest, setDeleteRequest] = useState(null);
  const quickTasks = useTaskStore((s) => s.quickTasks);
  const addQuickTask = useTaskStore((s) => s.addQuickTask);
  const toggleQuickTask = useTaskStore((s) => s.toggleQuickTask);
  const deleteQuickTask = useTaskStore((s) => s.deleteQuickTask);
  const spaceId = workspaceId || DEFAULT_WORKSPACE_ID;
  const isWorkspace = spaceId !== DEFAULT_WORKSPACE_ID;

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

  const activeDate = dateKey || dayNow;
  const viewingToday = activeDate === dayNow;
  const dayHasEnded = isBeforeToday(activeDate);

  const dayOpen = useMemo(() => {
    if (dayHasEnded) return [];
    return sortDayItems(scoped.filter((t) => t.dateKey === activeDate && !t.done));
  }, [scoped, activeDate, dayHasEnded]);

  const dayDone = useMemo(
    () => sortDayItems(scoped.filter((t) => belongsToDayDone(t, activeDate))),
    [scoped, activeDate]
  );

  const notCompleted = useMemo(() => {
    if (viewingToday) {
      return scoped
        .filter((t) => !t.done && isBeforeToday(t.dateKey))
        .sort((a, b) => {
          if (a.dateKey === b.dateKey) return a.createdAt < b.createdAt ? 1 : -1;
          return a.dateKey < b.dateKey ? 1 : -1;
        });
    }
    if (dayHasEnded) {
      return sortDayItems(scoped.filter((t) => t.dateKey === activeDate && !t.done));
    }
    return [];
  }, [scoped, viewingToday, dayHasEnded, activeDate]);

  const activeList = [...dayOpen, ...dayDone];
  const canAdd = !dayHasEnded || viewingToday;

  function submit() {
    if (!canAdd) return;
    const target = viewingToday || !dayHasEnded ? activeDate : dayNow;
    const added = addQuickTask({
      title: draft,
      dateKey: target,
      workspaceId: spaceId,
      dueDate: isWorkspace && dueDraft ? dueDraft : null,
    });
    if (added) {
      setDraft("");
      setDueDraft("");
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") {
      setDraft("");
      setDueDraft("");
    }
  }

  function runDelete(request) {
    if (!request) return;
    if (request.type === "clear") {
      dayDone.forEach((t) => deleteQuickTask(t.id));
    } else if (request.id) {
      deleteQuickTask(request.id);
    }
    setDeleteRequest(null);
  }

  return (
    <div className="quick-tasks-stack">
      <section className="quick-tasks" aria-label="Quick tasks for the day">
        <div className="quick-section-head">
          <h2>{viewingToday ? "Today" : formatFriendly(activeDate)}</h2>
          <p>
            {dayHasEnded
              ? "This day has closed. Unfinished items sit in Not completed."
              : isWorkspace
                ? "Tasks in this workspace only. Deadline is optional."
                : "Your everyday checklist. Workspaces keep category lists separate."}
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
                {draft.trim() && (
                  <button type="button" className="quick-tasks-add" onClick={submit}>
                    Add
                  </button>
                )}
              </div>
              {isWorkspace && (
                <div className="quick-tasks-due-row">
                  <label className="quick-tasks-due-field">
                    <CalendarDays size={14} aria-hidden="true" />
                    <span>Expected deadline</span>
                    <input
                      type="date"
                      className="quick-tasks-due-input"
                      value={dueDraft}
                      min={dayNow}
                      onChange={(e) => setDueDraft(e.target.value)}
                      aria-label="Optional expected deadline"
                    />
                  </label>
                  {dueDraft ? (
                    <button
                      type="button"
                      className="quick-tasks-due-clear"
                      onClick={() => setDueDraft("")}
                    >
                      Clear
                    </button>
                  ) : (
                    <span className="quick-tasks-due-hint">Optional</span>
                  )}
                </div>
              )}
            </div>
          )}

          {activeList.length === 0 && !dayHasEnded ? (
            <p className="quick-tasks-empty">Nothing here yet—type above and press Enter.</p>
          ) : activeList.length === 0 && dayHasEnded ? (
            <p className="quick-tasks-empty">
              {notCompleted.length > 0
                ? "Nothing was finished this day—open items are in Not completed below."
                : "Nothing logged for this day."}
            </p>
          ) : (
            <ul className="quick-tasks-list">
              {activeList.map((item) => (
                <QuickTaskRow
                  key={item.id}
                  item={item}
                  onToggle={toggleQuickTask}
                  onRequestDelete={setDeleteRequest}
                />
              ))}
            </ul>
          )}

          {activeList.length > 0 && (
            <div className="quick-tasks-footer">
              <span>
                {dayOpen.length} open{dayDone.length > 0 ? ` · ${dayDone.length} done` : ""}
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

      {(notCompleted.length > 0 || viewingToday) && (
        <section className="quick-missed" aria-label="Not completed">
          <div className="quick-section-head">
            <h2>
              <CircleAlert size={18} />
              Not completed
            </h2>
            <p>
              {viewingToday
                ? "Tasks left open when the day hit 12:00 AM move here automatically."
                : "Left unfinished when this day ended at midnight."}
            </p>
          </div>

          <div className="quick-tasks-panel quick-missed-panel">
            {notCompleted.length === 0 ? (
              <p className="quick-tasks-empty">All clear—nothing carried past midnight.</p>
            ) : (
              <ul className="quick-tasks-list">
                {notCompleted.map((item) => (
                  <QuickTaskRow
                    key={item.id}
                    item={item}
                    missed
                    onToggle={toggleQuickTask}
                    onRequestDelete={setDeleteRequest}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <OnePasswordGate
        open={Boolean(deleteRequest)}
        title={
          deleteRequest?.type === "clear"
            ? "Clear all completed tasks"
            : `Delete “${deleteRequest?.title || "task"}”`
        }
        description="Answer your One Password question to delete this."
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
