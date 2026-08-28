import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Check, ChevronDown, ListTodo, Sparkles, TriangleAlert } from "lucide-react";
import {
  activeFlowSteps,
  feedbackForGrade,
  flowCategories,
  flowColorInk,
  flowColorValue,
  gradeFromPct,
} from "../lib/flowService";
import { formatFriendly, todayKey } from "../lib/date";

function gradeTone(grade) {
  const g = String(grade || "F").replace("+", "p");
  if (g === "Ap" || g === "A") return "high";
  if (g === "Bp" || g === "B") return "good";
  if (g === "Cp" || g === "C") return "mid";
  return "low";
}

export function ProgressRing({ pct, ink }) {
  const size = 148;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
  const offset = c - (clamped / 100) * c;
  return (
    <div className="report-ring" style={{ "--ring-ink": ink }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          className="report-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
        />
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
        <strong>{clamped}%</strong>
        <span>of steps done</span>
      </div>
    </div>
  );
}

export function EverydayReportCard({
  flow,
  report,
  live = false,
  accent,
  title,
  eyebrow,
  to,
}) {
  const [pendingOpen, setPendingOpen] = useState(false);
  const color = accent ? flowColorValue(accent) : flow.color;
  const ink = flowColorInk(accent || flow.color);
  const tone = gradeTone(report.grade);
  const remaining = Math.max(0, (report.total || 0) - (report.done || 0));
  const periodDays = Number(report.periodDays) || 0;
  const daysLogged = Number(report.daysLogged) || 0;
  const status =
    report.pct >= 97
      ? "Perfect stretch"
      : report.pct >= 80
        ? "Strong finish"
        : report.pct >= 50
          ? "Room to climb"
          : "Needs a reset";

  const targetDay = report.dateKey || todayKey();
  const activeSteps = activeFlowSteps(flow, targetDay);
  const pendingSteps = activeSteps.filter((s) => !s.done);

  const card = (
    <article
      className={`report-pro-card tone-${tone}${to ? " is-clickable" : ""}`}
      style={{
        "--flow-bg": color,
        "--flow-ink": ink,
      }}
    >
      <header className="report-pro-head">
        <div>
          <p className="report-pro-eyebrow">
            {eyebrow || (live ? "Today · live" : "Report card")}
          </p>
          <h2>{title || flow.name}</h2>
        </div>
        <span className={`report-pro-grade grade-${String(report.grade || "F").replace("+", "p")}`}>
          {report.grade}
          <em>Grade</em>
        </span>
      </header>

      <ProgressRing pct={report.pct} ink={ink} />

      <div className={`report-pro-alert tone-${tone}`}>
        {report.pct >= 80 ? (
          <Sparkles size={14} aria-hidden="true" />
        ) : (
          <TriangleAlert size={14} aria-hidden="true" />
        )}
        <span>{report.feedback || status}</span>
      </div>

      <div className="report-pro-stats">
        <div>
          <span>Steps</span>
          <strong>
            {report.done}/{report.total || 0}
          </strong>
        </div>
        <div>
          <span>Remaining</span>
          <strong>
            {remaining} ({report.pct}% done)
          </strong>
        </div>
        <div>
          <span>{periodDays > 1 ? "Days logged" : live ? "As of" : "Day"}</span>
          <strong>
            {periodDays > 1
              ? `${daysLogged}/${periodDays}`
              : formatFriendly(report.dateKey)}
          </strong>
        </div>
      </div>

      {/* Dropdown to see which steps are pending for today */}
      <div className="report-pending-wrapper">
        <button
          type="button"
          className={`report-pending-btn${pendingOpen ? " is-open" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPendingOpen((v) => !v);
          }}
          aria-expanded={pendingOpen}
        >
          <span className="report-pending-btn-label">
            <ListTodo size={13} aria-hidden="true" />
            <span>
              {pendingSteps.length > 0
                ? `${pendingSteps.length} pending step${pendingSteps.length === 1 ? "" : "s"} today`
                : "All steps completed today"}
            </span>
          </span>
          <ChevronDown
            size={13}
            className={`report-pending-chevron${pendingOpen ? " is-open" : ""}`}
            aria-hidden="true"
          />
        </button>

        {pendingOpen && (
          <div
            className="report-pending-menu"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {pendingSteps.length === 0 ? (
              <div className="report-pending-done-msg">
                <Check size={14} className="report-pending-done-icon" />
                <span>Superb! No pending steps left for today.</span>
              </div>
            ) : (
              <ul className="report-pending-step-list">
                {pendingSteps.map((step, idx) => {
                  const cat = flowCategories(flow).find((c) => c.id === step.categoryId);
                  return (
                    <li key={step.id || idx} className="report-pending-step-row">
                      <span className="report-pending-dot" aria-hidden="true" />
                      <div className="report-pending-step-info">
                        <span className="report-pending-step-title">{step.title}</span>
                        {cat && (
                          <span
                            className="report-pending-step-cat"
                            style={{
                              "--cat-bg": cat.color,
                              "--cat-ink": flowColorInk(cat.color),
                            }}
                          >
                            {cat.name}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      <p className="report-pro-foot">
        {to
          ? "Tap to see each category"
          : live
            ? "Grade preview — daily card locks after midnight"
            : periodDays > 1
              ? accent
                ? `${periodDays}-day completion on this tab`
                : `${periodDays}-day completion across all tabs`
              : status}
      </p>

      {!to && (
        <div className="report-pro-actions">
          <Link to={`/app/flows/${flow.id}`} className="button button-secondary">
            Open flow
          </Link>
          <Link to={`/app/flows/${flow.id}`} className="button button-primary">
            Review steps
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
      )}
    </article>
  );

  if (!to) return card;
  return (
    <Link to={to} className="report-card-link">
      {card}
    </Link>
  );
}

export function MiniProgressRing({ pct, ink, size = 54, stroke = 6 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
  const offset = c - (clamped / 100) * c;
  return (
    <div className="report-mini-ring" style={{ "--ring-ink": ink, width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          className="report-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
        />
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
      <div className="report-mini-ring-label">
        <strong>{clamped}%</strong>
      </div>
    </div>
  );
}

export function CategoryMiniCard({ flow, category, report, live, periodLabel }) {
  const color = category.color ? flowColorValue(category.color) : flow.color;
  const ink = flowColorInk(category.color || flow.color);
  const tone = gradeTone(report.grade);
  const remaining = Math.max(0, (report.total || 0) - (report.done || 0));
  const periodDays = Number(report.periodDays) || 0;
  const daysLogged = Number(report.daysLogged) || 0;

  return (
    <article
      className={`report-cat-mini-card tone-${tone}`}
      style={{
        "--cat-bg": color,
        "--cat-ink": ink,
      }}
    >
      <div className="report-cat-mini-head">
        <div className="report-cat-mini-title-wrap">
          <span
            className="report-cat-mini-dot"
            style={{ background: color }}
            aria-hidden="true"
          />
          <h3 className="report-cat-mini-name">{category.name}</h3>
        </div>
        <span className={`report-cat-mini-grade grade-${String(report.grade || "F").replace("+", "p")}`}>
          {report.grade}
        </span>
      </div>

      <div className="report-cat-mini-body">
        <div className="report-cat-mini-ring-wrap">
          <MiniProgressRing pct={report.pct} ink={ink} />
        </div>
        <div className="report-cat-mini-stats">
          <div className="report-cat-mini-stat-row">
            <span>Steps</span>
            <strong>{report.done}/{report.total || 0}</strong>
          </div>
          <div className="report-cat-mini-stat-row">
            <span>Remaining</span>
            <strong>{remaining} ({report.pct}%)</strong>
          </div>
          {periodDays > 1 ? (
            <div className="report-cat-mini-stat-row">
              <span>Days logged</span>
              <strong>{daysLogged}/{periodDays}</strong>
            </div>
          ) : (
            <div className="report-cat-mini-stat-row">
              <span>Status</span>
              <strong className={`report-cat-status-tag tone-${tone}`}>
                {report.pct >= 100 ? "Complete" : report.pct > 0 ? "In progress" : "Pending"}
              </strong>
            </div>
          )}
        </div>
      </div>

      <div className="report-cat-mini-foot">
        <Link to={`/app/flows/${flow.id}`} className="report-cat-mini-link">
          Review steps
          <ArrowUpRight size={13} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export function CategoryReportCards({ flow, report, live, periodLabel, mini = true }) {
  const cats =
    Array.isArray(report.categories) && report.categories.length
      ? report.categories
      : flowCategories(flow)
          .map((c) => {
            const row = (report.categories || []).find((x) => x.id === c.id);
            return row ? { ...c, ...row } : null;
          })
          .filter(Boolean);
  if (!cats.length) return null;

  if (mini) {
    return cats.map((cat) => (
      <CategoryMiniCard
        key={`${flow.id}-${cat.id}-${report.dateKey}-${periodLabel || "day"}`}
        flow={flow}
        category={cat}
        report={{
          ...report,
          pct: cat.pct,
          grade: cat.grade || gradeFromPct(cat.pct),
          feedback: cat.feedback || feedbackForGrade(cat.grade || gradeFromPct(cat.pct)),
          done: cat.done,
          total: cat.total,
          periodDays: report.periodDays,
          daysLogged: report.daysLogged,
        }}
        live={live}
        periodLabel={periodLabel}
      />
    ));
  }

  return cats.map((cat) => (
    <EverydayReportCard
      key={`${flow.id}-${cat.id}-${report.dateKey}-${periodLabel || "day"}`}
      flow={flow}
      report={{
        ...report,
        pct: cat.pct,
        grade: cat.grade || gradeFromPct(cat.pct),
        feedback: cat.feedback || feedbackForGrade(cat.grade || gradeFromPct(cat.pct)),
        done: cat.done,
        total: cat.total,
        periodDays: report.periodDays,
        daysLogged: report.daysLogged,
      }}
      live={live}
      accent={cat.color}
      title={cat.name}
      eyebrow={
        periodLabel
          ? `${flow.name} · ${periodLabel}`
          : live
            ? `${flow.name} · today`
            : `${flow.name} · daily`
      }
    />
  ));
}
