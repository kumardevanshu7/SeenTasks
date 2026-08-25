import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Layers,
  Moon,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useTaskStore } from "../store/useTaskStore";
import { computeAnalytics, ANALYTICS_RANGES } from "../lib/analyticsService";
import { evaluateUnlockedIds } from "../lib/flowAchievements";
import { todayKey } from "../lib/date";

export default function AnalyticsPage() {
  const [rangeId, setRangeId] = useState("7d");
  const [activeHoverBar, setActiveHoverBar] = useState(null);
  const [activeHoverHour, setActiveHoverHour] = useState(null);

  const quickTasks = useTaskStore((s) => s.quickTasks) || [];
  const followFlows = useTaskStore((s) => s.followFlows) || [];
  const workspaces = useTaskStore((s) => s.workspaces) || [];
  const dailyMoods = useTaskStore((s) => s.dailyMoods) || {};
  const streakShields = useTaskStore((s) => s.streakShields) || null;

  const unlockedAchievementCount = useMemo(() => {
    const unlocked = evaluateUnlockedIds(followFlows, todayKey(), streakShields?.usedDates || []);
    return unlocked.size;
  }, [followFlows, streakShields]);

  const analytics = useMemo(() => {
    return computeAnalytics(
      {
        quickTasks,
        followFlows,
        workspaces,
        dailyMoods,
        streakShields,
        unlockedAchievementCount,
      },
      rangeId
    );
  }, [quickTasks, followFlows, workspaces, dailyMoods, streakShields, unlockedAchievementCount, rangeId]);

  const {
    overview,
    dailyTrend,
    hourlyDistribution,
    periodBreakdown,
    totalHourlyCompletions,
    peakHourWindow,
    categoryBreakdown,
    moodEntries,
    smartInsights,
  } = analytics;

  // Max value in daily trend for SVG scaling
  const maxDayTotal = Math.max(...dailyTrend.map((d) => d.totalAll), 5);

  return (
    <div className="page narrow-page analytics-page">
      {/* Top Header */}
      <div className="analytics-header">
        <div className="analytics-header-left">
          <Link to="/app" className="workspace-back">
            <ArrowLeft size={15} /> Back to tasks
          </Link>
          <div className="analytics-title-wrap">
            <span className="analytics-badge-icon">
              <TrendingUp size={22} />
            </span>
            <div>
              <h1>Productivity Analytics</h1>
              <p>Performance velocity, focus time & habit correlation</p>
            </div>
          </div>
        </div>

        {/* Range Tabs */}
        <div className="analytics-range-tabs" role="tablist" aria-label="Timeframe">
          {ANALYTICS_RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={rangeId === r.id}
              className={`analytics-range-chip${rangeId === r.id ? " is-active" : ""}`}
              onClick={() => setRangeId(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Overview Grid */}
      <section className="analytics-kpi-grid" aria-label="Key Performance Indicators">
        <div className="analytics-kpi-card is-primary">
          <div className="analytics-kpi-head">
            <span>Productivity Score</span>
            <Zap size={16} className="kpi-icon-accent" />
          </div>
          <div className="analytics-kpi-val">
            <strong>{overview.completionRate}%</strong>
            <span className="analytics-kpi-tag">{overview.scoreBadge}</span>
          </div>
          <div className="analytics-kpi-foot">
            <span>{overview.grandTotalDone} of {overview.grandTotalAll} items executed</span>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <div className="analytics-kpi-head">
            <span>Task & Step Volume</span>
            <CheckCircle2 size={16} className="kpi-icon-accent" />
          </div>
          <div className="analytics-kpi-val">
            <strong>{overview.grandTotalDone}</strong>
            <small>completed</small>
          </div>
          <div className="analytics-kpi-foot">
            <span>{overview.totalTasksDone} quick tasks · {overview.totalFlowDone} flow steps</span>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <div className="analytics-kpi-head">
            <span>Streak Shields</span>
            <Flame size={16} className="kpi-icon-accent" />
          </div>
          <div className="analytics-kpi-val">
            <strong>{overview.activeShields}</strong>
            <small>shields left</small>
          </div>
          <div className="analytics-kpi-foot">
            <span>{overview.achievementsCount} / 250 achievements unlocked</span>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <div className="analytics-kpi-head">
            <span>Peak Focus Window</span>
            <Clock size={16} className="kpi-icon-accent" />
          </div>
          <div className="analytics-kpi-val">
            <strong className="analytics-kpi-time">{peakHourWindow}</strong>
          </div>
          <div className="analytics-kpi-foot">
            <span>Highest execution density</span>
          </div>
        </div>
      </section>

      {/* Chart 1: Daily Completion Velocity */}
      <section className="analytics-card" aria-label="Daily Completion Trend">
        <div className="analytics-card-header">
          <div>
            <h2>Daily Execution Velocity</h2>
            <p>Task and Everyday Flow completions over the selected timeframe</p>
          </div>
          <div className="analytics-chart-legend">
            <span className="legend-item"><i className="legend-dot is-done" /> Completed</span>
            <span className="legend-item"><i className="legend-dot is-pending" /> Pending</span>
          </div>
        </div>

        <div className="analytics-chart-wrapper">
          <div className="analytics-bars-container">
            {dailyTrend.map((d, idx) => {
              const heightPct = Math.max(14, Math.round((d.totalAll / maxDayTotal) * 100));
              const doneHeightPct = d.totalAll > 0 ? Math.round((d.totalDone / d.totalAll) * 100) : 0;
              const isHovered = activeHoverBar === idx;

              return (
                <div
                  key={d.dateKey}
                  className={`analytics-bar-col${d.isToday ? " is-today" : ""}${isHovered ? " is-hovered" : ""}`}
                  onMouseEnter={() => setActiveHoverBar(idx)}
                  onMouseLeave={() => setActiveHoverBar(null)}
                  onClick={() => setActiveHoverBar(isHovered ? null : idx)}
                >
                  {/* Tooltip on Hover/Tap */}
                  {isHovered && (
                    <div className="analytics-bar-tooltip">
                      <strong>{d.dayName}, {d.shortDate}</strong>
                      <span className="tooltip-stat">{d.totalDone} of {d.totalAll} done ({d.pct}%)</span>
                      <span className="tooltip-sub">{d.tasksDone} tasks · {d.flowDone} steps</span>
                    </div>
                  )}

                  <div className="analytics-bar-track-wrap" style={{ height: `${heightPct}%` }}>
                    <div className="analytics-bar-track">
                      <div
                        className="analytics-bar-fill"
                        style={{ height: `${doneHeightPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="analytics-bar-label">
                    <span className="bar-day">{d.dayName}</span>
                    <span className="bar-date">{d.shortDate.split(" ")[1]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 2: Hourly Focus Distribution (Completely Redesigned) */}
      <section className="analytics-card" aria-label="Hourly Focus Distribution">
        <div className="analytics-card-header">
          <div>
            <h2>Hourly Focus & Time Distribution</h2>
            <p>Understand which time blocks yield your highest productivity and deep work</p>
          </div>
          <span className="analytics-peak-pill">
            <Zap size={13} /> Golden Window: {peakHourWindow}
          </span>
        </div>

        {/* 3 Spacious Period Summary Cards */}
        <div className="analytics-period-cards">
          {periodBreakdown.map((p) => (
            <div key={p.id} className="analytics-period-card">
              <div className="period-card-top">
                <span className="period-icon">{p.icon}</span>
                <div className="period-meta">
                  <strong>{p.label}</strong>
                  <small>{p.time}</small>
                </div>
                <span className="period-pct">{p.pct}%</span>
              </div>
              <div className="period-meter">
                <div
                  className="period-meter-fill"
                  style={{ width: `${p.pct}%`, background: p.color }}
                />
              </div>
              <span className="period-foot">{p.count} completions logged</span>
            </div>
          ))}
        </div>

        {/* 24-Hour Timeline Bar Chart with Clean Spaced Ticks */}
        <div className="analytics-hourly-chart-wrap">
          <div className="analytics-hourly-bars">
            {hourlyDistribution
              .filter((h) => h.hour >= 6 && h.hour <= 23)
              .map((h, i) => {
                const isHovered = activeHoverHour === h.hour;
                const isPeak = h.pct >= 70 && h.count > 0;
                return (
                  <div
                    key={h.hour}
                    className={`hourly-tube-col${isPeak ? " is-peak" : ""}${isHovered ? " is-hovered" : ""}`}
                    onMouseEnter={() => setActiveHoverHour(h.hour)}
                    onMouseLeave={() => setActiveHoverHour(null)}
                    onClick={() => setActiveHoverHour(isHovered ? null : h.hour)}
                  >
                    {isHovered && (
                      <div className="analytics-hourly-tooltip">
                        <strong>{h.label}</strong>
                        <span>{h.count} completions</span>
                      </div>
                    )}
                    <div className="hourly-tube-track">
                      <div
                        className="hourly-tube-fill"
                        style={{ height: `${Math.max(10, h.pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Clean Spaced Time Ticks (Never Overlap) */}
          <div className="analytics-hourly-ticks" aria-hidden="true">
            <span>6 AM</span>
            <span>9 AM</span>
            <span>12 PM</span>
            <span>3 PM</span>
            <span>6 PM</span>
            <span>9 PM</span>
            <span>11 PM</span>
          </div>
        </div>
      </section>

      {/* Grid: Category Mastery & Mood Spectrum */}
      <div className="analytics-two-col">
        {/* Category & Workspace Mastery */}
        <section className="analytics-card">
          <div className="analytics-card-header">
            <div>
              <h2>Domain & Category Mastery</h2>
              <p>Completion rates across workspaces and Everyday Flow categories</p>
            </div>
          </div>

          {categoryBreakdown.length === 0 ? (
            <p className="analytics-empty-note">
              No categories or workspace tasks found in this period.
            </p>
          ) : (
            <div className="analytics-category-list">
              {categoryBreakdown.map((cat) => (
                <div key={cat.id} className="analytics-cat-row">
                  <div className="analytics-cat-info">
                    <div className="analytics-cat-name">
                      <span className="analytics-cat-dot" style={{ background: cat.color }} />
                      <strong>{cat.name}</strong>
                    </div>
                    <span className="analytics-cat-stat">
                      {cat.done} / {cat.total} ({cat.pct}%)
                    </span>
                  </div>
                  <div className="analytics-cat-meter">
                    <div
                      className="analytics-cat-bar"
                      style={{ width: `${cat.pct}%`, background: cat.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Nightly Mood & Mindset Reflection Spectrum */}
        <section className="analytics-card">
          <div className="analytics-card-header">
            <div>
              <h2>Nightly Mood Spectrum</h2>
              <p>11:00 PM mood logs and mindsets recorded across this timeframe</p>
            </div>
          </div>

          {moodEntries.length === 0 ? (
            <div className="analytics-empty-mood">
              <p>No nightly reflections logged yet in this timeframe.</p>
              <small>Log your mood daily between 11:00 PM and 11:59 PM to unlock mindset correlation analytics.</small>
            </div>
          ) : (
            <div className="analytics-mood-grid">
              {moodEntries.slice(0, 6).map((m) => (
                <div key={m.dateKey} className="analytics-mood-card">
                  <div className="analytics-mood-top">
                    <span className="analytics-mood-emoji">{m.emoji}</span>
                    <span className="analytics-mood-date">{m.shortDate}</span>
                  </div>
                  <strong className="analytics-mood-title">{m.title}</strong>
                  <span className="analytics-mood-tag">{m.tag}</span>
                  {m.note && <p className="analytics-mood-note">“{m.note}”</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Smart Automated Insights */}
      {smartInsights.length > 0 && (
        <section className="analytics-insights-section">
          <div className="analytics-section-title">
            <Sparkles size={18} />
            <h2>Productivity Patterns & Insights</h2>
          </div>
          <div className="analytics-insights-grid">
            {smartInsights.map((ins, i) => (
              <div key={i} className="analytics-insight-card">
                <span className="insight-icon">{ins.icon}</span>
                <div className="insight-body">
                  <strong>{ins.title}</strong>
                  <p>{ins.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
