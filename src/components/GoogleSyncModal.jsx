import { ArrowRight, CheckCircle2, Cloud, Database, FolderSync, RefreshCw, Sparkles } from "lucide-react";

export default function GoogleSyncModal({
  open,
  stage = 0,
  statusText = "",
  completed = false,
  stats = null,
  error = "",
  onClose,
}) {
  if (!open) return null;

  return (
    <div className="reset-progress-backdrop" role="dialog" aria-modal="true" aria-label="Syncing with Google Tasks">
      <div className="reset-progress-card google-sync-modal-card">
        {/* Animated Centerpiece Icon */}
        <div className={`reset-icon-stage google-icon-stage${completed ? " is-completed" : error ? " is-error" : ""}`}>
          {completed ? (
            <CheckCircle2 size={36} className="reset-icon-success" />
          ) : error ? (
            <Cloud size={36} className="google-icon-error" />
          ) : (
            <Cloud size={36} className="google-icon-pulse" />
          )}
          <div className="reset-icon-glow google-glow" />
        </div>

        <h2 className="reset-progress-title">
          {completed ? "Google Tasks Connected!" : error ? "Sync Interrupted" : "Syncing Google Tasks"}
        </h2>
        <p className={`reset-progress-status${error ? " is-error-text" : ""}`}>
          {error || statusText}
        </p>

        {/* Shimmering Animated Progress Bar */}
        {!error && (
          <div className="reset-bar-container">
            <div className="reset-bar-track">
              <div
                className={`reset-bar-fill google-bar-fill${completed ? " is-done" : ""}`}
                style={{ width: `${Math.max(6, Math.min(100, stage))}%` }}
              >
                <div className="reset-bar-shimmer" />
              </div>
            </div>
            <div className="reset-bar-meta">
              <span className="reset-bar-stage-label">
                {completed ? "Live 2-Way Sync Active" : `Phase ${stage < 35 ? "1/3" : stage < 75 ? "2/3" : "3/3"}`}
              </span>
              <strong className="reset-bar-pct">{Math.round(stage)}%</strong>
            </div>
          </div>
        )}

        {/* 3 Step Checkpoint Badges */}
        {!error && (
          <div className="reset-checkpoints-row">
            <div className={`reset-checkpoint-chip${stage >= 30 ? " is-passed" : stage > 0 ? " is-active" : ""}`}>
              <Cloud size={12} />
              <span>OAuth Scope</span>
            </div>
            <div className={`reset-checkpoint-chip${stage >= 70 ? " is-passed" : stage >= 30 ? " is-active" : ""}`}>
              <FolderSync size={12} />
              <span>Task Lists</span>
            </div>
            <div className={`reset-checkpoint-chip${stage >= 100 ? " is-passed" : stage >= 70 ? " is-active" : ""}`}>
              <Sparkles size={12} />
              <span>2-Way Reconcile</span>
            </div>
          </div>
        )}

        {/* Stats summary if available */}
        {completed && stats && (
          <div className="google-sync-result-chips">
            <span className="sync-chip-stat">📥 {stats.pulledCount || 0} tasks pulled</span>
            <span className="sync-chip-stat">📤 {stats.pushedCount || 0} tasks pushed</span>
          </div>
        )}

        {/* Action Button */}
        {(completed || error) && (
          <button
            type="button"
            className="button button-primary reset-finish-cta"
            onClick={onClose}
            autoFocus
          >
            <span>{error ? "Close & Try Again" : "Done & Continue"}</span>
            <ArrowRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
