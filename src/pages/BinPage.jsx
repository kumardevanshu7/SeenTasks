import { useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { ArchiveRestore, Trash2 } from "lucide-react";
import { useTaskStore } from "../store/useTaskStore";
import TaskCard from "../components/TaskCard";

export default function BinPage() {
  const tasks = useTaskStore((s) => s.tasks);
  const binTasks = useMemo(() => tasks.filter((task) => task.status === "aborted"), [tasks]);

  return (
    <div className="page narrow-page">
      <section className="simple-hero">
        <p className="eyebrow">A place to let go</p>
        <h1>Abort bin</h1>
        <p>Tasks you chose not to carry. Restore one and it returns to today with a clear “Bin task” label.</p>
      </section>

      <section className="content-card">
        <div className="card-heading"><span className="heading-icon"><Trash2 size={18} /></span><div><h2>Aborted tasks</h2><p>{binTasks.length} item{binTasks.length === 1 ? "" : "s"} resting here</p></div></div>
        {binTasks.length === 0 ? (
          <div className="soft-empty"><ArchiveRestore size={24} /><h3>Nothing in the bin</h3><p>You have not aborted any tasks yet.</p></div>
        ) : (
          <div className="task-list bin-list"><AnimatePresence mode="popLayout">{binTasks.map((task) => <TaskCard key={task.id} task={task} variant="bin" />)}</AnimatePresence></div>
        )}
      </section>
    </div>
  );
}
