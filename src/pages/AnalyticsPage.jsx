import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
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

  const { overview, dailyTrend, hourlyDistribution, peakHourWindow, categoryBreakdown, moodEntries, smartInsights } =
    analytics;

  // Max value in daily trend for SVG scaling
  const maxDayTotal = Math.max(...dailyTrend.map((d) => d.totalAll), 5);

  return (
    <div className="page narrow-page analytics-page">
      {/* Top Header */}
      <div className="analytics-header">
        <div className="analytics-header-left">
          <Link to="/app" className="workspace-back">
            <ArrowLeft size={16} /> Back to tasks
          </Link>
          <div className="analytics-title-wrap">
            <span className="analytics-badge-icon">
              <TrendingUp size={20} />
            </span>
            <div>
              <h1>Productivity Analytics</h1>
              <p>Real-time performance trends, completion velocity & focus insights</p>
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
            <Zap size={17} className="kpi-icon-accent" />
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
            <CheckCircle2 size={17} className="kpi-icon-accent" />
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
            <span>Streak Health</span>
            <Flame size={17} className="kpi-icon-accent" />
          </div>
          <div className="analytics-kpi-val">
            <strong>{overview.activeShields}</strong>
            <small>shields left</small>
          </div>
          <div className="analytics-kpi-foot">
            <span>{overview.achievementsCount} / 250 achievements earned</span>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <div className="analytics-kpi-head">
            <span>Golden Peak Window</span>
            <Clock size={17} className="kpi-icon-accent" />
          </div>
          <div className="analytics-kpi-val">
            <strong className="analytics-kpi-time">{peakHourWindow}</strong>
          </div>
          <div className="analytics-kpi-foot">
            <span>Highest execution density</span>
          </div>
        </div>
      </section>

      {/* Chart 1: Daily Completion Velocity (SVG) */}
      <section className="analytics-card" aria-label="Daily Completion Trend">
        <div className="analytics-card-header">
          <div>
            <h2>Daily Completion Trend</h2>
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
              const heightPct = Math.max(12, Math.round((d.totalAll / maxDayTotal) * 100));
              const doneHeightPct = d.totalAll > 0 ? Math.round((d.totalDone / d.totalAll) * 100) : 0;
              const isHovered = activeHoverBar === idx;

              return (
                <div
                  key={d.dateKey}
                  className={`analytics-bar-col${d.isToday ? " is-today" : ""}${isHovered ? " is-hovered" : ""}`}
                  onMouseEnter={() => setActiveHoverBar(idx)}
                  onMouseLeave={() => setActiveHoverBar(null)}
                >
                  {/* Tooltip on Hover */}
                  {isHovered && (
                    <div className="analytics-bar-tooltip">
                      <strong>{d.dayName}, {d.shortDate}</strong>
                      <span>{d.totalDone} of {d.totalAll} done ({d.pct}%)</span>
                      <small>{d.tasksDone} tasks · {d.flowDone} steps</small>
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

      {/* Grid: Hourly Activity Distribution & Category Breakdown */}
      <div className="analytics-two-col">
        {/* Hourly Peak Activity Heatmap */}
        <section className="analytics-card">
          <div className="analytics-card-header">
            <div>
              <h2>Hourly Focus Distribution</h2>
              <p>When you complete the most tasks throughout the 24-hour cycle</p>
            </div>
          </div>

          <div className="analytics-hourly-grid">
            {hourlyDistribution
              .filter((h) => h.hour >= 6 && h.hour <= 23) // Focus on active daytime hours 6 AM to 11 PM
              .map((h) => {
                const isPeak = h.pct >= 70 && h.count > 0;
                return (
                  <div key={h.hour} className={`analytics-hourly-bar${isPeak ? " is-peak" : ""}`}>
                    <div className="hourly-bar-tube">
                      <div
                        className="hourly-bar-level"
                        style={{ height: `${Math.max(8, h.pct)}%` }}
                        title={`${h.count} completions at ${h.label}`}
                      />
                    </div>
                    <span className="hourly-bar-time">{h.label.replace(" ", "")}</span>
                  </div>
                );
              })}
          </div>
          <div className="analytics-hourly-footer">
            <span>🌅 Morning (6 AM - 12 PM)</span>
            <span>☀️ Afternoon (12 PM - 6 PM)</span>
            <span>🌙 Night (6 PM - 11 PM)</span>
          </div>
        </section>

        {/* Category & Workspace Progress */}
        <section className="analytics-card">
          <div className="analytics-card-header">
            <div>
              <h2>Domain & Category Mastery</h2>
              <p>Completion performance grouped across workspaces and flows</p>
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
      </div>

      {/* Mood Energy & Consistency Spectrum */}
      <section className="analytics-card">
        <div className="analytics-card-header">
          <div>
            <h2>Nightly Mood & Reflection Spectrum</h2>
            <p>11:00 PM mood logs and mindsets recorded across this timeframe</p>
          </div>
          <Link to="/app" className="analytics-action-link">
            <Moon size={14} /> Open mood log
          </Link>
        </div>

        {moodEntries.length === 0 ? (
          <div className="analytics-empty-mood">
            <p>No nightly reflections logged yet in this timeframe.</p>
            <small>Log your mood daily between 11:00 PM and 11:59 PM to unlock mindset correlation analytics.</small>
          </div>
        ) : (
          <div className="analytics-mood-grid">
            {moodEntries.map((m) => (
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

      {/* Smart Automated Insights */}
      {smartInsights.length > 0 && (
        <section className="analytics-insights-section">
          <div className="analytics-section-title">
            <Sparkles size={17} />
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
