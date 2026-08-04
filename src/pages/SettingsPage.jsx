import { useEffect, useState } from "react";
import { KeyRound, RotateCcw, ShieldCheck } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useTaskStore } from "../store/useTaskStore";
import OnePasswordGate from "../components/OnePasswordGate";
import {
  clearOnePasswordDoc,
  isOnePasswordConfigured,
  loadOnePassword,
  normalizeOneAnswer,
  saveOnePassword,
  verifyOnePassword,
} from "../lib/onePasswordService";

export default function SettingsPage() {
  const { user } = useAuth();
  const onePassword = useTaskStore((s) => s.onePassword);
  const setOnePassword = useTaskStore((s) => s.setOnePassword);
  const clearOnePassword = useTaskStore((s) => s.clearOnePassword);
  const resetAppData = useTaskStore((s) => s.resetAppData);
  const configured = isOnePasswordConfigured(onePassword);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [confirmAnswer, setConfirmAnswer] = useState("");
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");

  useEffect(() => {
    let active = true;
    async function hydrate() {
      if (!user?.uid) {
        if (active) {
          clearOnePassword();
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      try {
        const cloud = await loadOnePassword(user.uid);
        if (!active) return;
        setOnePassword(cloud);
        if (cloud) setQuestion(cloud.question);
        else setQuestion("");
      } catch {
        if (active) setError("Could not load One Password from Firebase.");
      } finally {
        if (active) setLoading(false);
      }
    }
    hydrate();
    return () => { active = false; };
  }, [user?.uid, setOnePassword, clearOnePassword]);

  useEffect(() => {
    if (configured) {
      setQuestion(onePassword.question);
      setAnswer("");
      setConfirmAnswer("");
      setCurrentAnswer("");
    } else if (!loading) {
      setQuestion("");
      setAnswer("");
      setConfirmAnswer("");
      setCurrentAnswer("");
    }
  }, [configured, onePassword?.question, onePassword?.answerHash, loading]);

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!user?.uid) {
      setError("Sign in required to save One Password on Firebase.");
      return;
    }

    const q = question.trim();
    const a = answer.trim();
    const c = confirmAnswer.trim();

    if (!q || !a) {
      setError("Add one question and one answer.");
      return;
    }
    if (normalizeOneAnswer(a) !== normalizeOneAnswer(c)) {
      setError("Answers do not match.");
      return;
    }
    if (configured) {
      const ok = await verifyOnePassword(onePassword, currentAnswer);
      if (!ok) {
        setError("Current answer is wrong.");
        return;
      }
    }

    setBusy(true);
    try {
      const saved = await saveOnePassword(user.uid, { question: q, answer: a });
      setOnePassword(saved);
      setAnswer("");
      setConfirmAnswer("");
      setCurrentAnswer("");
      setMessage(configured ? "One Password updated on Firebase." : "One Password saved on Firebase.");
    } catch {
      setError("Could not save to Firebase. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    setError("");
    setMessage("");
    if (!user?.uid) {
      setError("Sign in required.");
      return;
    }
    const ok = await verifyOnePassword(onePassword, currentAnswer);
    if (!ok) {
      setError("Enter your current answer to turn One Password off.");
      return;
    }
    setBusy(true);
    try {
      await clearOnePasswordDoc(user.uid);
      clearOnePassword();
      setQuestion("");
      setAnswer("");
      setConfirmAnswer("");
      setCurrentAnswer("");
      setMessage("One Password removed from Firebase.");
    } catch {
      setError("Could not clear on Firebase. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResetConfirm() {
    setResetError("");
    setResetMessage("");
    setResetBusy(true);
    try {
      await resetAppData();
      setResetOpen(false);
      setResetMessage("App reset. Quick tasks, Today board, and persona are cleared.");
    } catch {
      setResetError("Reset failed. Check your connection and try again.");
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <div className="page narrow-page">
      <section className="simple-hero">
        <p className="eyebrow">Manage system</p>
        <h1>Settings</h1>
        <p>
          One Password protects deletes and sensitive edits — one question, one answer.
          Stored only on Firebase (hashed). Never kept in local storage.
        </p>
      </section>

      <section className="content-card">
        <div className="card-heading">
          <span className="heading-icon"><KeyRound size={18} /></span>
          <div>
            <h2>One Password</h2>
            <p>
              {loading
                ? "Loading from Firebase…"
                : configured
                  ? "Active · Firebase"
                  : "Not set up yet"}
            </p>
          </div>
          {configured && (
            <span className="one-password-status">
              <ShieldCheck size={15} /> On
            </span>
          )}
        </div>

        <form className="one-password-form" onSubmit={handleSave}>
          <p className="one-password-copy">
            Pick a question only you know. The answer is hashed before it leaves this screen — Firebase never stores the plain answer.
          </p>

          {configured && (
            <label>
              Current answer
              <input
                className="text-input"
                type="text"
                value={currentAnswer}
                onChange={(e) => { setCurrentAnswer(e.target.value); setError(""); }}
                placeholder="Prove it’s you before changing"
                autoComplete="off"
                spellCheck={false}
                disabled={busy || loading}
              />
            </label>
          )}

          <label>
            Your question
            <input
              className="text-input"
              type="text"
              value={question}
              onChange={(e) => { setQuestion(e.target.value); setError(""); setMessage(""); }}
              placeholder="e.g. What city did I grow up in?"
              maxLength={120}
              autoComplete="off"
              disabled={busy || loading}
            />
          </label>

          <label>
            Your answer
            <input
              className="text-input"
              type="text"
              value={answer}
              onChange={(e) => { setAnswer(e.target.value); setError(""); setMessage(""); }}
              placeholder="Only you should know this"
              maxLength={80}
              autoComplete="off"
              spellCheck={false}
              disabled={busy || loading}
            />
          </label>

          <label>
            Confirm answer
            <input
              className="text-input"
              type="text"
              value={confirmAnswer}
              onChange={(e) => { setConfirmAnswer(e.target.value); setError(""); }}
              placeholder="Type the same answer again"
              maxLength={80}
              autoComplete="off"
              spellCheck={false}
              disabled={busy || loading}
            />
          </label>

          {error && <p className="quick-delete-error">{error}</p>}
          {message && <p className="one-password-ok">{message}</p>}

          <div className="one-password-actions">
            <button type="submit" className="button button-primary" disabled={busy || loading || !user}>
              {configured ? "Update on Firebase" : "Save on Firebase"}
            </button>
            {configured && (
              <button type="button" className="button button-secondary" disabled={busy || loading} onClick={handleClear}>
                Turn off
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="content-card">
        <div className="card-heading">
          <span className="heading-icon"><RotateCcw size={18} /></span>
          <div>
            <h2>Reset your app</h2>
            <p>Wipe tasks and start fresh — account and One Password stay</p>
          </div>
        </div>

        <div className="one-password-form">
          <p className="one-password-copy">
            Clears Quick tasks (Firebase + this device), Today / AI tasks, abort bin, and persona.
            Connections and One Password are not removed.
          </p>
          {resetError && <p className="quick-delete-error">{resetError}</p>}
          {resetMessage && <p className="one-password-ok">{resetMessage}</p>}
          <div className="one-password-actions">
            <button
              type="button"
              className="button button-secondary"
              disabled={!user || resetBusy || loading}
              onClick={() => {
                setResetError("");
                setResetMessage("");
                setResetOpen(true);
              }}
            >
              Reset app
            </button>
          </div>
        </div>
      </section>

      <OnePasswordGate
        open={resetOpen}
        title="Reset your app"
        description="Answer your One Password question to wipe all tasks and start fresh."
        onClose={() => !resetBusy && setResetOpen(false)}
        onConfirm={handleResetConfirm}
      />
    </div>
  );
}
