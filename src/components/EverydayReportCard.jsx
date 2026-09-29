import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Check, ChevronDown, ListTodo, Share2, Sparkles, Star, TriangleAlert } from "lucide-react";
import ShareReportModal from "./ShareReportModal";
import {
  activeFlowSteps,
  feedbackForGrade,
  flowCategories,
  flowColorInk,
  flowColorValue,
  gradeFromPct,
  isStepMandatory,
  stepCategoryId,
} from "../lib/flowService";
import { formatFriendly, todayKey } from "../lib/date";

function gradeTone(grade) {
  if (!grade || grade === "—") return "neutral";
  const g = String(grade).charAt(0).toUpperCase();
  if (g === "A") return "high";
  if (g === "B") return "good";
  if (g === "C") return "mid";
  return "low";
}

function gradeClass(grade) {
  if (!grade || grade === "—") return "grade-none";
  return `grade-${String(grade).replace("+", "p")}`;
}

export function ProgressRing({ pct, ink, label = "of steps done" }) {
  const size = 148;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
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
        <span>{label}</span>
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
  categoryId,
}) {
  const [pendingOpen, setPendingOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const pct = Math.max(0, Math.min(100, Math.round(Number(report?.pct) || 0)));
  const color = accent ? flowColorValue(accent) : flow.color;
  const ink = flowColorInk(accent || flow.color);
  const tone = gradeTone(report?.grade);
  const total = Number(report?.total) || 0;
  const done = Number(report?.done) || 0;
  const remaining = Math.max(0, total - done);
  const stepDonePct = total > 0 ? Math.round((done / total) * 100) : 0;
  const periodDays = Number(report?.periodDays) || 0;
  const daysLogged = Number(report?.daysLogged) || 0;

  const status =
    total === 0
      ? "No steps scheduled today"
      : pct >= 97
        ? "Perfect stretch"
        : pct >= 80
          ? "Strong finish"
          : pct >= 50
            ? "Room to climb"
            : "Needs a reset";

  const targetDay = report?.dateKey || todayKey();

  const ringLabel =
    total === 0
      ? "no steps"
      : report?.hasMandatory
        ? "performance score"
        : "of steps done";

  const catMap = useMemo(() => {
    const map = new Map();
    flowCategories(flow).forEach((c) => map.set(c.id, c));
    return map;
  }, [flow]);

  // Compute active & pending steps strictly for live mode and scoped to categoryId if provided
  const activeSteps = useMemo(() => {
    if (!live || !flow) return [];
    const steps = activeFlowSteps(flow, targetDay);
    if (!categoryId) return steps;
    return steps.filter((s) => stepCategoryId(s, flow) === categoryId);
  }, [live, flow, targetDay, categoryId]);

  const pendingSteps = useMemo(() => {
    if (!live) return [];
    return activeSteps.filter((s) => !s.done);
  }, [live, activeSteps]);

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
        <div className="report-pro-head-right">
          {!to && (
            <button
              type="button"
              className="report-share-chip-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShareOpen(true);
              }}
              title="Share card as image"
            >
              <Share2 size={13} />
              <span>Share</span>
            </button>
          )}
          <span className={`report-pro-grade ${gradeClass(report?.grade)}`}>
            {report?.grade || "—"}
            <em>Grade</em>
          </span>
        </div>
      </header>

      <ProgressRing pct={pct} ink={ink} label={ringLabel} />

      <div className={`report-pro-alert tone-${tone}${report?.mandatoryFailed ? " is-mandatory-fail" : ""}`}>
        {report?.mandatoryFailed ? (
          <TriangleAlert size={14} aria-hidden="true" style={{ color: "#ef4444" }} />
        ) : pct >= 80 && total > 0 ? (
          <Sparkles size={14} aria-hidden="true" />
        ) : (
          <TriangleAlert size={14} aria-hidden="true" />
        )}
        <span>{report?.feedback || status}</span>
      </div>

      <div className="report-pro-stats">
        <div>
          <span>Steps</span>
          <strong>
            {done}/{total}
          </strong>
        </div>
        <div>
          <span>Remaining</span>
          <strong>
            {remaining} ({stepDonePct}% done)
          </strong>
        </div>
        <div>
          <span>{periodDays > 1 ? "Days logged" : live ? "As of" : "Day"}</span>
          <strong>
            {periodDays > 1
              ? `${daysLogged}/${periodDays}`
              : formatFriendly(report?.dateKey || targetDay)}
          </strong>
        </div>
      </div>

      {report?.hasMandatory && (
        <div className="report-mandatory-bar">
          <div className="report-mandatory-badge-group">
            <span className="report-mandatory-star-chip">
              <Star size={12} fill="#eab308" color="#ca8a04" />
              <span>
                Mandatory: <strong>{report.mandatoryDone}/{report.mandatoryTotal}</strong>
              </span>
            </span>
            {Number(report.optionalTotal) > 0 && (
              <span className="report-optional-chip">
                Optional: <strong>{report.optionalDone}/{report.optionalTotal}</strong>
              </span>
            )}
          </div>
          {report.mandatoryFailed ? (
            <span className="report-mandatory-flag is-fail">
              Automatic F — Missed starred task
            </span>
          ) : Number(report.extraMarksEarned) > 0 ? (
            <span className="report-mandatory-flag is-bonus">
              +{report.extraMarksEarned} extra bonus marks!
            </span>
          ) : (
            <span className="report-mandatory-flag is-pass">
              All mandatory completed (Base Grade {report.grade})
            </span>
          )}
        </div>
      )}

      {/* Dropdown to see which steps are pending for today (live only) */}
      {live && (
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
                    const cat = catMap.get(stepCategoryId(step, flow));
                    const isMandatory = isStepMandatory(step);
                    return (
                      <li
                        key={step.id || idx}
                        className={`report-pending-step-row${isMandatory ? " is-mandatory" : ""}`}
                      >
                        <span className="report-pending-dot" aria-hidden="true" />
                        <div className="report-pending-step-info">
                          <div className="report-pending-step-title-row">
                            <span className="report-pending-step-title">{step.title}</span>
                            {isMandatory && (
                              <span
                                className="report-pending-mandatory-tag"
                                title="Mandatory — must complete today to avoid F"
                              >
                                <Star size={10} fill="#eab308" color="#ca8a04" />
                                <span>Mandatory</span>
                              </span>
                            )}
                          </div>
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
      )}

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

  return (
    <>
      {to ? (
        <Link to={to} className="report-card-link">
          {card}
        </Link>
      ) : (
        card
      )}
      {!to && (
        <ShareReportModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          flow={flow}
          report={report}
        />
      )}
    </>
  );
}

