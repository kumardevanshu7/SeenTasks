import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Coffee, Flame, Maximize2, Minimize2, Pause, Play, RotateCcw, SkipForward, Sparkles, Timer, X } from "lucide-react";
import { useTaskStore } from "../store/useTaskStore";
import { playChimeSound, triggerConfetti } from "../lib/audioConfetti";

const MODES = [
  { id: "focus", label: "Focus (25m)", seconds: 25 * 60, icon: Flame, color: "#fecaca", ink: "#991b1b" },
  { id: "oneHour", label: "1 Hr Work", seconds: 60 * 60, icon: Timer, color: "#fed7aa", ink: "#9a3412" },
  { id: "shortBreak", label: "Short break", seconds: 5 * 60, icon: Coffee, color: "#bbf7d0", ink: "#166534" },
  { id: "longBreak", label: "Long break", seconds: 15 * 60, icon: Sparkles, color: "#bae6fd", ink: "#075985" },
];

export default function FocusTimerModal({ open, onClose }) {
  const focusTimer = useTaskStore((s) => s.focusTimer);
  const setFocusTimer = useTaskStore((s) => s.setFocusTimer);
  const soundEnabled = useTaskStore((s) => s.soundEnabled);

  const [minimized, setMinimized] = useState(false);

  const currentMode = MODES.find((m) => m.id === focusTimer.mode) || MODES[0];
  const totalSeconds = currentMode.seconds;
  const progressPct = Math.max(0, Math.min(100, ((totalSeconds - focusTimer.secondsLeft) / totalSeconds) * 100));

  // Screen WakeLock to prevent screen timeout while timer is running
  useEffect(() => {
    let wakeLock = null;
    if (focusTimer.running && "wakeLock" in navigator) {
      navigator.wakeLock.request("screen").then((lock) => {
        wakeLock = lock;
      }).catch(() => {});
    }
    return () => {
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, [focusTimer.running]);

  // Timestamp-based synchronization that survives tab backgrounding, app switching, and sleep
  useEffect(() => {
    function syncTime() {
      const timer = useTaskStore.getState().focusTimer;
      if (!timer.running) return;

      const targetEnd = timer.targetEndTime || (Date.now() + (timer.secondsLeft ?? totalSeconds) * 1000);
      const remaining = Math.max(0, Math.ceil((targetEnd - Date.now()) / 1000));

      if (remaining <= 0) {
        if (soundEnabled) playChimeSound();
        triggerConfetti();
        setFocusTimer({
          secondsLeft: 0,
          running: false,
          targetEndTime: null,
        });
      } else if (remaining !== timer.secondsLeft) {
        setFocusTimer((prev) => ({
          ...prev,
          secondsLeft: remaining,
        }));
      }
    }

    syncTime();
    window.addEventListener("focus", syncTime);
    document.addEventListener("visibilitychange", syncTime);

    let interval = null;
    if (focusTimer.running && focusTimer.secondsLeft > 0) {
      interval = setInterval(syncTime, 500);
    }

    return () => {
      window.removeEventListener("focus", syncTime);
      document.removeEventListener("visibilitychange", syncTime);
      if (interval) clearInterval(interval);
    };
  }, [focusTimer.running, focusTimer.targetEndTime, setFocusTimer, soundEnabled, totalSeconds]);

  function switchMode(modeId) {
    const target = MODES.find((m) => m.id === modeId) || MODES[0];
    setFocusTimer({
      mode: modeId,
      secondsLeft: target.seconds,
      running: false,
      targetEndTime: null,
    });
  }

  function togglePlay() {
    if (focusTimer.secondsLeft <= 0) {
      setFocusTimer({
        secondsLeft: totalSeconds,
        running: true,
      });
      return;
    }
    setFocusTimer((prev) => ({ ...prev, running: !prev.running }));
  }

  function reset() {
    setFocusTimer({
      secondsLeft: currentMode.seconds,
      running: false,
      targetEndTime: null,
    });
  }

  function skip() {
    const nextMode = focusTimer.mode === "focus" ? "shortBreak" : "focus";
    switchMode(nextMode);
  }

  const mins = Math.floor(focusTimer.secondsLeft / 60);
  const secs = focusTimer.secondsLeft % 60;
  const formattedTime = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  const hasActiveSession = Boolean(focusTimer.active || focusTimer.running || focusTimer.secondsLeft < totalSeconds);

  function handleAbort() {
    setFocusTimer({
      active: false,
      running: false,
      secondsLeft: totalSeconds,
    });
    setMinimized(false);
  }

  // Mini floating pill at the bottom right when minimized or running/paused in background
  if (!open && (minimized || hasActiveSession)) {
    return (
      <motion.div
        className="focus-mini-pill"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        onClick={() => {
          setMinimized(false);
          window.dispatchEvent(new CustomEvent("open-focus-timer"));
        }}
        style={{
          "--pill-bg": currentMode.color,
          "--pill-ink": currentMode.ink,
        }}
      >
        <div className={`focus-mini-pulse${!focusTimer.running ? " is-paused" : ""}`} />
        <currentMode.icon size={15} />
        <strong>{formattedTime}</strong>
        <span className="focus-mini-label">{focusTimer.secondsLeft <= 0 ? "Completed" : focusTimer.running ? currentMode.label : "Paused"}</span>
        <button
          type="button"
          className="focus-mini-action"
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          aria-label={focusTimer.running ? "Pause" : "Resume"}
          title={focusTimer.running ? "Pause" : "Resume"}
        >
          {focusTimer.running ? <Pause size={13} /> : <Play size={13} />}
        </button>
        <button
          type="button"
          className="focus-mini-close"
          onClick={(e) => {
            e.stopPropagation();
            handleAbort();
          }}
          aria-label="Abort focus session"
          title="Abort focus session"
        >
          <X size={12} />
        </button>
      </motion.div>
    );
  }

  if (!open) return null;

  const size = 180;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (progressPct / 100) * c;

  return (
    <AnimatePresence>
      <motion.div
        className="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="focus-modal-card"
          initial={{ scale: 0.95, opacity: 0, y: 14 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            "--timer-bg": currentMode.color,
            "--timer-ink": currentMode.ink,
          }}
        >
          <div className="focus-modal-header">
            <div className="focus-modal-title">
              <Timer size={18} />
              <h2>Focus Timer</h2>
            </div>
            <div className="focus-modal-head-actions">
              <button
                type="button"
                className="icon-button"
                onClick={() => setMinimized(true)}
                title="Minimize to floating pill"
                aria-label="Minimize"
              >
                <Minimize2 size={16} />
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="focus-mode-tabs" role="tablist">
            {MODES.map((m) => {
              const active = focusTimer.mode === m.id;
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`focus-mode-chip${active ? " is-active" : ""}`}
                  onClick={() => switchMode(m.id)}
                >
                  <Icon size={14} />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {focusTimer.taskTitle && (
            <div className="focus-task-banner">
              <span>Working on:</span>
              <strong>{focusTimer.taskTitle}</strong>
            </div>
          )}

          <div className="focus-ring-stage">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
              <circle
                className="focus-ring-track"
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                strokeWidth={stroke}
              />
              <circle
                className="focus-ring-val"
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                strokeWidth={stroke}
                strokeDasharray={c}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            </svg>
            <div className="focus-ring-content">
              <span className="focus-time-display">{formattedTime}</span>
              <span className="focus-status-tag">{focusTimer.secondsLeft <= 0 ? "Completed!" : focusTimer.running ? "In session" : "Paused"}</span>
            </div>
          </div>

          <div className="focus-controls">
            <button
              type="button"
              className="icon-button focus-sub-btn"
              onClick={reset}
              title="Reset timer"
              aria-label="Reset timer"
            >
              <RotateCcw size={16} />
            </button>

            <button
              type="button"
              className="button button-primary focus-main-btn"
              onClick={togglePlay}
            >
              {focusTimer.running ? (
                <>
                  <Pause size={18} /> Pause
                </>
              ) : (
                <>
                  <Play size={18} /> {focusTimer.secondsLeft <= 0 ? "Start Again" : focusTimer.secondsLeft === totalSeconds ? "Start Focus" : "Resume"}
                </>
              )}
            </button>

            <button
              type="button"
              className="icon-button focus-sub-btn"
              onClick={skip}
              title="Skip to next session"
              aria-label="Skip session"
            >
              <SkipForward size={16} />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
