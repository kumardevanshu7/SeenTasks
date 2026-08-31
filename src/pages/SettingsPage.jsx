import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, CheckCircle2, Cloud, KeyRound, LoaderCircle, LogOut, RefreshCw, RotateCcw, ShieldCheck, Volume2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useTaskStore } from "../store/useTaskStore";
import OnePasswordGate from "../components/OnePasswordGate";
import ResetProgressModal from "../components/ResetProgressModal";
import GoogleSyncModal from "../components/GoogleSyncModal";
import { playTickSound, triggerConfetti } from "../lib/audioConfetti";
import { authorizeGoogleTasks, twoWaySyncGoogleTasks } from "../lib/googleTasksService";
import { formatFriendly } from "../lib/date";
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
  const soundEnabled = useTaskStore((s) => s.soundEnabled);
  const setSoundEnabled = useTaskStore((s) => s.setSoundEnabled);
  const configured = isOnePasswordConfigured(onePassword);

  const googleConnected = useTaskStore((s) => s.googleTasksConnected);
  const googleToken = useTaskStore((s) => s.googleTasksToken);
  const googleSyncing = useTaskStore((s) => s.googleTasksSyncing);
  const lastGoogleSyncAt = useTaskStore((s) => s.lastGoogleSyncAt);
  const googleAutoSync = useTaskStore((s) => s.googleTasksAutoSync);
  const setGoogleTasksAuth = useTaskStore((s) => s.setGoogleTasksAuth);
  const disconnectGoogleTasks = useTaskStore((s) => s.disconnectGoogleTasks);
  const setGoogleTasksSyncing = useTaskStore((s) => s.setGoogleTasksSyncing);
  const recordGoogleSyncDone = useTaskStore((s) => s.recordGoogleSyncDone);
  const setGoogleTasksAutoSync = useTaskStore((s) => s.setGoogleTasksAutoSync);
  const setQuickTasks = useTaskStore((s) => s.setQuickTasks);

  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleMsg, setGoogleMsg] = useState("");
  const [googleErr, setGoogleErr] = useState("");

  const [gModalOpen, setGModalOpen] = useState(false);
  const [gStage, setGStage] = useState(0);
  const [gStatusText, setGStatusText] = useState("");
  const [gCompleted, setGCompleted] = useState(false);
  const [gStats, setGStats] = useState(null);
  const [gModalErr, setGModalErr] = useState("");

  async function handleConnectGoogle() {
    setGoogleBusy(true);
    setGoogleErr("");
    setGoogleMsg("");
    setGModalErr("");
    setGStats(null);
    setGCompleted(false);
    setGStage(15);
    setGStatusText("Opening Google OAuth popup & authenticating permissions...");
    setGModalOpen(true);

    try {
      const { accessToken, expiresIn } = await authorizeGoogleTasks();
      setGoogleTasksAuth(accessToken, expiresIn);

      setGStage(45);
      setGStatusText("Mapping SeenTasks workspaces to Google Task Lists...");
      await new Promise((r) => setTimeout(r, 450));

      setGStage(75);
      setGStatusText("Reconciling tasks, deadlines, subtasks, and labels...");

      const state = useTaskStore.getState();
      const res = await twoWaySyncGoogleTasks(
        accessToken,
        {
          quickTasks: state.quickTasks,
          quickWorkspaces: state.quickWorkspaces,
          quickLabels: state.quickLabels,
        },
        {
          setGoogleTasksSyncing,
          recordGoogleSyncDone,
          setQuickTasks,
        }
      );

      setGStage(100);
      setGStatusText("Connected & 2-way synced with Google Tasks!");
      setGStats(res);
      setGCompleted(true);
      setGoogleMsg(`Successfully synced with Google Tasks! (${res.pulledCount} imported, ${res.pushedCount} exported)`);
      if (soundEnabled) playTickSound();
      triggerConfetti();
    } catch (err) {
      console.error(err);
      const errMsg = err.message || "Failed to connect to Google Tasks. Check popup permissions.";
      setGModalErr(errMsg);
      setGoogleErr(errMsg);
    } finally {
      setGoogleBusy(false);
    }
  }

  async function handleManualSyncGoogle() {
    if (!googleToken) return;
    setGoogleBusy(true);
    setGoogleErr("");
    setGoogleMsg("");
    setGModalErr("");
    setGStats(null);
    setGCompleted(false);
    setGStage(25);
    setGStatusText("Contacting Google Tasks API...");
    setGModalOpen(true);

    try {
      setGStage(65);
      setGStatusText("Synchronizing tasks, statuses, and deadlines...");
      const state = useTaskStore.getState();
      const res = await twoWaySyncGoogleTasks(
        googleToken,
        {
          quickTasks: state.quickTasks,
          quickWorkspaces: state.quickWorkspaces,
          quickLabels: state.quickLabels,
        },
        {
          setGoogleTasksSyncing,
          recordGoogleSyncDone,
          setQuickTasks,
        }
      );

      setGStage(100);
      setGStatusText("Sync complete! Everything is up to date.");
      setGStats(res);
      setGCompleted(true);
      setGoogleMsg(`Sync complete! (${res.pulledCount} items pulled, ${res.pushedCount} items pushed)`);
      if (soundEnabled) playTickSound();
      triggerConfetti();
    } catch (err) {
      console.error(err);
      if (err.message === "TOKEN_EXPIRED") {
        disconnectGoogleTasks();
        setGModalErr("Google session expired. Please reconnect.");
        setGoogleErr("Google session expired. Please reconnect.");
      } else {
        const errMsg = err.message || "Sync failed. Check internet connection.";
        setGModalErr(errMsg);
        setGoogleErr(errMsg);
      }
    } finally {
      setGoogleBusy(false);
    }
  }

  const navigate = useNavigate();
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

  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [resetStage, setResetStage] = useState(0);
  const [resetStatusText, setResetStatusText] = useState("");
  const [resetCompleted, setResetCompleted] = useState(false);

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
    setResetOpen(false);
    setProgressModalOpen(true);
    setResetCompleted(false);

    setResetStage(15);
    setResetStatusText("Purging local tasks, Everyday flows, and archives...");
    await new Promise((r) => setTimeout(r, 400));

    setResetStage(45);
    setResetStatusText("Deep-cleaning cloud Firestore database collections...");
    await new Promise((r) => setTimeout(r, 400));

    try {
      await resetAppData();
      setResetStage(75);
      setResetStatusText("Resetting workspaces, labels, and routines...");
      await new Promise((r) => setTimeout(r, 350));

      setResetStage(95);
      setResetStatusText("Seeding pristine fresh workspace canvas...");
      await new Promise((r) => setTimeout(r, 350));

      setResetStage(100);
      setResetStatusText("Reset complete! Welcome to your fresh start ✨");
      setResetCompleted(true);
      if (soundEnabled) playTickSound();
      triggerConfetti();
    } catch (err) {
      console.error(err);
      setProgressModalOpen(false);
      setResetError("Reset failed — cloud wipe didn’t finish. Stay online and try again.");
    }
  }

  function handleFinishReset() {
    setProgressModalOpen(false);
    navigate("/app");
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
          <span className="heading-icon"><Volume2 size={18} /></span>
          <div>
            <h2>Sound & Haptics</h2>
            <p>Mechanical audio feedback and celebratory particle bursts</p>
          </div>
        </div>

        <div className="one-password-form">
          <label className="toggle-setting-row">
            <div className="toggle-setting-info">
              <strong>Task & Step Click Sound</strong>
              <p>Plays a soft, pleasant mechanical tick when checking off tasks or Everyday flow steps.</p>
            </div>
            <input
              type="checkbox"
              className="toggle-checkbox"
              checked={soundEnabled}
              onChange={(e) => {
                const next = e.target.checked;
                setSoundEnabled(next);
                if (next) {
                  playTickSound();
                  triggerConfetti();
                }
              }}
            />
          </label>
        </div>
      </section>

      {/* Google Tasks & Google Calendar Integration */}
      <section className="content-card">
        <div className="card-heading">
          <span className="heading-icon"><Cloud size={18} /></span>
          <div>
            <h2>Google Tasks & Calendar Sync</h2>
            <p>
              {googleConnected
                ? "Connected · Live 2-Way Synchronization"
                : "Sync tasks, deadlines, subtasks, and workspaces with Google Tasks"}
            </p>
          </div>
          {googleConnected && (
            <span className="one-password-status">
              <CheckCircle2 size={15} /> Active
            </span>
          )}
        </div>

        <div className="one-password-form">
          <p className="one-password-copy">
            Connect your Google account to automatically sync tasks across SeenTasks, Gmail, Google Calendar, and the Google Tasks mobile app.
          </p>

          {googleErr && <p className="quick-delete-error">{googleErr}</p>}
          {googleMsg && <p className="one-password-ok">{googleMsg}</p>}

          {googleConnected ? (
            <>
              <div className="google-sync-meta-box">
                <div className="google-sync-meta-row">
                  <span>Status:</span>
                  <strong>{googleSyncing ? "Syncing now..." : "Synced with Google"}</strong>
                </div>
                {lastGoogleSyncAt && (
                  <div className="google-sync-meta-row">
                    <span>Last synced:</span>
                    <span>{new Date(lastGoogleSyncAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                  </div>
                )}
              </div>

              <label className="toggle-setting-row">
                <div className="toggle-setting-info">
                  <strong>Automatic Background Sync</strong>
                  <p>Sync tasks every 45 seconds and whenever this browser tab becomes active.</p>
                </div>
                <input
                  type="checkbox"
                  className="toggle-checkbox"
                  checked={googleAutoSync}
                  onChange={(e) => setGoogleTasksAutoSync(e.target.checked)}
                />
              </label>

              <div className="one-password-actions">
                <button
                  type="button"
                  className="button button-primary"
                  onClick={handleManualSyncGoogle}
                  disabled={googleBusy || googleSyncing}
                >
                  {googleBusy || googleSyncing ? <LoaderCircle size={15} className="spin-slow" /> : <RefreshCw size={15} />}
                  <span>{googleBusy || googleSyncing ? "Syncing..." : "Sync now"}</span>
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={disconnectGoogleTasks}
                  disabled={googleBusy || googleSyncing}
                >
                  <LogOut size={15} />
                  <span>Disconnect</span>
                </button>
              </div>
            </>
          ) : (
            <div className="one-password-actions">
              <button
                type="button"
                className="button button-primary"
                onClick={handleConnectGoogle}
                disabled={googleBusy}
              >
                {googleBusy ? <LoaderCircle size={15} className="spin-slow" /> : <Cloud size={15} />}
                <span>{googleBusy ? "Connecting..." : "Connect Google Tasks"}</span>
              </button>
            </div>
          )}
        </div>
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
            Completely wipes all data from the database and device (Quick tasks, Everyday flows, Workspaces, Labels, Board tasks, Mood logs, and Rewards) for a fresh start.
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

      <ResetProgressModal
        open={progressModalOpen}
        stage={resetStage}
        statusText={resetStatusText}
        completed={resetCompleted}
        onFinish={handleFinishReset}
      />

      <GoogleSyncModal
        open={gModalOpen}
        stage={gStage}
        statusText={gStatusText}
        completed={gCompleted}
        stats={gStats}
        error={gModalErr}
        onClose={() => setGModalOpen(false)}
      />
    </div>
  );
}
