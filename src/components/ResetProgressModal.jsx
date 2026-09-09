import { useEffect } from "react";
import { ArrowRight, CheckCircle2, Database, RotateCcw, Sparkles, SunMedium, Trash2 } from "lucide-react";

export default function ResetProgressModal({
  open,
  stage = 0,
  statusText = "",
  completed = false,
  onFinish,
  mode = "wipe",
}) {
  if (!open) return null;

  const isShift = mode === "shift";

  return (
    <div className="reset-progress-backdrop" role="dialog" aria-modal="true" aria-label="Resetting app">
      <div className="reset-progress-card">
        {/* Animated Icon Centerpiece */}
        <div className={`reset-icon-stage${completed ? " is-completed" : ""}`}>
          {completed ? (
            <CheckCircle2 size={36} className="reset-icon-success" />
          ) : isShift ? (
            <SunMedium size={36} className="reset-icon-sparkle" style={{ color: "#10b981" }} />
          ) : (
            <Sparkles size={36} className="reset-icon-sparkle" />
          )}
          <div className="reset-icon-glow" />
        </div>

        <h2 className="reset-progress-title">
          {completed
            ? isShift
              ? "Today is Your Refresh Day! ✨"
              : "Fresh Start Ready!"
            : isShift
              ? "Setting Up Refresh Day"
              : "Deep-Cleaning Workspace"}
        </h2>
        <p className="reset-progress-status">{statusText}</p>

        {/* Shimmering Progress Bar */}
        <div className="reset-bar-container">
          <div className="reset-bar-track">
            <div
              className={`reset-bar-fill${completed ? " is-done" : ""}`}
              style={{ width: `${Math.max(5, Math.min(100, stage))}%` }}
            >
              <div className="reset-bar-shimmer" />
            </div>
          </div>
          <div className="reset-bar-meta">
            <span className="reset-bar-stage-label">
              {completed
                ? isShift
                  ? "100% Shifted to Today"
                  : "100% Wiped & Re-seeded"
                : `Step ${stage < 40 ? "1/3" : stage < 80 ? "2/3" : "3/3"}`}
            </span>
            <strong className="reset-bar-pct">{Math.round(stage)}%</strong>
          </div>
        </div>

        {/* Checkpoint Badges */}
        <div className="reset-checkpoints-row">
          {isShift ? (
            <>
              <div className={`reset-checkpoint-chip${stage >= 30 ? " is-passed" : stage > 0 ? " is-active" : ""}`}>
                <RotateCcw size={12} />
                <span>Scan Past Tasks</span>
              </div>
              <div className={`reset-checkpoint-chip${stage >= 70 ? " is-passed" : stage >= 30 ? " is-active" : ""}`}>
                <SunMedium size={12} />
                <span>Shift to Today</span>
              </div>
              <div className={`reset-checkpoint-chip${stage >= 100 ? " is-passed" : stage >= 70 ? " is-active" : ""}`}>
                <Sparkles size={12} />
                <span>Fresh Day 1</span>
              </div>
            </>
          ) : (
            <>
              <div className={`reset-checkpoint-chip${stage >= 30 ? " is-passed" : stage > 0 ? " is-active" : ""}`}>
                <Trash2 size={12} />
                <span>Local Wipe</span>
              </div>
              <div className={`reset-checkpoint-chip${stage >= 70 ? " is-passed" : stage >= 30 ? " is-active" : ""}`}>
                <Database size={12} />
                <span>Cloud Database</span>
              </div>
              <div className={`reset-checkpoint-chip${stage >= 100 ? " is-passed" : stage >= 70 ? " is-active" : ""}`}>
                <Sparkles size={12} />
                <span>Fresh Canvas</span>
              </div>
            </>
          )}
        </div>

        {completed && (
          <button
            type="button"
            className="button button-primary reset-finish-cta"
            onClick={onFinish}
            autoFocus
          >
            <span>{isShift ? "Go to Today’s Tasks" : "Open Fresh Workspace"}</span>
            <ArrowRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
