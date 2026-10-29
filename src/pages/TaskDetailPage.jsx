import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  FileEdit,
  FileText,
  Folder,
  Layers,
  List,
  ListOrdered,
  ListTodo,
  Plus,
  Quote,
  RotateCcw,
  Sparkles,
  Tag,
  Trash2,
  X,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  Strikethrough,
  Minus,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useTaskStore } from "../store/useTaskStore";
import { DEFAULT_WORKSPACE_ID, labelColorInk, workspaceColorInk } from "../lib/quickTaskService";
import { formatDateTime, formatFriendly, todayKey, toKey, addDaysToKey } from "../lib/date";
import { playTickSound, triggerConfetti } from "../lib/audioConfetti";

export default function TaskDetailPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();

  const quickTasks = useTaskStore((s) => s.quickTasks);
  const tasks = useTaskStore((s) => s.tasks);
  const quickLabels = useTaskStore((s) => s.quickLabels);
  const quickWorkspaces = useTaskStore((s) => s.quickWorkspaces);
  const updateQuickTask = useTaskStore((s) => s.updateQuickTask);
  const toggleQuickTask = useTaskStore((s) => s.toggleQuickTask);
  const deleteQuickTask = useTaskStore((s) => s.deleteQuickTask);
  const addQuickTaskLabel = useTaskStore((s) => s.addQuickTaskLabel);
  const removeQuickTaskLabel = useTaskStore((s) => s.removeQuickTaskLabel);
  const addSubtask = useTaskStore((s) => s.addSubtask);
  const toggleSubtask = useTaskStore((s) => s.toggleSubtask);
  const deleteSubtask = useTaskStore((s) => s.deleteSubtask);
  const soundEnabled = useTaskStore((s) => s.soundEnabled);

  // Match either quickTasks (primary) or tasks (board)
  const task = useMemo(() => {
    return (quickTasks || []).find((t) => t.id === taskId) ||
      (tasks || []).find((t) => t.id === taskId) || null;
  }, [quickTasks, tasks, taskId]);

  const [titleDraft, setTitleDraft] = useState("");
  const [descDraft, setDescDraft] = useState("");
  const [activeTab, setActiveTab] = useState("write"); // "write" | "preview"
  const [saveStatus, setSaveStatus] = useState("saved"); // "saved" | "saving"
  const [copiedLink, setCopiedLink] = useState(false);
  const [newSubText, setNewSubText] = useState("");
  const [labelPickerOpen, setLabelPickerOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const textareaRef = useRef(null);
  const titleTextareaRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const labelPickerRef = useRef(null);

  // Sync state when task loads
  useEffect(() => {
    if (task) {
      setTitleDraft(task.title || "");
      setDescDraft(task.description || "");
    }
  }, [task?.id]);

  // Close label picker on outside click
  useEffect(() => {
    if (!labelPickerOpen) return;
    function onDocClick(e) {
      if (labelPickerRef.current && !labelPickerRef.current.contains(e.target)) {
        setLabelPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [labelPickerOpen]);

  // Auto-resize title textarea
  useEffect(() => {
    if (titleTextareaRef.current) {
      titleTextareaRef.current.style.height = "auto";
      titleTextareaRef.current.style.height = `${titleTextareaRef.current.scrollHeight}px`;
    }
  }, [titleDraft]);

  // Debounced auto-save for description
  function handleDescChange(val) {
    setDescDraft(val);
    setSaveStatus("saving");

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (task?.id) {
        updateQuickTask(task.id, { description: val });
        setSaveStatus("saved");
      }
    }, 400);
  }

  // Handle title blur / commit
  function handleTitleBlur() {
    const clean = titleDraft.trim();
    if (!clean || !task?.id || clean === task.title) return;
    updateQuickTask(task.id, { title: clean });
  }

  // Markdown toolbar insertion helper
  function insertMarkdown(prefix, suffix = "", defaultText = "") {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;
    const selectedText = currentVal.substring(start, end) || defaultText;

    const nextVal =
      currentVal.substring(0, start) +
      prefix +
      selectedText +
      suffix +
      currentVal.substring(end);

    handleDescChange(nextVal);

    setTimeout(() => {
      textarea.focus();
      const newCursor = start + prefix.length + selectedText.length;
      textarea.setSelectionRange(newCursor, newCursor);
    }, 10);
  }

  // Workspace and labels lookups
  const workspacesById = useMemo(() => {
    const map = {};
    (quickWorkspaces || []).forEach((w) => {
      map[w.id] = w;
    });
    return map;
  }, [quickWorkspaces]);

  const labelsById = useMemo(() => {
    const map = {};
    (quickLabels || []).forEach((l) => {
      map[l.id] = l;
    });
    return map;
  }, [quickLabels]);

  if (!task) {
    return (
      <div className="page narrow-page page-task-detail">
        <div className="task-detail-not-found">
          <h2>Task not found</h2>
          <p>This task may have been deleted or moved.</p>
          <button
            type="button"
            className="button button-primary"
            onClick={() => navigate("/app")}
          >
            <ArrowLeft size={15} /> Back to tasks
          </button>
        </div>
      </div>
    );
  }

  const ws = workspacesById[task.workspaceId || DEFAULT_WORKSPACE_ID] || {
    id: DEFAULT_WORKSPACE_ID,
    name: "Personal",
    color: "#e8e1d6",
  };
  const wsInk = workspaceColorInk(ws.color);

  const taskLabelIds = Array.isArray(task.labelIds) && task.labelIds.length > 0
    ? task.labelIds
    : task.labelId
      ? [task.labelId]
      : [];
  const assignedLabels = taskLabelIds.map((id) => labelsById[id]).filter(Boolean);
  const unassignedLabels = (quickLabels || []).filter((l) => !taskLabelIds.includes(l.id));

  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  const doneSubCount = subtasks.filter((s) => s.done).length;
  const isCompleted = Boolean(task.done);

  function handleToggleComplete() {
    toggleQuickTask(task.id);
    if (!isCompleted) {
      if (soundEnabled) playTickSound();
      triggerConfetti();
    }
  }

  function handleAddSubtask() {
    const clean = newSubText.trim();
    if (!clean) return;
    addSubtask(task.id, clean);
    setNewSubText("");
    if (soundEnabled) playTickSound();
  }

  function handleCopyLink() {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  }

  function handleDeleteTask() {
    deleteQuickTask(task.id);
    navigate(-1);
  }

  function handleDueDateChange(newDate) {
    updateQuickTask(task.id, { dueDate: newDate || null });
  }

  function handleWorkspaceChange(newWsId) {
    updateQuickTask(task.id, { workspaceId: newWsId });
  }

  return (
    <div className="page narrow-page page-task-detail">
      {/* ── Top Header Bar ─────────────────────────────────────────── */}
      <div className="task-detail-nav">
        <button
          type="button"
          className="task-detail-back-btn"
          onClick={() => navigate(-1)}
          aria-label="Back to tasks"
        >
          <ArrowLeft size={16} />
          <span>Back to tasks</span>
        </button>

        <div className="task-detail-nav-actions">
          {/* Real-time Save status indicator */}
          <span className={`task-detail-save-indicator is-${saveStatus}`}>
            {saveStatus === "saving" ? "Saving..." : "Saved"}
          </span>

          {/* Copy link */}
          <button
            type="button"
            className="task-detail-icon-btn"
            onClick={handleCopyLink}
            title={copiedLink ? "Link copied!" : "Copy link to this page"}
          >
            {copiedLink ? <Check size={14} className="is-success" /> : <Copy size={14} />}
            <span className="task-detail-btn-text">{copiedLink ? "Copied" : "Share"}</span>
          </button>

          {/* Complete toggle */}
          <button
            type="button"
            className={`task-detail-status-btn${isCompleted ? " is-completed" : ""}`}
            onClick={handleToggleComplete}
            title={isCompleted ? "Reopen task" : "Mark as completed"}
          >
            {isCompleted ? <CheckCircle2 size={15} /> : <div className="task-detail-status-circle" />}
            <span>{isCompleted ? "Completed" : "Mark Done"}</span>
          </button>

          {/* Delete task */}
          <button
            type="button"
            className="task-detail-icon-btn is-danger"
            onClick={() => setDeleteConfirmOpen(true)}
            title="Delete task"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="modal-backdrop" onClick={() => setDeleteConfirmOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-pill is-warning">Confirm deletion</span>
              <button
                type="button"
                className="icon-button"
                onClick={() => setDeleteConfirmOpen(false)}
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this task and its description?</p>
              <strong style={{ color: "var(--ink)", display: "block", marginTop: 8 }}>
                {task.title}
              </strong>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="button button-ghost"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button button-danger"
                onClick={handleDeleteTask}
              >
                Delete task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Notion-Style Page Canvas ───────────────────────────────── */}
      <article className="task-detail-canvas">
        {/* Workspace and Status Banner */}
        <div className="task-detail-banner-row">
          <span
            className="task-detail-ws-badge"
            style={{
              "--ws-color": ws.color,
              "--ws-ink": wsInk,
            }}
          >
            <Folder size={12} />
            <span>{ws.name}</span>
          </span>

          <span className={`task-detail-state-pill${isCompleted ? " is-done" : " is-active"}`}>
            {isCompleted ? "Done" : "In progress"}
          </span>
        </div>

        {/* Large Editable Title */}
        <div className="task-detail-title-wrap">
          <textarea
            ref={titleTextareaRef}
            className="task-detail-title-input"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="Untitled task..."
            rows={1}
            aria-label="Task title"
          />
        </div>

        {/* ── Notion-Style Properties Table ──────────────────────────── */}
        <div className="task-detail-properties" aria-label="Task properties">
          {/* Status Property */}
          <div className="task-prop-row">
            <span className="task-prop-label">
              <CheckCircle2 size={13} /> Status
            </span>
            <div className="task-prop-value">
              <button
                type="button"
                className={`task-prop-status-pill${isCompleted ? " is-done" : ""}`}
                onClick={handleToggleComplete}
              >
                <span className="task-prop-dot" />
                {isCompleted ? "Completed" : "In progress"}
              </button>
            </div>
          </div>

          {/* Due Date Property */}
          <div className="task-prop-row">
            <span className="task-prop-label">
              <CalendarDays size={13} /> Due date
            </span>
            <div className="task-prop-value task-prop-date-val">
              <input
                type="date"
                className="task-prop-date-input"
                value={task.dueDate || ""}
                onChange={(e) => handleDueDateChange(e.target.value)}
              />
              {task.dueDate ? (
                <>
                  <span className="task-prop-friendly-date">
                    {formatFriendly(task.dueDate)}
                  </span>
                  <button
                    type="button"
                    className="task-prop-clear-btn"
                    onClick={() => handleDueDateChange("")}
                    title="Clear due date"
                  >
                    <X size={11} />
                  </button>
                </>
              ) : (
                <div className="task-prop-quick-dates">
                  <button
                    type="button"
                    className="task-prop-quick-btn"
                    onClick={() => handleDueDateChange(todayKey())}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    className="task-prop-quick-btn"
                    onClick={() => handleDueDateChange(addDaysToKey(todayKey(), 1))}
                  >
                    Tomorrow
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Workspace Property */}
          <div className="task-prop-row">
            <span className="task-prop-label">
              <Folder size={13} /> Workspace
            </span>
            <div className="task-prop-value">
              <select
                className="task-prop-select"
                value={task.workspaceId || DEFAULT_WORKSPACE_ID}
                onChange={(e) => handleWorkspaceChange(e.target.value)}
              >
                <option value={DEFAULT_WORKSPACE_ID}>Personal</option>
                {(quickWorkspaces || [])
                  .filter((w) => w.id !== DEFAULT_WORKSPACE_ID)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Labels Property */}
          <div className="task-prop-row">
            <span className="task-prop-label">
              <Tag size={13} /> Labels
            </span>
            <div className="task-prop-value task-prop-labels-val" ref={labelPickerRef}>
              {assignedLabels.map((l) => (
                <span
                  key={l.id}
                  className="quick-task-label-chip"
                  style={{
                    "--label-bg": l.color,
                    "--label-ink": labelColorInk(l.color),
                  }}
                >
                  {l.name}
                  <button
                    type="button"
                    className="task-prop-label-del"
                    onClick={() => removeQuickTaskLabel(task.id, l.id)}
                    title="Remove label"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}

              <button
                type="button"
                className="task-prop-add-label-btn"
                onClick={() => setLabelPickerOpen((v) => !v)}
              >
                <Plus size={11} />
                <span>Add label</span>
              </button>

              {labelPickerOpen && (
                <div className="task-label-picker-menu">
                  <div className="task-label-picker-head">Select label</div>
                  {unassignedLabels.length === 0 ? (
                    <div className="task-label-picker-empty">No other labels available</div>
                  ) : (
                    <ul className="task-label-picker-list">
                      {unassignedLabels.map((l) => (
                        <li key={l.id}>
                          <button
                            type="button"
                            className="task-label-picker-item"
                            onClick={() => {
                              addQuickTaskLabel(task.id, l.id);
                              setLabelPickerOpen(false);
                            }}
                          >
                            <span
                              className="task-label-picker-dot"
                              style={{ background: l.color }}
                            />
                            <span>{l.name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Created Date Property */}
          {task.createdAt && (
            <div className="task-prop-row">
              <span className="task-prop-label">
                <Clock size={13} /> Created
              </span>
              <div className="task-prop-value task-prop-text">
                {formatDateTime(task.createdAt)}
              </div>
            </div>
          )}
        </div>

        <div className="task-detail-divider" />

        {/* ── Micro-steps / Checklist Section ────────────────────────── */}
        <section className="task-detail-section" aria-label="Micro-steps">
          <div className="task-detail-section-head">
            <h3>
              <ListTodo size={15} />
              <span>Micro-steps</span>
              {subtasks.length > 0 && (
                <span className="task-detail-badge">
                  {doneSubCount}/{subtasks.length}
                </span>
              )}
            </h3>
          </div>

          {subtasks.length > 0 && (
            <ul className="task-detail-subtasks-list">
              {subtasks.map((st) => (
                <li key={st.id} className={`task-detail-subtask-item${st.done ? " is-done" : ""}`}>
                  <button
                    type="button"
                    className={`task-detail-subtask-check${st.done ? " is-checked" : ""}`}
                    onClick={() => toggleSubtask(task.id, st.id)}
                    aria-label={st.done ? "Mark step not done" : "Mark step done"}
                  >
                    {st.done && <Check size={11} strokeWidth={3} />}
                  </button>
                  <span className="task-detail-subtask-text">{st.text}</span>
                  <button
                    type="button"
                    className="task-detail-subtask-del"
                    onClick={() => deleteSubtask(task.id, st.id)}
                    title="Delete step"
                  >
                    <X size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="task-detail-subtask-composer">
            <input
              type="text"
              className="task-detail-subtask-input"
              placeholder="Add micro-step (press Enter)..."
              value={newSubText}
              onChange={(e) => setNewSubText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddSubtask();
                }
              }}
            />
            {newSubText.trim() && (
              <button
                type="button"
                className="task-detail-subtask-add-btn"
                onClick={handleAddSubtask}
              >
                Add
              </button>
            )}
          </div>
        </section>

        <div className="task-detail-divider" />

        {/* ── Notion-Style Description & Notes Section ───────────────── */}
        <section className="task-detail-section" aria-label="Description and notes">
          <div className="task-detail-desc-head">
            <div className="task-detail-section-title">
              <FileText size={16} />
              <h3>Description & Details</h3>
              <span className="task-detail-hint">Markdown supported</span>
            </div>

            {/* Tab switch between Write and Preview */}
            <div className="task-detail-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "write"}
                className={`task-detail-tab-btn${activeTab === "write" ? " is-active" : ""}`}
                onClick={() => setActiveTab("write")}
              >
                <FileEdit size={13} />
                <span>Write</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "preview"}
                className={`task-detail-tab-btn${activeTab === "preview" ? " is-active" : ""}`}
                onClick={() => setActiveTab("preview")}
              >
                <Eye size={13} />
                <span>Preview</span>
              </button>
            </div>
          </div>

          {activeTab === "write" ? (
            <div className="task-desc-editor">
              {/* Markdown Quick Toolbar */}
              <div className="task-desc-toolbar" role="toolbar" aria-label="Formatting options">
                <button
                  type="button"
                  className="task-toolbar-btn"
                  onClick={() => insertMarkdown("**", "**", "bold text")}
                  title="Bold (Ctrl+B)"
                >
                  <Bold size={13} />
                </button>
                <button
                  type="button"
                  className="task-toolbar-btn"
                  onClick={() => insertMarkdown("*", "*", "italic text")}
                  title="Italic (Ctrl+I)"
                >
                  <Italic size={13} />
                </button>
                <button
                  type="button"
                  className="task-toolbar-btn"
                  onClick={() => insertMarkdown("~~", "~~", "strikethrough")}
                  title="Strikethrough"
                >
                  <Strikethrough size={13} />
                </button>
                <span className="task-toolbar-sep" />
                <button
                  type="button"
                  className="task-toolbar-btn"
                  onClick={() => insertMarkdown("# ", "", "Heading 1")}
                  title="Heading 1"
                >
                  <Heading1 size={13} />
                </button>
                <button
                  type="button"
                  className="task-toolbar-btn"
                  onClick={() => insertMarkdown("## ", "", "Heading 2")}
                  title="Heading 2"
                >
                  <Heading2 size={13} />
                </button>
                <button
                  type="button"
                  className="task-toolbar-btn"
                  onClick={() => insertMarkdown("### ", "", "Heading 3")}
                  title="Heading 3"
                >
                  <Heading3 size={13} />
                </button>
                <span className="task-toolbar-sep" />
                <button
                  type="button"
                  className="task-toolbar-btn"
                  onClick={() => insertMarkdown("- ", "", "List item")}
                  title="Bulleted list"
                >
                  <List size={13} />
                </button>
                <button
                  type="button"
                  className="task-toolbar-btn"
                  onClick={() => insertMarkdown("1. ", "", "Ordered item")}
                  title="Numbered list"
                >
                  <ListOrdered size={13} />
                </button>
                <button
                  type="button"
                  className="task-toolbar-btn"
                  onClick={() => insertMarkdown("- [ ] ", "", "Todo item")}
                  title="Checklist item"
                >
                  <ListTodo size={13} />
                </button>
                <span className="task-toolbar-sep" />
                <button
                  type="button"
                  className="task-toolbar-btn"
                  onClick={() => insertMarkdown("> ", "", "Quote")}
                  title="Quote"
                >
                  <Quote size={13} />
                </button>
                <button
                  type="button"
                  className="task-toolbar-btn"
                  onClick={() => insertMarkdown("`", "`", "code")}
                  title="Inline code"
                >
                  <Code size={13} />
                </button>
                <button
                  type="button"
                  className="task-toolbar-btn"
                  onClick={() => insertMarkdown("\n```\n", "\n```\n", "code block")}
                  title="Code block"
                >
                  {"{ }"}
                </button>
                <button
                  type="button"
                  className="task-toolbar-btn"
                  onClick={() => insertMarkdown("[", "](https://example.com)", "link title")}
                  title="Hyperlink"
                >
                  Link
                </button>
                <button
                  type="button"
                  className="task-toolbar-btn"
                  onClick={() => insertMarkdown("\n---\n", "", "")}
                  title="Divider"
                >
                  <Minus size={13} />
                </button>
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                className="task-desc-textarea"
                value={descDraft}
                onChange={(e) => handleDescChange(e.target.value)}
                placeholder="Write task details, instructions, references, or notes here... (Notion-style, Markdown supported)&#10;&#10;e.g.&#10;• What needs to be done&#10;• Step-by-step guidance&#10;• Useful URLs or code snippets"
                rows={12}
                aria-label="Task description"
              />
            </div>
          ) : (
            <div className="task-desc-preview">
              {descDraft.trim() ? (
                <div className="task-markdown-content">
                  <ReactMarkdown>{descDraft}</ReactMarkdown>
                </div>
              ) : (
                <div className="task-desc-empty">
                  <p>No description written yet.</p>
                  <button
                    type="button"
                    className="button button-ghost"
                    onClick={() => setActiveTab("write")}
                  >
                    <Plus size={14} /> Write description
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </article>
    </div>
  );
}
