import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, LoaderCircle, Sparkles, UserCog, X } from "lucide-react";
import { CATEGORY_META } from "../lib/aiAnalyzer";
import { PERSONA_TRAITS } from "../lib/persona";
import { useTaskStore } from "../store/useTaskStore";

const STATUS = { PENDING: "pending", ANALYZING: "analyzing", DONE: "done" };

export default function AddTaskModal({ open, onClose }) {
  return (
    <AnimatePresence>{open && <TaskComposer onClose={onClose} />}</AnimatePresence>
  );
}

function TaskComposer({ onClose }) {
  const [raw, setRaw] = useState("");
  const [context, setContext] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [queue, setQueue] = useState([]);
  const [running, setRunning] = useState(false);
  const members = useTaskStore((s) => s.members);
  const persona = useTaskStore((s) => s.persona);
  const addTask = useTaskStore((s) => s.addTask);
  const navigate = useNavigate();

  const personaLabels = PERSONA_TRAITS.filter((t) => persona.includes(t.id)).map((t) => t.label);
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

  function goToPersona() {
    onClose();
    navigate("/app/persona");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!lines.length || running) return;

    const items = lines.map((title, i) => ({ id: `${i}-${title}`, title, status: STATUS.PENDING, category: null }));
    setQueue(items);
    setRunning(true);

    for (let i = 0; i < items.length; i += 1) {
      setQueue((q) => q.map((item, idx) => (idx === i ? { ...item, status: STATUS.ANALYZING } : item)));
      const task = await addTask({ title: items[i].title, description: context, assignedTo: assignedTo || null });
      setQueue((q) => q.map((item, idx) => (idx === i ? { ...item, status: STATUS.DONE, category: task?.category || "second" } : item)));
    }

    await new Promise((r) => setTimeout(r, 650));
    onClose();
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) handleSubmit(event);
  }

  return (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !running && onClose()}>
          <motion.form
            className="task-composer"
            onSubmit={handleSubmit}
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
          >
            <header className="composer-header">
              <div><span className="brand-mark">✣</span><div><p className="eyebrow">Thoughtful planning</p><h2>{running ? "Reading your day…" : "What needs your attention?"}</h2></div></div>
              {!running && <button className="icon-button icon-button-dark" type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>}
            </header>

            {running ? (
              <div className="composer-body analyzing-body">
                <p className="analyzing-lead">Placing each task where it best supports you.</p>
                <div className="analyze-queue">
                  {queue.map((item) => (
                    <motion.div key={item.id} layout className={`analyze-row analyze-${item.status}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <span className="analyze-icon">
                        {item.status === STATUS.DONE ? <Check size={15} /> : item.status === STATUS.ANALYZING ? <LoaderCircle className="spin" size={15} /> : <span className="analyze-dot" />}
                      </span>
                      <span className="analyze-title">{item.title}</span>
                      <AnimatePresence>
                        {item.status === STATUS.DONE && (
                          <motion.span className="analyze-badge" style={{ color: CATEGORY_META[item.category].color }} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                            {CATEGORY_META[item.category].label}
                          </motion.span>
                        )}
                        {item.status === STATUS.ANALYZING && <motion.span className="analyze-status" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>thinking…</motion.span>}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="composer-body">
                {personaLabels.length > 0 ? (
                  <button type="button" className="persona-mention" onClick={goToPersona}>
                    <UserCog size={15} />
                    <span>Judging against your persona: <strong>{personaLabels.join(", ")}</strong></span>
                  </button>
                ) : (
                  <button type="button" className="persona-mention persona-mention-empty" onClick={goToPersona}>
                    <UserCog size={15} />
                    <span>Set your persona first so the guide knows you. <strong>Open Your persona →</strong></span>
                  </button>
                )}

                <label htmlFor="task-title">Tasks <span>One per line</span></label>
                <textarea id="task-title" className="text-input title-input" autoFocus value={raw} onChange={(e) => setRaw(e.target.value)} onKeyDown={handleKeyDown} placeholder={"Submit the client proposal\nReply to Priya\nBook dentist appointment"} rows={4} />

                <label htmlFor="task-details">Shared context <span>Optional</span></label>
                <textarea id="task-details" className="text-input" value={context} onChange={(e) => setContext(e.target.value)} placeholder="A deadline, your energy level, or why these matter..." rows={2} />

                {members.length > 0 && (
                  <><label htmlFor="assignee">Assign to <span>Optional</span></label><select id="assignee" className="text-input" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}><option value="">Myself</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></>
                )}

                <div className="composer-hint"><Sparkles size={16} /><span>{lines.length > 1 ? `${lines.length} tasks will be analyzed one by one.` : "The priority guide considers urgency, future impact, and what is realistic today."}</span></div>
              </div>
            )}

            {!running && (
              <footer className="composer-footer">
                <button type="button" className="button button-secondary" onClick={onClose}>Cancel</button>
                <button type="submit" className="button button-primary" disabled={!lines.length}>Analyze &amp; add{lines.length > 1 ? ` ${lines.length}` : ""} <ArrowRight size={17} /></button>
              </footer>
            )}
          </motion.form>
        </motion.div>
  );
}
