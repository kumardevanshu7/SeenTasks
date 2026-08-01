import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CircleAlert, Lock, Trash2, X } from "lucide-react";
import { useTaskStore } from "../store/useTaskStore";
import { formatClock, formatFriendly, formatMonthDay, isBeforeToday, todayKey } from "../lib/date";

const QUICK_LABELS = [
  {
    id: "arigato",
    name: "Arigato",
    tag: "#ari",
    pattern: /#(?:arigato|ari)\b/gi,
    className: "quick-label-arigato",
    rowClass: "quick-task-arigato",
  },
  {
    id: "insta",
    name: "Insta",
    tag: "#insta",
    pattern: /#insta\b/gi,
    className: "quick-label-insta",
    rowClass: "quick-task-insta",
  },
  {
    id: "snap",
    name: "Snap",
    tag: "#snap",
    pattern: /#snap\b/gi,
    className: "quick-label-snap",
    rowClass: "quick-task-snap",
  },
  {
    id: "job",
    name: "Job",
    tag: "#job",
    pattern: /#job\b/gi,
    className: "quick-label-job",
    rowClass: "quick-task-job",
  },
];

const ALL_TAG_PATTERN = /#(?:arigato|ari|insta|snap|job)\b/gi;
const LABEL_DRAG_TYPE = "application/x-quick-label";

function parseQuickLabels(title) {
  const text = title || "";
  return QUICK_LABELS.filter((label) => {
    label.pattern.lastIndex = 0;
    return label.pattern.test(text);
  });
}

function displayQuickTitle(title) {
  const cleaned = (title || "").replace(ALL_TAG_PATTERN, "").replace(/\s{2,}/g, " ").trim();
  return cleaned || title;
}

function labelRank(title) {
  return parseQuickLabels(title).length > 0 ? 0 : 1;
}

function sortDayItems(items) {
  const byCreated = (a, b) => (a.createdAt < b.createdAt ? 1 : -1);
  const byCompleted = (a, b) => (a.completedAt < b.completedAt ? 1 : -1);
  return [
    ...items.filter((t) => !t.done).sort((a, b) => labelRank(a.title) - labelRank(b.title) || byCreated(a, b)),
    ...items.filter((t) => t.done).sort((a, b) => labelRank(a.title) - labelRank(b.title) || byCompleted(a, b)),
  ];
}

function findLabel(id) {
  return QUICK_LABELS.find((l) => l.id === id) || null;
}

function hasLabelDrag(e) {
  const types = [...(e.dataTransfer?.types || [])];
  return types.includes(LABEL_DRAG_TYPE) || types.includes("text/plain");
}

function readLabelDrag(e) {
  return e.dataTransfer.getData(LABEL_DRAG_TYPE) || e.dataTransfer.getData("text/plain");
}

function appendTagToDraft(draft, label) {
  label.pattern.lastIndex = 0;
  if (label.pattern.test(draft || "")) return draft;
  return `${(draft || "").trim()} ${label.tag}`.trim();
}

