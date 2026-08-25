import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Coffee, Flame, Maximize2, Minimize2, Pause, Play, RotateCcw, SkipForward, Sparkles, Timer, X } from "lucide-react";
import { useTaskStore } from "../store/useTaskStore";
import { playChimeSound, triggerConfetti } from "../lib/audioConfetti";

const MODES = [
  { id: "focus", label: "Focus", seconds: 25 * 60, icon: Flame, color: "#fecaca", ink: "#991b1b" },
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

  // Ticking interval
  useEffect(() => {
    let interval = null;
    if (focusTimer.running && focusTimer.secondsLeft > 0) {
      interval = setInterval(() => {
        setFocusTimer((prev) => {
          if (prev.secondsLeft <= 1) {
            if (soundEnabled) playChimeSound();
            triggerConfetti();
            return {
              ...prev,
              secondsLeft: 0,
              running: false,
            };
          }
          return {
            ...prev,
            secondsLeft: prev.secondsLeft - 1,
          };
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [focusTimer.running, focusTimer.secondsLeft, setFocusTimer, soundEnabled]);

  function switchMode(modeId) {
    const target = MODES.find((m) => m.id === modeId) || MODES[0];
    setFocusTimer({
      mode: modeId,
      secondsLeft: target.seconds,
      running: false,
    });
  }

  function togglePlay() {
    setFocusTimer((prev) => ({ ...prev, running: !prev.running }));
  }

  function reset() {
    setFocusTimer({
      secondsLeft: currentMode.seconds,
      running: false,
    });
  }

  function skip() {
    const nextMode = focusTimer.mode === "focus" ? "shortBreak" : "focus";
    switchMode(nextMode);
  }

  const mins = Math.floor(focusTimer.secondsLeft / 60);
  const secs = focusTimer.secondsLeft % 60;
  const formattedTime = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  if (!open && !minimized && !focusTimer.running) return null;

  // Mini floating pill at the bottom right when minimized or running in background
  if ((minimized || (!open && focusTimer.running))) {
    return (
      <motion.div
        className="focus-mini-pill"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        onClick={() => {
          setMinimized(false);
          setFocusTimer({ active: true });
        }}
        style={{
          "--pill-bg": currentMode.color,
          "--pill-ink": currentMode.ink,
        }}
      >
        <div className="focus-mini-pulse" />
        <currentMode.icon size={15} />
        <strong>{formattedTime}</strong>
        <span className="focus-mini-label">{currentMode.label}</span>
        <button
          type="button"
          className="focus-mini-action"
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          aria-label={focusTimer.running ? "Pause" : "Play"}
        >
          {focusTimer.running ? <Pause size={13} /> : <Play size={13} />}
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
              <span className="focus-status-tag">{focusTimer.running ? "In session" : "Paused"}</span>
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
                  <Play size={18} /> {focusTimer.secondsLeft === totalSeconds ? "Start Focus" : "Resume"}
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
