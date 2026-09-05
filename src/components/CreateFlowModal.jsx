import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Timer, X } from "lucide-react";
import { FLOW_COLORS } from "../lib/flowService";
import { labelColorInk } from "../lib/quickTaskService";
import { todayKey } from "../lib/date";
import { useTaskStore } from "../store/useTaskStore";

export default function CreateFlowModal({ open, onClose, onCreate, defaultEveryday = false, defaultMode = null }) {
  const quickLabels = useTaskStore((s) => s.quickLabels) || [];
  const effectiveMode = defaultMode || (defaultEveryday ? "everyday" : "oneshot");
  const is1Hr = effectiveMode === "1hr";
  const [name, setName] = useState(is1Hr ? "1 Hr Work" : "");
  const [colorId, setColorId] = useState(is1Hr ? FLOW_COLORS[4].id : FLOW_COLORS[0].id);
  const [everyday, setEveryday] = useState(is1Hr || defaultEveryday);
  const [is1HrWork, setIs1HrWork] = useState(is1Hr);
  const [endDate, setEndDate] = useState("");
  const [labelIds, setLabelIds] = useState([]);
  const [anyOrder, setAnyOrder] = useState(is1Hr);

  useEffect(() => {
    if (!open) {
      setName("");
      setColorId(FLOW_COLORS[0].id);
      setEveryday(defaultEveryday);
      setIs1HrWork(false);
      setEndDate("");
      setLabelIds([]);
      setAnyOrder(false);
    } else {
      const mode = defaultMode || (defaultEveryday ? "everyday" : "oneshot");
      const is1HrSelected = mode === "1hr";
      setIs1HrWork(is1HrSelected);
      setEveryday(is1HrSelected || defaultEveryday);
      setAnyOrder(is1HrSelected);
      setName(is1HrSelected ? "1 Hr Work" : "");
      setColorId(is1HrSelected ? FLOW_COLORS[4].id : FLOW_COLORS[0].id);
    }
  }, [open, defaultEveryday, defaultMode]);

  function toggleLabel(id) {
    setLabelIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function submit(e) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    onCreate?.({
      name: clean,
      color: colorId,
      repeat: everyday || is1HrWork ? "daily" : null,
      endDate: (everyday || is1HrWork) && endDate ? endDate : null,
      labelIds: (everyday || is1HrWork) ? labelIds : [],
      anyOrder: (everyday || is1HrWork) && anyOrder,
      is1HrWork: Boolean(is1HrWork),
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.form
            className="quick-delete-modal workspace-create-modal"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
          >
            <div className="quick-delete-head">
              <div>
                <p className="eyebrow">{is1HrWork ? "1 Hr Work Focus" : everyday ? "Everyday" : "Follow Flow"}</p>
                <h2>{is1HrWork ? "Create 1 Hr Work flow" : everyday ? "Create everyday flow" : "Create flow"}</h2>
              </div>
              <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="quick-delete-body workspace-create-body">
              {is1HrWork && (
                <div className="flow-1hr-banner">
                  <Timer size={18} className="flow-1hr-banner-icon" />
                  <div>
                    <strong>1-Hour Focus Sprints</strong>
                    <p>Each task gets a 1-hour Pomodoro timer. Start the timer, focus for 60 mins, and tick it complete!</p>
                  </div>
                </div>
              )}

              <label>
                Flow name
                <input
                  className="text-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    is1HrWork
                      ? "e.g. 1 Hr Work, Daily 1-Hour Blocks"
                      : everyday
                        ? "e.g. Morning habits, Phone detox"
                        : "e.g. Launch checklist, Client onboarding"
                  }
                  maxLength={48}
                  autoFocus
                  required
                />
              </label>

              {!is1HrWork && (
                <label className="flow-everyday-toggle">
                  <input
                    type="checkbox"
                    checked={everyday}
                    onChange={(e) => setEveryday(e.target.checked)}
                  />
                  <span>
                    <strong>Everyday — repeat daily</strong>
                    <small>Resets at 12:00 AM. Yesterday becomes a report card.</small>
                  </span>
                </label>
              )}

              {(everyday || is1HrWork) && (
                <>
                  <label>
                    End date <span className="flow-field-optional">(optional)</span>
                    <input
                      className="text-input"
                      type="date"
                      value={endDate}
                      min={todayKey()}
                      onChange={(e) => setEndDate(e.target.value)}
                      aria-label="Everyday end date"
                    />
                  </label>

                  <label className="flow-everyday-toggle">
                    <input
                      type="checkbox"
                      checked={anyOrder}
                      onChange={(e) => setAnyOrder(e.target.checked)}
                    />
                    <span>
                      <strong>Tick any step</strong>
                      <small>Skip the lock — complete in any order and the list reorders.</small>
                    </span>
                  </label>


                  <div className="flow-label-field">
                    <span className="workspace-color-label">Labels</span>
                    {quickLabels.length === 0 ? (
                      <p className="flow-label-empty">
                        No labels yet — create them on a workspace Quick Tasks page.
                      </p>
                    ) : (
                      <div className="flow-label-pills" role="group" aria-label="Flow labels">
                        {quickLabels.map((label) => {
                          const selected = labelIds.includes(label.id);
                          return (
                            <button
                              key={label.id}
                              type="button"
                              className={`quick-label-pill${selected ? " is-selected" : ""}`}
                              style={{
                                "--label-bg": label.color,
                                "--label-ink": labelColorInk(label.color),
                              }}
                              onClick={() => toggleLabel(label.id)}
                              aria-pressed={selected}
                            >
                              {label.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="workspace-color-field">
                <span className="workspace-color-label">Theme color</span>
                <div className="workspace-color-row" role="radiogroup" aria-label="Flow color">
                  {FLOW_COLORS.map((c) => {
                    const selected = colorId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={c.id}
                        className={`workspace-color-swatch${selected ? " is-selected" : ""}`}
                        style={{ background: c.value }}
                        onClick={() => setColorId(c.id)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="quick-delete-footer">
              <button type="button" className="button button-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="button button-primary" disabled={!name.trim()}>
                {is1HrWork ? "Create 1 Hr flow" : everyday ? "Create everyday" : "Create flow"}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
