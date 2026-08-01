import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, X } from "lucide-react";
import { useTaskStore } from "../store/useTaskStore";
import { isOnePasswordConfigured, verifyOnePassword } from "../lib/onePasswordService";

const MAX_ATTEMPTS = 5;
const LOCK_MS = 30_000;

/**
 * Gate for protected actions. Verifies against Firebase-backed One Password hash in memory.
 */
export default function OnePasswordGate({ open, title, description, onClose, onConfirm }) {
  const onePassword = useTaskStore((s) => s.onePassword);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [fails, setFails] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const ready = isOnePasswordConfigured(onePassword);
  const locked = lockedUntil > now;

  useEffect(() => {
    if (!locked) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [locked]);

  useEffect(() => {
    if (!open) {
      setAnswer("");
      setError("");
      setBusy(false);
    }
  }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!ready || busy) return;
    if (locked) {
      setError("Too many tries. Wait a moment.");
      return;
    }
    if (!answer.trim()) {
      setError("Enter your answer.");
      return;
    }

    setBusy(true);
    try {
      const ok = await verifyOnePassword(onePassword, answer);
      if (!ok) {
        const nextFails = fails + 1;
        setFails(nextFails);
        if (nextFails >= MAX_ATTEMPTS) {
          setLockedUntil(Date.now() + LOCK_MS);
          setFails(0);
          setError("Too many wrong answers. Try again in 30 seconds.");
        } else {
          setError(`That answer doesn’t match. ${MAX_ATTEMPTS - nextFails} tries left.`);
        }
        setAnswer("");
        return;
      }
      setFails(0);
      setLockedUntil(0);
      setAnswer("");
      setError("");
      onConfirm();
    } finally {
      setBusy(false);
    }
  }

  function handleClose() {
    setAnswer("");
    setError("");
    onClose();
  }

  const lockSeconds = Math.max(0, Math.ceil((lockedUntil - now) / 1000));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
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
                <p className="eyebrow">One Password</p>
                <h2>{title}</h2>
              </div>
              <button type="button" className="icon-button" onClick={handleClose} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="quick-delete-body">
              {!ready ? (
                <>
                  <p>Set up One Password in Settings first — one question, one answer. Saved on Firebase only.</p>
                  <Link className="button button-primary" to="/app/settings" onClick={handleClose}>
                    Open Settings
                  </Link>
                </>
              ) : (
                <>
                  <p>{description || "Answer your One Password question to continue."}</p>
                  <div className="one-password-prompt">
                    <span className="eyebrow">Your question</span>
                    <strong>{onePassword.question}</strong>
                  </div>
                  <label>
                    Your answer
                    <input
                      className="text-input"
                      type="text"
                      value={answer}
                      onChange={(e) => { setAnswer(e.target.value); setError(""); }}
                      autoFocus
                      autoComplete="off"
                      spellCheck={false}
                      disabled={locked || busy}
                    />
                  </label>
                  {locked && <p className="quick-delete-error">Locked for {lockSeconds}s</p>}
                  {error && !locked && <p className="quick-delete-error">{error}</p>}
                </>
              )}
            </div>

            {ready && (
              <div className="quick-delete-footer">
                <button type="button" className="button button-secondary" onClick={handleClose}>Cancel</button>
                <button type="submit" className="button button-primary" disabled={locked || busy}>
                  Confirm
                </button>
              </div>
            )}
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
