import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Gift, Plus, Shield, Trophy, X } from "lucide-react";
import { useTaskStore } from "../store/useTaskStore";
import { FLOW_ACHIEVEMENTS, evaluateUnlockedIds } from "../lib/flowAchievements";

function ProgressRing({ earned, total }) {
  const size = 168;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total === 0 ? 0 : Math.round((earned / total) * 100);
  const offset = c - (pct / 100) * c;
  return (
    <div className="achieve-hero-ring">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="report-ring-track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        <circle
          className="report-ring-value"
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
      <div className="report-ring-label">
        <strong>
          {earned}/{total}
        </strong>
        <span>unlocked</span>
      </div>
    </div>
  );
}

export default function AchievementsPage() {
  const followFlows = useTaskStore((s) => s.followFlows) || [];
  const streakShields = useTaskStore((s) => s.getStreakShields) ? useTaskStore((s) => s.getStreakShields)() : { remaining: 2 };
  const customRewards = useTaskStore((s) => s.customRewards) || {};
  const setCustomReward = useTaskStore((s) => s.setCustomReward);

  const [rewardModalAchieve, setRewardModalAchieve] = useState(null);
  const [rewardInput, setRewardInput] = useState("");

  const unlocked = useMemo(
    () => evaluateUnlockedIds(followFlows, streakShields.usedDates || []),
    [followFlows, streakShields.usedDates]
  );
  const earned = FLOW_ACHIEVEMENTS.filter((a) => unlocked.has(a.id));
  const locked = FLOW_ACHIEVEMENTS.filter((a) => !unlocked.has(a.id));

  function openRewardModal(achieve) {
    setRewardModalAchieve(achieve);
    setRewardInput(customRewards[achieve.id] || "");
  }

  function saveReward() {
    if (rewardModalAchieve) {
      setCustomReward(rewardModalAchieve.id, rewardInput);
      setRewardModalAchieve(null);
    }
  }

  return (
    <div className="page narrow-page page-achievements">
      <div className="workspace-topbar">
        <Link to="/app/flows" className="workspace-back">
          <ArrowLeft size={16} /> Flows
        </Link>
      </div>

      <section className="achieve-hero">
        <p className="eyebrow">Everyday</p>
        <h1>Achievements</h1>
        <p>Win a tab, keep a streak, climb the board — {earned.length} of {FLOW_ACHIEVEMENTS.length} so far.</p>
        <ProgressRing earned={earned.length} total={FLOW_ACHIEVEMENTS.length} />
      </section>

      {/* Streak Shield Status Banner */}
      <section className="streak-shield-card" aria-label="Streak Shields">
        <div className="streak-shield-icon">
          <Shield size={24} />
        </div>
        <div className="streak-shield-info">
          <strong>
            {streakShields.remaining} Streak Shield{streakShields.remaining === 1 ? "" : "s"} Available
          </strong>
          <p>
            Emergency pass: Protects your daily streak if a busy day or travel prevents you from finishing.
          </p>
        </div>
        <div className="streak-shield-pills">
          <span className={`streak-shield-pill${streakShields.remaining >= 1 ? " is-active" : ""}`}>
            🛡️ Shield 1
          </span>
          <span className={`streak-shield-pill${streakShields.remaining >= 2 ? " is-active" : ""}`}>
            🛡️ Shield 2
          </span>
        </div>
      </section>

      <section className="flow-section" aria-label="Unlocked">
        <div className="flow-list-head">
          <div>
            <h2>Unlocked</h2>
            <p className="flow-section-sub">Badges you’ve already earned · Tap to set or view custom rewards</p>
          </div>
        </div>
        {earned.length === 0 ? (
          <p className="flow-section-empty">None yet — finish a category tab today to take First win.</p>
        ) : (
          <div className="achieve-page-grid">
            {earned.map((a) => {
              const reward = customRewards[a.id];
              return (
                <article
                  key={a.id}
                  className="achieve-page-card is-earned is-clickable"
                  onClick={() => openRewardModal(a)}
                  title="Click to set custom reward"
                >
                  <Trophy size={20} aria-hidden="true" />
                  <strong>{a.title}</strong>
                  <span>{a.hint}</span>
                  {reward ? (
                    <span className="achieve-reward-tag" title="Custom Reward">
                      <Gift size={12} /> {reward}
                    </span>
                  ) : (
                    <span className="achieve-add-reward-hint">
                      <Plus size={11} /> Add reward
                    </span>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="flow-section" aria-label="Locked">
        <div className="flow-list-head">
          <div>
            <h2>Still locked</h2>
            <p className="flow-section-sub">{locked.length} left to chase · Tap to attach milestone target reward</p>
          </div>
        </div>
        <div className="achieve-page-grid">
          {locked.map((a) => {
            const reward = customRewards[a.id];
            return (
              <article
                key={a.id}
                className="achieve-page-card is-clickable"
                onClick={() => openRewardModal(a)}
                title="Click to set target reward"
              >
                <Trophy size={20} aria-hidden="true" />
                <strong>{a.title}</strong>
                <span>{a.hint}</span>
                {reward && (
                  <span className="achieve-reward-tag is-pending" title="Reward when unlocked">
                    <Gift size={12} /> {reward}
                  </span>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* Custom Reward Modal */}
      {rewardModalAchieve && (
        <div className="modal-backdrop" onClick={() => setRewardModalAchieve(null)}>
          <div className="modal-card achieve-reward-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="achieve-reward-head-title">
                <Gift size={18} />
                <h3>Set Milestone Reward</h3>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setRewardModalAchieve(null)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <p className="achieve-reward-sub">
              For <strong>{rewardModalAchieve.title}</strong>: Treat yourself when you crush this milestone!
            </p>
            <input
              className="text-input"
              placeholder="e.g. Order sushi, Buy game, Take a relaxing afternoon..."
              value={rewardInput}
              onChange={(e) => setRewardInput(e.target.value)}
              maxLength={80}
              autoFocus
            />
            <div className="modal-actions">
              {customRewards[rewardModalAchieve.id] && (
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => {
                    setCustomReward(rewardModalAchieve.id, "");
                    setRewardModalAchieve(null);
                  }}
                >
                  Clear Reward
                </button>
              )}
              <button
                type="button"
                className="button button-primary"
                onClick={saveReward}
              >
                Save Reward
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
