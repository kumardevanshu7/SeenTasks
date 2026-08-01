import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Plus, Sparkles } from "lucide-react";
import TaskBoard from "../components/TaskBoard";
import AddTaskModal from "../components/AddTaskModal";
import RecallButton from "../components/RecallButton";
import DateStrip from "../components/DateStrip";
import { formatFriendly, todayKey } from "../lib/date";
import { useTaskStore } from "../store/useTaskStore";

export default function TodayPage() {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const tasks = useTaskStore((s) => s.tasks);
  const isToday = selectedDate === todayKey();

  const dayTasks = useMemo(
    () => tasks.filter((task) => task.dateKey === selectedDate && task.status !== "aborted"),
    [tasks, selectedDate]
  );
  const completed = dayTasks.filter((task) => task.status === "completed").length;
  const active = dayTasks.length - completed;

  useEffect(() => {
    const showComposer = () => { setSelectedDate(todayKey()); setOpen(true); };
    window.addEventListener("open-task-composer", showComposer);
    return () => window.removeEventListener("open-task-composer", showComposer);
  }, []);

  return (
    <div className="page page-today">
      <section className="page-hero">
        <div>
          <p className="eyebrow">{formatFriendly(selectedDate)}</p>
          <h1>{isToday ? <>Make room for<br />what matters today.</> : <>A look at<br />your chosen day.</>}</h1>
          <p className="hero-copy">A calm, human plan for your day—prioritized by urgency, energy, and future well-being.</p>
        </div>
        <div className="hero-actions">
          <RecallButton />
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setOpen(true)} className="button button-primary">
            <Plus size={17} /> Add task
          </motion.button>
        </div>
      </section>

      <DateStrip selected={selectedDate} onSelect={setSelectedDate} range={14} instantScroll />

      <section className="day-summary" aria-label="Day progress">
        <div className="summary-item"><Circle size={18} /><span><strong>{active}</strong> still open</span></div>
        <div className="summary-item"><CheckCircle2 size={18} /><span><strong>{completed}</strong> completed</span></div>
        <div className="summary-message"><Sparkles size={16} /><span>{active === 0 ? (isToday ? "Your day has space. Add only what deserves it." : "Nothing planned for this day.") : "One thoughtful step at a time. No need to rush everything."}</span></div>
      </section>

      <TaskBoard dateKey={selectedDate} />
      <AddTaskModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
