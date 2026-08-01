import { motion } from "framer-motion";
import { Check, Heart, RotateCcw, Sparkles, Trash2, Undo2, UserRound } from "lucide-react";
import { CATEGORY_META, CATEGORIES } from "../lib/aiAnalyzer";
import { getIterationStyle } from "../lib/iterationTheme";
import { daysBetween } from "../lib/date";
import { setAssignedStatus } from "../lib/collabService";
import { useTaskStore } from "../store/useTaskStore";

export default function TaskCard({ task, variant = "board", onRequestDeleteForever }) {
  const completeTask = useTaskStore((s) => s.completeTask);
  const reopenTask = useTaskStore((s) => s.reopenTask);
  const abortTask = useTaskStore((s) => s.abortTask);
  const restoreFromBin = useTaskStore((s) => s.restoreFromBin);
  const deleteForever = useTaskStore((s) => s.deleteForever);

  const meta = CATEGORY_META[task.category] || CATEGORY_META[CATEGORIES.SECOND];
  const delayDays = daysBetween(task.firstDateKey || task.dateKey, task.dateKey);
  const iteration = getIterationStyle(delayDays);
  const isBin = variant === "bin";
  const isAssigned = task.origin === "assigned";
  const isCompleted = task.status === "completed";

  function toggleComplete() {
    if (isAssigned) {
      setAssignedStatus(task.id, isCompleted ? "active" : "completed");
    } else if (isCompleted) {
      reopenTask(task.id);
    } else {
      completeTask(task.id);
    }
  }

  function handleDeleteForever() {
    if (onRequestDeleteForever) onRequestDeleteForever(task);
    else deleteForever(task.id);
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={`task-card${isCompleted ? " task-card-completed" : ""}${iteration.label ? " task-card-aged" : ""}`}
      style={{
        "--priority-color": meta.color,
        "--iteration-bg": iteration.bg || "transparent",
        "--iteration-border": iteration.borderColor || "var(--hairline)",
        boxShadow: iteration.glow,
      }}
    >
      {!isBin && (
        <button
          className="task-check"
          onClick={toggleComplete}
          aria-label={isCompleted ? "Reopen task" : "Complete task"}
        >
          {isCompleted && <Check size={14} />}
        </button>
      )}

      <div className="task-content">
        <div className="task-meta">
          <span className="badge" style={{ color: meta.color }}>{meta.label}</span>
          {task.isBinTask && <span className="badge badge-neutral">Bin task</span>}
          {iteration.label && <span className="badge badge-aged">{iteration.label}</span>}
          {task.analysisSource && <span className="badge badge-ai">{task.analysisSource === "openrouter" ? "AI considered" : "Local fallback"}</span>}
          {isAssigned && <span className="task-assignee"><UserRound size={12} /> from @{task.fromUsername}</span>}
        </div>
        <h4>{task.title}</h4>
        {task.description && <p className="task-description">{task.description}</p>}
        <p className="ai-reason"><Sparkles size={13} /><span>{task.reasoning}</span></p>
        {task.wellbeingNote && <p className="wellbeing-note"><Heart size={12} /><span>{task.wellbeingNote}</span></p>}
      </div>

      <div className="task-actions">
        {isBin ? (
          <>
            <button className="icon-button" onClick={() => restoreFromBin(task.id)} title="Restore to today"><Undo2 size={16} /></button>
            <button className="icon-button icon-button-danger" onClick={handleDeleteForever} title="Delete forever"><Trash2 size={16} /></button>
          </>
        ) : isAssigned ? (
          isCompleted && <button className="icon-button" onClick={toggleComplete} title="Reopen"><RotateCcw size={15} /></button>
        ) : (
          <>
            {isCompleted && <button className="icon-button" onClick={() => reopenTask(task.id)} title="Reopen"><RotateCcw size={15} /></button>}
            <button className="icon-button icon-button-danger" onClick={() => abortTask(task.id)} title="Move to abort bin"><Trash2 size={15} /></button>
          </>
        )}
      </div>
    </motion.article>
  );
}
