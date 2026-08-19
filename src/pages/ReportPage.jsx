import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ClipboardList, Sparkles, Trophy, TriangleAlert } from "lucide-react";
import { useTaskStore } from "../store/useTaskStore";
import { mostReliableCategory } from "../lib/flowAchievements";
import {
  buildEverydayReport,
  feedbackForGrade,
  flowCategories,
  flowColorInk,
  flowColorValue,
  gradeFromPct,
  isEverydayActive,
  periodReportForFlow,
  periodReportsForCategories,
  REPORT_PERIODS,
} from "../lib/flowService";
import { formatFriendly, toKey, todayKey } from "../lib/date";

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toKey(d);
}

function gradeTone(grade) {
  const g = String(grade || "F").replace("+", "p");
  if (g === "Ap" || g === "A") return "high";
  if (g === "Bp" || g === "B") return "good";
  if (g === "Cp" || g === "C") return "mid";
  return "low";
}

function ProgressRing({ pct, ink }) {
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

function ReportCard({
  flow,
  report,
  live = false,
  accent,
  title,
  eyebrow,
}) {
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

  return (
    <article
      className={`report-pro-card tone-${tone}`}
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

      <p className="report-pro-foot">
        {live
          ? "Grade preview — daily card locks after midnight"
          : periodDays > 1
            ? accent
              ? `${periodDays}-day completion on this tab`
              : `${periodDays}-day completion across all tabs`
            : status}
      </p>

      <div className="report-pro-actions">
        <Link to={`/app/flows/${flow.id}`} className="button button-secondary">
          Open flow
        </Link>
        <Link to={`/app/flows/${flow.id}`} className="button button-primary">
          Review steps
          <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function CategoryCards({ flow, report, live, periodLabel }) {
  const cats = Array.isArray(report.categories) && report.categories.length
    ? report.categories
    : flowCategories(flow)
        .map((c) => {
          const row = (report.categories || []).find((x) => x.id === c.id);
          return row ? { ...c, ...row } : null;
        })
        .filter(Boolean);
  if (!cats.length) return null;
  return cats.map((cat) => (
    <ReportCard
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
      eyebrow={periodLabel ? `${flow.name} · ${periodLabel}` : live ? `${flow.name} · today` : `${flow.name} · daily`}
    />
  ));
}

export default function ReportPage() {
  const followFlows = useTaskStore((s) => s.followFlows) || [];
  const rollEverydayFlows = useTaskStore((s) => s.rollEverydayFlows);
  const [selectedDay, setSelectedDay] = useState(() => yesterdayKey());
  const [periodId, setPeriodId] = useState("week");

  useEffect(() => {
    rollEverydayFlows();
    const id = window.setInterval(() => rollEverydayFlows(), 30_000);
    const onFocus = () => rollEverydayFlows();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [rollEverydayFlows]);

  const everydayFlows = useMemo(
    () => followFlows.filter((f) => f.repeat === "daily"),
    [followFlows]
  );

  const dayOptions = useMemo(() => {
    const set = new Set();
    set.add(yesterdayKey());
    everydayFlows.forEach((f) => {
      (f.reports || []).forEach((r) => {
        if (r?.dateKey) set.add(r.dateKey);
      });
    });
    const today = todayKey();
    return [...set]
      .filter((k) => k !== today)
      .sort((a, b) => (a < b ? 1 : -1))
      .slice(0, 21);
  }, [everydayFlows]);

  useEffect(() => {
    if (dayOptions.length && !dayOptions.includes(selectedDay)) {
      setSelectedDay(dayOptions[0]);
    }
  }, [dayOptions, selectedDay]);

  const dayReports = useMemo(() => {
    return everydayFlows
      .map((flow) => {
        const report = (flow.reports || []).find((r) => r.dateKey === selectedDay);
        if (!report) return null;
        return { flow, report };
      })
      .filter(Boolean);
  }, [everydayFlows, selectedDay]);

  const liveToday = useMemo(() => {
    const day = todayKey();
    return everydayFlows
      .filter((f) => isEverydayActive(f, day))
      .map((flow) => {
        const report = buildEverydayReport(flow, day);
        if (report.total === 0) return null;
        const complete = report.done === report.total;
        return {
          flow,
          report: {
            ...report,
            feedback: complete
              ? report.feedback
              : "Still in progress — keep moving through today’s sequence.",
          },
        };
      })
      .filter(Boolean);
  }, [everydayFlows]);

  const period = REPORT_PERIODS.find((p) => p.id === periodId) || REPORT_PERIODS[0];
  const periodBlocks = useMemo(() => {
    const day = todayKey();
    return everydayFlows
      .map((flow) => {
        const overall = periodReportForFlow(flow, period.days, day);
        const categories = periodReportsForCategories(flow, period.days, day);
        if (!overall && !categories.length) return null;
        return { flow, overall, categories };
      })
      .filter(Boolean);
  }, [everydayFlows, period.days]);

  const reliableTabs = useMemo(
    () =>
      everydayFlows
        .map((flow) => ({ flow, cat: mostReliableCategory(flow) }))
        .filter((row) => row.cat && row.cat.completeDays > 0),
    [everydayFlows]
  );

  return (
    <div className="page narrow-page page-reports">
      <section className="simple-hero simple-hero-compact">
        <p className="eyebrow">Everyday</p>
        <h1>Report</h1>
        <p>Daily grades plus 7-day, 2-week, and 1-month completion — per flow and per tab.</p>
      </section>

      {everydayFlows.length === 0 ? (
        <div className="flow-empty-stage">
          <ClipboardList size={28} />
          <h2>No Everyday flows yet</h2>
          <p>Create a daily sequence on Follow Flow — report cards appear after midnight.</p>
          <Link to="/app/flows" className="button button-primary">
            Go to Flows
          </Link>
        </div>
      ) : (
        <>
          {reliableTabs.length > 0 && (
            <section className="report-section" aria-label="Most finished tabs">
              <div className="flow-list-head">
                <div>
                  <h2>You always finish</h2>
                  <p className="flow-section-sub">
                    The tab you complete most often — your reliable win
                  </p>
                </div>
              </div>
              <div className="report-reliable">
                {reliableTabs.map(({ flow, cat }) => {
                  const pct = Math.round((cat.rate || 0) * 100);
                  const always = cat.logged >= 3 && cat.rate >= 0.8;
                  return (
                    <Link
                      key={`${flow.id}-${cat.id}`}
                      to={`/app/flows/${flow.id}`}
                      className="report-reliable-card"
                      style={{
                        "--cat-bg": flowColorValue(cat.color),
                        "--cat-ink": flowColorInk(cat.color),
                      }}
                    >
                      <Trophy size={18} aria-hidden="true" />
                      <div>
                        <strong>{cat.name}</strong>
                        <span>
                          {flow.name} · {cat.completeDays}/{cat.logged} days
                          {always ? " · always" : ` · ${pct}% of days`}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {liveToday.length > 0 && (
            <section className="report-section" aria-label="Today live">
              <div className="flow-list-head">
                <div>
                  <h2>Today</h2>
                  <p className="flow-section-sub">Live progress — grade locks in after 12:00 AM</p>
                </div>
              </div>
              <div className="report-pro-grid">
                {liveToday.map(({ flow, report }) => (
                  <Fragment key={`live-${flow.id}`}>
                    <ReportCard flow={flow} report={report} live />
                    <CategoryCards flow={flow} report={report} live />
                  </Fragment>
                ))}
              </div>
            </section>
          )}

          <section className="report-section" aria-label="Period progress">
            <div className="flow-list-head">
              <div>
                <h2>Progress windows</h2>
                <p className="flow-section-sub">
                  Completion across the last {period.label} — overall and each tab
                </p>
              </div>
            </div>
            <div className="report-day-strip" role="tablist" aria-label="Progress window">
              {REPORT_PERIODS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={p.id === periodId}
                  className={`report-day-chip${p.id === periodId ? " is-active" : ""}`}
                  onClick={() => setPeriodId(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {periodBlocks.length === 0 ? (
              <p className="flow-section-empty">
                Tick steps today — this window fills as days lock in after midnight.
              </p>
            ) : (
              <div className="report-pro-grid">
                {periodBlocks.map(({ flow, overall, categories }) => (
                  <Fragment key={`period-${flow.id}-${period.id}`}>
                    {overall && (
                      <ReportCard
                        flow={flow}
                        report={overall}
                        eyebrow={`${flow.name} · ${period.label}`}
                        title={flow.name}
                      />
                    )}
                    {categories.map(({ category, report }) => (
                      <ReportCard
                        key={`${flow.id}-${category.id}-${period.id}`}
                        flow={flow}
                        report={report}
                        accent={category.color}
                        title={category.name}
                        eyebrow={`${flow.name} · ${period.label}`}
                      />
                    ))}
                  </Fragment>
                ))}
              </div>
            )}
          </section>

          <section className="report-section" aria-label="Past report cards">
            <div className="flow-list-head">
              <div>
                <h2>{selectedDay === yesterdayKey() ? "Yesterday" : "Past day"}</h2>
                <p className="flow-section-sub">
                  Report cards for {formatFriendly(selectedDay)}
                </p>
              </div>
            </div>

            {dayOptions.length > 1 && (
              <div className="report-day-strip" role="tablist" aria-label="Report days">
                {dayOptions.map((key) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={key === selectedDay}
                    className={`report-day-chip${key === selectedDay ? " is-active" : ""}`}
                    onClick={() => setSelectedDay(key)}
                  >
                    {formatFriendly(key)}
                  </button>
                ))}
              </div>
            )}

            {dayReports.length === 0 ? (
              <p className="flow-section-empty">
                No report for this day yet — finish an Everyday flow and check back after midnight.
              </p>
            ) : (
              <div className="report-pro-grid">
                {dayReports.map(({ flow, report }) => (
                  <Fragment key={`${flow.id}-${report.dateKey}`}>
                    <ReportCard flow={flow} report={report} />
                    <CategoryCards flow={flow} report={report} />
                  </Fragment>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
