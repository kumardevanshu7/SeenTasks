import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ClipboardList, Sparkles, TriangleAlert } from "lucide-react";
import { useTaskStore } from "../store/useTaskStore";
import {
  feedbackForGrade,
  flowColorInk,
  flowProgress,
  gradeFromPct,
  isEverydayActive,
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

function ReportCard({ flow, report, live = false }) {
  const ink = flowColorInk(flow.color);
  const tone = gradeTone(report.grade);
  const remaining = Math.max(0, (report.total || 0) - (report.done || 0));
  const status =
    report.pct >= 97
      ? "Perfect day"
      : report.pct >= 80
        ? "Strong finish"
        : report.pct >= 50
          ? "Room to climb"
          : "Needs a reset";

  return (
    <article
      className={`report-pro-card tone-${tone}`}
      style={{
        "--flow-bg": flow.color,
        "--flow-ink": ink,
      }}
    >
      <header className="report-pro-head">
        <div>
          <p className="report-pro-eyebrow">{live ? "Today · live" : "Report card"}</p>
          <h2>{flow.name}</h2>
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
          <span>{live ? "As of" : "Day"}</span>
          <strong>{formatFriendly(report.dateKey)}</strong>
        </div>
      </div>

      <p className="report-pro-foot">{live ? "Grade preview — locks after midnight" : status}</p>

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

export default function ReportPage() {
  const followFlows = useTaskStore((s) => s.followFlows) || [];
  const rollEverydayFlows = useTaskStore((s) => s.rollEverydayFlows);
  const [selectedDay, setSelectedDay] = useState(() => yesterdayKey());

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
        const prog = flowProgress(flow, day);
        if (prog.total === 0) return null;
        const grade = gradeFromPct(prog.pct);
        return {
          flow,
          report: {
            dateKey: day,
            pct: prog.pct,
            grade,
            feedback: prog.complete
              ? feedbackForGrade(grade)
              : "Still in progress — keep moving through today’s sequence.",
            done: prog.done,
            total: prog.total,
          },
        };
      })
      .filter(Boolean);
  }, [everydayFlows]);

  return (
    <div className="page narrow-page page-reports">
      <section className="simple-hero simple-hero-compact">
        <p className="eyebrow">Everyday</p>
        <h1>Report</h1>
        <p>Daily grades for your Everyday flows — how complete each day really was.</p>
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
                  <ReportCard key={`live-${flow.id}`} flow={flow} report={report} live />
                ))}
              </div>
            </section>
          )}

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
                  <ReportCard
                    key={`${flow.id}-${report.dateKey}`}
                    flow={flow}
                    report={report}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
