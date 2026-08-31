import { useEffect } from "react";
import { ArrowRight, CheckCircle2, Cloud, Database, RefreshCw, ShieldCheck, Sparkles, Trash2 } from "lucide-react";

export default function ResetProgressModal({
  open,
  stage = 0,
  statusText = "",
  completed = false,
  onFinish,
}) {
  if (!open) return null;

  return (
    <div className="reset-progress-backdrop" role="dialog" aria-modal="true" aria-label="Resetting app">
      <div className="reset-progress-card">
        {/* Animated Icon Centerpiece */}
        <div className={`reset-icon-stage${completed ? " is-completed" : ""}`}>
          {completed ? (
            <CheckCircle2 size={36} className="reset-icon-success" />
          ) : (
            <Sparkles size={36} className="reset-icon-sparkle" />
          )}
          <div className="reset-icon-glow" />
        </div>

        <h2 className="reset-progress-title">
          {completed ? "Fresh Start Ready!" : "Deep-Cleaning Workspace"}
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
              {completed ? "100% Wiped & Re-seeded" : `Step ${stage < 35 ? "1/4" : stage < 70 ? "2/4" : stage < 95 ? "3/4" : "4/4"}`}
            </span>
            <strong className="reset-bar-pct">{Math.round(stage)}%</strong>
          </div>
        </div>

        {/* 3 Step Checkpoint Badges */}
        <div className="reset-checkpoints-row">
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
        </div>

        {completed && (
          <button
            type="button"
            className="button button-primary reset-finish-cta"
            onClick={onFinish}
            autoFocus
          >
            <span>Open Fresh Workspace</span>
            <ArrowRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