export function MiniProgressRing({ pct, ink, size = 54, stroke = 6 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
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

export function CategoryMiniCard({ flow, category, report }) {
  const color = category.color ? flowColorValue(category.color) : flow.color;
  const ink = flowColorInk(category.color || flow.color);
  const tone = gradeTone(report?.grade);
  const pct = Math.max(0, Math.min(100, Math.round(Number(report?.pct) || 0)));
  const remaining = Math.max(0, (report?.total || 0) - (report?.done || 0));
  const periodDays = Number(report?.periodDays) || 0;
  const daysLogged = Number(report?.daysLogged) || 0;

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
        <span className={`report-cat-mini-grade ${gradeClass(report?.grade)}`}>
          {report?.grade || "—"}
        </span>
      </div>

      <div className="report-cat-mini-body">
        <div className="report-cat-mini-ring-wrap">
          <MiniProgressRing pct={pct} ink={ink} />
        </div>
        <div className="report-cat-mini-stats">
          <div className="report-cat-mini-stat-row">
            <span>Steps</span>
            <strong>
              {report?.done || 0}/{report?.total || 0}
            </strong>
          </div>
          <div className="report-cat-mini-stat-row">
            <span>Remaining</span>
            <strong>
              {remaining} ({pct}%)
            </strong>
          </div>
          {periodDays > 1 ? (
            <div className="report-cat-mini-stat-row">
              <span>Days logged</span>
              <strong>
                {daysLogged}/{periodDays}
              </strong>
            </div>
          ) : (
            <div className="report-cat-mini-stat-row">
              <span>Status</span>
              <strong className={`report-cat-status-tag tone-${tone}`}>
                {pct >= 100 ? "Complete" : pct > 0 ? "In progress" : "Pending"}
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
    Array.isArray(report?.categories) && report.categories.length
      ? report.categories
      : flowCategories(flow).map((c) => ({ ...c, pct: 0, done: 0, total: 0 }));

  if (!cats.length) return null;

  if (mini) {
    return cats.map((cat) => (
      <CategoryMiniCard
        key={`${flow.id}-${cat.id}-${report?.dateKey}-${periodLabel || "day"}`}
        flow={flow}
        category={cat}
        report={{
          ...report,
          pct: cat.pct,
          grade: cat.grade || gradeFromPct(cat.pct),
          feedback: cat.feedback || feedbackForGrade(cat.grade || gradeFromPct(cat.pct)),
          done: cat.done,
          total: cat.total,
          periodDays: report?.periodDays,
          daysLogged: report?.daysLogged,
        }}
      />
    ));
  }

  return cats.map((cat) => (
    <EverydayReportCard
      key={`${flow.id}-${cat.id}-${report?.dateKey}-${periodLabel || "day"}`}
      flow={flow}
      categoryId={cat.id}
      report={{
        ...report,
        pct: cat.pct,
        grade: cat.grade || gradeFromPct(cat.pct),
        feedback: cat.feedback || feedbackForGrade(cat.grade || gradeFromPct(cat.pct)),
        done: cat.done,
        total: cat.total,
        periodDays: report?.periodDays,
        daysLogged: report?.daysLogged,
        hasMandatory: Boolean(cat.hasMandatory),
        mandatoryFailed: Boolean(cat.mandatoryFailed),
        mandatoryTotal: Number(cat.mandatoryTotal) || 0,
        mandatoryDone: Number(cat.mandatoryDone) || 0,
        mandatoryMissed: Number(cat.mandatoryMissed) || 0,
        optionalTotal: Number(cat.optionalTotal) || 0,
        optionalDone: Number(cat.optionalDone) || 0,
        extraMarksEarned: Number(cat.extraMarksEarned) || 0,
        baseMarksEarned: Number(cat.baseMarksEarned) || 0,
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
