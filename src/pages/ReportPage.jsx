import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, Trophy } from "lucide-react";
import { useTaskStore } from "../store/useTaskStore";
import { EverydayReportCard } from "../components/EverydayReportCard";
import { mostReliableCategory } from "../lib/flowAchievements";
import {
  buildEverydayReport,
  flowColorInk,
  flowColorValue,
  isEverydayActive,
  periodReportForFlow,
  REPORT_PERIODS,
} from "../lib/flowService";
import { formatFriendly, toKey, todayKey } from "../lib/date";
import HabitHeatmap from "../components/HabitHeatmap";

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toKey(d);
}

export default function ReportPage() {
  const followFlows = useTaskStore((s) => s.followFlows) || [];
  const quickTasks = useTaskStore((s) => s.quickTasks) || [];
  const dailyMoods = useTaskStore((s) => s.dailyMoods) || {};
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
        if (!overall) return null;
        return { flow, overall };
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
        <p>One overall card per flow. Tap it to open each category’s performance.</p>
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
                      to={`/app/reports/${flow.id}`}
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

          {/* 365-Day Consistency Heatmap */}
          <HabitHeatmap
            quickTasks={quickTasks}
            followFlows={followFlows}
            dailyMoods={dailyMoods}
          />

          {liveToday.length > 0 && (
            <section className="report-section" aria-label="Today live">
              <div className="flow-list-head">
                <div>
                  <h2>Today</h2>
                  <p className="flow-section-sub">Live progress — tap a card to see each category</p>
                </div>
              </div>
              <div className="report-pro-grid">
                {liveToday.map(({ flow, report }) => (
                  <EverydayReportCard
                    key={`live-${flow.id}`}
                    flow={flow}
                    report={report}
                    live
                    to={`/app/reports/${flow.id}`}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="report-section" aria-label="Period progress">
            <div className="flow-list-head">
              <div>
                <h2>Progress windows</h2>
                <p className="flow-section-sub">Last {period.label} — overall only</p>
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
                {periodBlocks.map(({ flow, overall }) => (
                  <EverydayReportCard
                    key={`period-${flow.id}-${period.id}`}
                    flow={flow}
                    report={overall}
                    eyebrow={`${flow.name} · ${period.label}`}
                    title={flow.name}
                    to={`/app/reports/${flow.id}`}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="report-section" aria-label="Past report cards">
            <div className="flow-list-head">
              <div>
                <h2>{selectedDay === yesterdayKey() ? "Yesterday" : "Past day"}</h2>
                <p className="flow-section-sub">
                  Overall cards for {formatFriendly(selectedDay)}
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
                  <EverydayReportCard
                    key={`${flow.id}-${report.dateKey}`}
                    flow={flow}
                    report={report}
                    to={`/app/reports/${flow.id}`}
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
