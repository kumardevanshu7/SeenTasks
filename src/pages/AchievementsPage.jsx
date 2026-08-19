import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trophy } from "lucide-react";
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
  const unlocked = useMemo(() => evaluateUnlockedIds(followFlows), [followFlows]);
  const earned = FLOW_ACHIEVEMENTS.filter((a) => unlocked.has(a.id));
  const locked = FLOW_ACHIEVEMENTS.filter((a) => !unlocked.has(a.id));

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

      <section className="flow-section" aria-label="Unlocked">
        <div className="flow-list-head">
          <div>
            <h2>Unlocked</h2>
            <p className="flow-section-sub">Badges you’ve already earned</p>
          </div>
        </div>
        {earned.length === 0 ? (
          <p className="flow-section-empty">None yet — finish a category tab today to take First win.</p>
        ) : (
          <div className="achieve-page-grid">
            {earned.map((a) => (
              <article key={a.id} className="achieve-page-card is-earned">
                <Trophy size={20} aria-hidden="true" />
                <strong>{a.title}</strong>
                <span>{a.hint}</span>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="flow-section" aria-label="Locked">
        <div className="flow-list-head">
          <div>
            <h2>Still locked</h2>
            <p className="flow-section-sub">{locked.length} left to chase</p>
          </div>
        </div>
        <div className="achieve-page-grid">
          {locked.map((a) => (
            <article key={a.id} className="achieve-page-card">
              <Trophy size={20} aria-hidden="true" />
              <strong>{a.title}</strong>
              <span>{a.hint}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
