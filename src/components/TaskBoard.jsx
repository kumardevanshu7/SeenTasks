import { AnimatePresence, motion } from "framer-motion";
import { Plus, Sparkles } from "lucide-react";
import { useTaskStore } from "../store/useTaskStore";
import { CATEGORIES, CATEGORY_META } from "../lib/aiAnalyzer";
import { todayKey } from "../lib/date";
import TaskCard from "./TaskCard";

const ORDER = [CATEGORIES.DANGER, CATEGORIES.FIRST, CATEGORIES.SECOND, CATEGORIES.ENDOFDAY, CATEGORIES.TOMORROW];

export default function TaskBoard({ dateKey }) {
  const tasks = useTaskStore((s) => s.tasks);
  const activeDate = dateKey || todayKey();
  const todayTasks = tasks.filter((task) => task.dateKey === activeDate && task.status !== "aborted");
  const grouped = ORDER.map((category) => ({
    category,
    items: todayTasks
      .filter((task) => task.category === category)
      .sort((a, b) => Number(a.status === "completed") - Number(b.status === "completed")),
  }));

  if (todayTasks.length === 0) {
    return (
      <motion.section className="empty-state" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <span className="empty-mark">✣</span>
        <p className="eyebrow">A clear beginning</p>
        <h2>Your day is still unwritten.</h2>
        <p>Add what is on your mind. The priority guide will help decide what deserves today—and what can wait.</p>
        <button className="button button-cream" onClick={() => window.dispatchEvent(new CustomEvent("open-task-composer"))}>
          <Plus size={17} /> Add your first task
        </button>
      </motion.section>
    );
  }

  return (
    <section className="task-board" aria-label="Tasks grouped by priority">
      <div className="board-heading">
        <div><p className="eyebrow">Your considered plan</p><h2>{activeDate === todayKey() ? "Today’s priorities" : "Priorities for this day"}</h2></div>
        <span><Sparkles size={15} /> AI-guided order</span>
      </div>

      <div className="priority-list">
        {grouped.filter(({ category, items }) => category !== CATEGORIES.DANGER || items.length > 0).map(({ category, items }) => {
          const meta = CATEGORY_META[category];
          return (
            <section className={`priority-group priority-${category}`} key={category}>
              <header className="priority-header">
                <span className="priority-dot" style={{ backgroundColor: meta.color }} />
                <div><h3>{meta.label}</h3><p>{meta.description}</p></div>
                <strong>{items.length}</strong>
              </header>
              <div className="task-list">
                <AnimatePresence mode="popLayout">
                  {items.map((task) => <TaskCard key={task.id} task={task} />)}
                </AnimatePresence>
                {items.length === 0 && <p className="category-empty">Nothing needs this space right now.</p>}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
