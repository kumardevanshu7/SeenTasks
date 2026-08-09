import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { WORKSPACE_COLORS } from "../lib/quickTaskService";

export default function CreateWorkspaceModal({ open, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [colorId, setColorId] = useState(WORKSPACE_COLORS[0].id);

  useEffect(() => {
    if (!open) {
      setName("");
      setColorId(WORKSPACE_COLORS[0].id);
    }
  }, [open]);

  function submit(e) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    onCreate?.({ name: clean, color: colorId });
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
                <p className="eyebrow">Workspace</p>
                <h2>Create workspace</h2>
              </div>
              <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="quick-delete-body workspace-create-body">
              <label>
                Name
                <input
                  className="text-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Arigato, Job, YouTube"
                  maxLength={40}
                  autoFocus
                  required
                />
              </label>

              <div className="workspace-color-field">
                <span className="workspace-color-label">Theme color</span>
                <div className="workspace-color-row" role="radiogroup" aria-label="Workspace color">
                  {WORKSPACE_COLORS.map((c) => {
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
                Create & open
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