function QuickLabelTray({ onPick, onDragStart, onDragEnd }) {
  return (
    <div className="quick-label-tray" aria-label="Quick labels">
      <p className="quick-label-tray-hint">Drag a label onto a task — or tap to add it in the box</p>
      <div className="quick-label-tray-row">
        {QUICK_LABELS.map((label) => (
          <button
            key={label.id}
            type="button"
            className={`quick-label quick-label-chip ${label.className}`}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(LABEL_DRAG_TYPE, label.id);
              e.dataTransfer.setData("text/plain", label.id);
              e.dataTransfer.effectAllowed = "copy";
              onDragStart?.();
            }}
            onDragEnd={() => onDragEnd?.()}
            onClick={() => onPick(label)}
            title={`Drag onto a task, or click to insert ${label.tag}`}
          >
            {label.name}
            <span>{label.tag}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function QuickTaskRow({ item, missed = false, onToggle, onRequestDelete, onDropLabel, dragActive }) {
  const [over, setOver] = useState(false);
  const started = formatClock(item.createdAt);
  const ended = item.done ? formatClock(item.completedAt) : null;
  const stamp = formatMonthDay(item.dateKey);
  const labels = parseQuickLabels(item.title);
  const title = displayQuickTitle(item.title);
  const rowExtras = labels.map((l) => l.rowClass).join(" ");

  function handleDragOver(e) {
    if (!hasLabelDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setOver(true);
  }

  function handleDrop(e) {
    e.preventDefault();
    setOver(false);
    const label = findLabel(readLabelDrag(e));
    if (label) onDropLabel(item.id, label);
  }

  return (
    <li
      className={`quick-task-row${item.done ? " quick-task-done" : ""}${missed ? " quick-task-missed" : ""}${rowExtras ? ` ${rowExtras}` : ""}${over ? " quick-task-drop-target" : ""}${dragActive ? " quick-task-drop-ready" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
    >
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

      {missed && (
        <div className="quick-task-stamp">
          <span>{stamp.month}</span>
          <strong>{stamp.day}</strong>
        </div>
      )}

      <div className="quick-task-body">
        <div className="quick-task-title-row">
          {labels.map((label) => (
            <span key={label.id} className={`quick-label ${label.className}`}>{label.name}</span>
          ))}
          <span className="quick-task-title">{title}</span>
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

function DeletePasswordModal({ request, savedPassword, onClose, onConfirm, onSetPassword }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const needsSetup = !savedPassword;
  const label = request.type === "clear"
    ? "Clear all completed tasks"
    : `Delete “${request.title}”`;

  function handleSubmit(e) {
    e.preventDefault();
    const value = password.trim();
    if (!value) {
      setError("Enter a password.");
      return;
    }

    if (needsSetup) {
      if (value.length < 4) {
        setError("Use at least 4 characters.");
        return;
      }
      if (value !== confirm.trim()) {
        setError("Passwords do not match.");
        return;
      }
      onSetPassword(value);
      onConfirm(request);
      return;
    }

    if (value !== savedPassword) {
      setError("Wrong password.");
      return;
    }
    onConfirm(request);
  }

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.form
        className="quick-delete-modal"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="quick-delete-head">
          <span className="heading-icon"><Lock size={18} /></span>
          <div>
            <p className="eyebrow">{needsSetup ? "Set delete password" : "Password required"}</p>
            <h2>{label}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="quick-delete-body">
          <p>
            {needsSetup
              ? "Create a password you’ll use before deleting quick tasks. Stored only on this device."
              : "Enter your delete password to continue."}
          </p>
          <label>
            Password
            <input
              className="text-input"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              autoFocus
              autoComplete="current-password"
            />
          </label>
          {needsSetup && (
            <label>
              Confirm password
              <input
                className="text-input"
                type="password"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError(""); }}
                autoComplete="new-password"
              />
            </label>
          )}
          {error && <p className="quick-delete-error">{error}</p>}
        </div>

        <div className="quick-delete-footer">
          <button type="button" className="button button-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="button button-primary">
            {needsSetup ? "Set & delete" : "Delete"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

export default function QuickTasks({ dateKey }) {
  const [draft, setDraft] = useState("");
  const [dayNow, setDayNow] = useState(todayKey);
  const [deleteRequest, setDeleteRequest] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [inputOver, setInputOver] = useState(false);
  const quickTasks = useTaskStore((s) => s.quickTasks);
  const addQuickTask = useTaskStore((s) => s.addQuickTask);
  const toggleQuickTask = useTaskStore((s) => s.toggleQuickTask);
  const deleteQuickTask = useTaskStore((s) => s.deleteQuickTask);
  const applyQuickLabel = useTaskStore((s) => s.applyQuickLabel);
  const savedPassword = useTaskStore((s) => s.quickDeletePassword);
  const setQuickDeletePassword = useTaskStore((s) => s.setQuickDeletePassword);

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

  const activeDate = dateKey || dayNow;
  const viewingToday = activeDate === dayNow;
  const dayHasEnded = isBeforeToday(activeDate);

  const dayOpen = useMemo(() => {
    if (dayHasEnded) return [];
    return sortDayItems(quickTasks.filter((t) => t.dateKey === activeDate && !t.done));
  }, [quickTasks, activeDate, dayHasEnded]);

  const dayDone = useMemo(
    () => sortDayItems(quickTasks.filter((t) => t.dateKey === activeDate && t.done)),
    [quickTasks, activeDate]
  );

  const notCompleted = useMemo(() => {
    if (viewingToday) {
      return quickTasks
        .filter((t) => !t.done && isBeforeToday(t.dateKey))
        .sort((a, b) => {
          const arA = labelRank(a.title);
          const arB = labelRank(b.title);
          if (arA !== arB) return arA - arB;
          if (a.dateKey === b.dateKey) return a.createdAt < b.createdAt ? 1 : -1;
          return a.dateKey < b.dateKey ? 1 : -1;
        });
    }
    if (dayHasEnded) {
      return sortDayItems(quickTasks.filter((t) => t.dateKey === activeDate && !t.done));
    }
    return [];
  }, [quickTasks, viewingToday, dayHasEnded, activeDate]);

  const activeList = [...dayOpen, ...dayDone];
  const canAdd = !dayHasEnded || viewingToday;

  function submit() {
    if (!canAdd) return;
    const target = viewingToday || !dayHasEnded ? activeDate : dayNow;
    const added = addQuickTask({ title: draft, dateKey: target });
    if (added) setDraft("");
  }

  function onKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") {
      setDraft("");
    }
  }

  function runDelete(request) {
    if (request.type === "clear") {
      dayDone.forEach((t) => deleteQuickTask(t.id));
    } else {
      deleteQuickTask(request.id);
    }
    setDeleteRequest(null);
  }

  function dropLabelOnTask(taskId, label) {
    applyQuickLabel(taskId, label.tag, label.pattern);
  }

  function pickLabelForDraft(label) {
    setDraft((prev) => appendTagToDraft(prev, label));
  }

  function onLabelDragStart() {
    setDragActive(true);
  }

  function onLabelDragEnd() {
    setDragActive(false);
    setInputOver(false);
  }

  return (
    <div
      className="quick-tasks-stack"
      onDragEnd={onLabelDragEnd}
      onDrop={onLabelDragEnd}
    >
      <QuickLabelTray
        onPick={pickLabelForDraft}
        onDragStart={onLabelDragStart}
        onDragEnd={onLabelDragEnd}
      />

      <section className="quick-tasks" aria-label="Quick tasks for the day">
        <div className="quick-section-head">
          <h2>{viewingToday ? "Today" : formatFriendly(activeDate)}</h2>
          <p>
            {dayHasEnded
              ? "This day has closed. Unfinished items sit in Not completed."
              : "Add small things, tick them off. Started and ended times stay with each task."}
          </p>
        </div>

        <div className="quick-tasks-panel">
          {canAdd && (
            <div
              className={`quick-tasks-input-row${inputOver ? " quick-tasks-input-drop" : ""}`}
              onDragOver={(e) => {
                if (!hasLabelDrag(e)) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
                setInputOver(true);
              }}
              onDragLeave={() => setInputOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setInputOver(false);
                const label = findLabel(readLabelDrag(e));
                if (label) pickLabelForDraft(label);
                onLabelDragEnd();
              }}
            >
              <span className="quick-tasks-input-mark" aria-hidden="true" />
              <input
                className="quick-tasks-input"
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Add a quick task — or drop a label here"
                aria-label="Add a quick task"
                maxLength={200}
              />
              {draft.trim() && (
                <button type="button" className="quick-tasks-add" onClick={submit}>
                  Add
                </button>
              )}
            </div>
          )}

          {activeList.length === 0 && !dayHasEnded ? (
            <p className="quick-tasks-empty">
              Nothing here yet—type above and press Enter. No AI, just a checklist.
            </p>
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
                    onDropLabel={dropLabelOnTask}
                    dragActive={dragActive}
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
                      onDropLabel={dropLabelOnTask}
                      dragActive={dragActive}
                    />
                  ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <AnimatePresence>
        {deleteRequest && (
          <DeletePasswordModal
            request={deleteRequest}
            savedPassword={savedPassword}
            onClose={() => setDeleteRequest(null)}
            onConfirm={runDelete}
            onSetPassword={setQuickDeletePassword}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
