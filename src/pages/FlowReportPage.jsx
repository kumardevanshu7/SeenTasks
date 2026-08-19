import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTaskStore } from "../store/useTaskStore";
import { CategoryReportCards, EverydayReportCard } from "../components/EverydayReportCard";
import {
  buildEverydayReport,
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

export default function FlowReportPage() {
  const { flowId } = useParams();
  const followFlows = useTaskStore((s) => s.followFlows) || [];
  const rollEverydayFlows = useTaskStore((s) => s.rollEverydayFlows);
  const [periodId, setPeriodId] = useState("week");
  const [selectedDay, setSelectedDay] = useState(() => yesterdayKey());

  useEffect(() => {
    rollEverydayFlows();
  }, [rollEverydayFlows]);

  const flow = useMemo(
    () => followFlows.find((f) => f.id === flowId && f.repeat === "daily"),
    [followFlows, flowId]
  );

  const dayOptions = useMemo(() => {
    const set = new Set();
    set.add(yesterdayKey());
    (flow?.reports || []).forEach((r) => {
      if (r?.dateKey) set.add(r.dateKey);
    });
    const today = todayKey();
    return [...set]
      .filter((k) => k !== today)
      .sort((a, b) => (a < b ? 1 : -1))
      .slice(0, 21);
  }, [flow]);

  useEffect(() => {
    if (dayOptions.length && !dayOptions.includes(selectedDay)) {
      setSelectedDay(dayOptions[0]);
    }
  }, [dayOptions, selectedDay]);

  if (!flow) {
    return <Navigate to="/app/reports" replace />;
  }

  const day = todayKey();
  const live = isEverydayActive(flow, day) ? buildEverydayReport(flow, day) : null;
  const liveReport =
    live && live.total > 0
      ? {
          ...live,
          feedback:
            live.done === live.total
              ? live.feedback
              : "Still in progress — keep moving through today’s sequence.",
        }
      : null;

  const period = REPORT_PERIODS.find((p) => p.id === periodId) || REPORT_PERIODS[0];
  const periodOverall = periodReportForFlow(flow, period.days, day);
  const periodCats = periodReportsForCategories(flow, period.days, day);
  const periodReport = periodOverall
    ? {
        ...periodOverall,
        categories: periodCats.map(({ category, report }) => ({
          id: category.id,
          name: category.name,
          color: category.color,
          ...report,
        })),
      }
    : null;

  const past = (flow.reports || []).find((r) => r.dateKey === selectedDay) || null;

  return (
    <div className="page narrow-page page-reports">
      <div className="workspace-topbar">
        <Link to="/app/reports" className="workspace-back">
          <ArrowLeft size={16} /> Report
        </Link>
      </div>

      <section className="simple-hero simple-hero-compact">
        <p className="eyebrow">Overall · categories</p>
        <h1>{flow.name}</h1>
        <p>One overall card, then each tab’s performance.</p>
      </section>

      {liveReport && (
        <section className="report-section" aria-label="Today by category">
          <div className="flow-list-head">
            <div>
              <h2>Today</h2>
              <p className="flow-section-sub">Overall first, then every category</p>
            </div>
          </div>
          <div className="report-pro-grid">
            <EverydayReportCard flow={flow} report={liveReport} live />
            <CategoryReportCards flow={flow} report={liveReport} live />
          </div>
        </section>
      )}

      <section className="report-section" aria-label="Period by category">
        <div className="flow-list-head">
          <div>
            <h2>Progress windows</h2>
            <p className="flow-section-sub">Last {period.label} by tab</p>
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
        {periodReport ? (
          <div className="report-pro-grid">
            <EverydayReportCard
              flow={flow}
              report={periodReport}
              eyebrow={`${flow.name} · ${period.label}`}
            />
            <CategoryReportCards flow={flow} report={periodReport} periodLabel={period.label} />
          </div>
        ) : (
          <p className="flow-section-empty">Not enough days logged for this window yet.</p>
        )}
      </section>

      <section className="report-section" aria-label="Past day by category">
        <div className="flow-list-head">
          <div>
            <h2>{selectedDay === yesterdayKey() ? "Yesterday" : "Past day"}</h2>
            <p className="flow-section-sub">{formatFriendly(selectedDay)}</p>
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
        {past ? (
          <div className="report-pro-grid">
            <EverydayReportCard flow={flow} report={past} />
            <CategoryReportCards flow={flow} report={past} />
          </div>
        ) : (
          <p className="flow-section-empty">No locked report for this day yet.</p>
        )}
      </section>
    </div>
  );
}
