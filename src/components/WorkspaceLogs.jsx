import { useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Filter,
  History,
  Layers,
  Search,
  Sparkles,
  Tag,
  Timer,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { useTaskStore } from "../store/useTaskStore";
import { labelColorInk, DEFAULT_WORKSPACE_ID, workspaceColorInk } from "../lib/quickTaskService";
import {
  daysBetween,
  formatClock,
  formatDateTime,
  formatFriendly,
  todayKey,
  toKey,
} from "../lib/date";

/**
 * Computes creative log insights for a completed task:
 * - When it was completed ("kabh kiya tha")
 * - Turnaround duration ("kitna time laga")
 * - Timing performance vs due date or planned day ("jaldi kiya ya time se pehle")
 */
function getTaskLogInsights(task) {
  const completedDateKey = task.completedAt ? toKey(task.completedAt) : (task.dateKey || todayKey());
  const completedTime = task.completedAt ? formatClock(task.completedAt) : null;

  // 1. Duration / turnaround ("kitna time laga")
  let durationLabel = null;
  let durationMinutes = null;
  if (task.createdAt && task.completedAt) {
    const startMs = new Date(task.createdAt).getTime();
    const endMs = new Date(task.completedAt).getTime();
    if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs >= startMs) {
      durationMinutes = Math.round((endMs - startMs) / 60000);
      if (durationMinutes < 1) {
        durationLabel = "< 1m";
      } else if (durationMinutes < 60) {
        durationLabel = `${durationMinutes}m`;
      } else if (durationMinutes < 1440) {
        const h = Math.floor(durationMinutes / 60);
        const m = durationMinutes % 60;
        durationLabel = m > 0 ? `${h}h ${m}m` : `${h}h`;
      } else {
        const d = Math.floor(durationMinutes / 1440);
        const h = Math.floor((durationMinutes % 1440) / 60);
        durationLabel = h > 0 ? `${d}d ${h}h` : `${d}d`;
      }
    }
  } else if (task.dateKey && completedDateKey) {
    if (task.dateKey === completedDateKey) {
      durationLabel = "Same day";
    } else if (task.dateKey < completedDateKey) {
      const d = daysBetween(task.dateKey, completedDateKey);
      durationLabel = `${d}d`;
    }
  }

  // 2. Timing verdict ("jaldi kiya ya time se pehle toh kitna pehle")
  let badgeVariant = "neutral"; // "early" | "ontime" | "late" | "neutral"
  let badgeLabel = "Completed";
  let badgeTooltip = "Completed task";

  if (task.dueDate) {
    const dueKey = task.dueDate;
    if (completedDateKey < dueKey) {
      const diff = daysBetween(completedDateKey, dueKey);
      badgeVariant = "early";
      badgeLabel = diff === 1 ? "1 day early ⚡" : `${diff} days early ⚡`;
      badgeTooltip = `Completed ${diff} day${diff > 1 ? "s" : ""} before due date (${formatFriendly(dueKey)})`;
    } else if (completedDateKey === dueKey) {
      badgeVariant = "ontime";
      badgeLabel = "On time 🎯";
      badgeTooltip = `Completed right on due date (${formatFriendly(dueKey)})`;
    } else {
      const diff = daysBetween(dueKey, completedDateKey);
      badgeVariant = "late";
      badgeLabel = diff === 1 ? "1 day late" : `${diff} days late`;
      badgeTooltip = `Completed ${diff} day${diff > 1 ? "s" : ""} after deadline (${formatFriendly(dueKey)})`;
    }
  } else if (task.dateKey) {
    const planKey = task.dateKey;
    if (completedDateKey < planKey) {
      const diff = daysBetween(completedDateKey, planKey);
      badgeVariant = "early";
      badgeLabel = diff === 1 ? "1 day ahead ⚡" : `${diff}d ahead ⚡`;
      badgeTooltip = `Completed ${diff} day${diff > 1 ? "s" : ""} ahead of schedule (${formatFriendly(planKey)})`;
    } else if (completedDateKey === planKey) {
      if (durationMinutes !== null && durationMinutes <= 45) {
        badgeVariant = "early";
        badgeLabel = "Fast finish ⚡";
        badgeTooltip = `Finished quickly in ${durationLabel}`;
      } else {
        badgeVariant = "ontime";
        badgeLabel = "On schedule ✨";
        badgeTooltip = `Completed on scheduled day (${formatFriendly(planKey)})`;
      }
    } else {
      const diff = daysBetween(planKey, completedDateKey);
      badgeVariant = "late";
      badgeLabel = diff === 1 ? "+1d delayed" : `+${diff}d delayed`;
      badgeTooltip = `Completed ${diff} day${diff > 1 ? "s" : ""} after planned day`;
    }
  }

  // Started date (if created on a prior day)
  let startedDateLabel = null;
  if (task.createdAt) {
    const createdKey = toKey(task.createdAt);
    if (createdKey && createdKey !== completedDateKey) {
      startedDateLabel = formatFriendly(createdKey);
    }
  }

  return {
    completedTime,
    completedDateKey,
    durationLabel,
    badgeVariant,
    badgeLabel,
    badgeTooltip,
    startedDateLabel,
  };
}

export default function WorkspaceLogs({
  workspaceId = DEFAULT_WORKSPACE_ID,
  workspaceName = "Workspace",
  workspaceColor = "#c9dff3",
  initialLabelId = null,
  onSwitchToTasks = null,
}) {
  const quickTasks = useTaskStore((s) => s.quickTasks) || [];
  const quickLabels = useTaskStore((s) => s.quickLabels) || [];

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLabelId, setSelectedLabelId] = useState(() => initialLabelId || "__all__");
  const [timeRange, setTimeRange] = useState("all"); // "all" | "today" | "7d" | "30d"
  const [sortBy, setSortBy] = useState("newest"); // "newest" | "oldest"

  // Map of quick labels by ID
  const labelsById = useMemo(() => {
    const map = {};
    (quickLabels || []).forEach((l) => {
      map[l.id] = l;
    });
    return map;
  }, [quickLabels]);

  // All tasks strictly scoped to this workspace (ignoring flow mirrors)
  const allWorkspaceTasks = useMemo(() => {
    return (quickTasks || []).filter(
      (t) => !t.flowRef && (t.workspaceId || DEFAULT_WORKSPACE_ID) === workspaceId
    );
  }, [quickTasks, workspaceId]);

  // All completed tasks in this workspace
  const completedTasks = useMemo(() => {
    return allWorkspaceTasks.filter((t) => Boolean(t.done));
  }, [allWorkspaceTasks]);

  // Workspace stats computation ("little stats")
  const stats = useMemo(() => {
    const totalDone = completedTasks.length;
    const totalAll = allWorkspaceTasks.length;
    const completionRate = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;

    const todayStr = todayKey();
    let todayCount = 0;
    let weekCount = 0;
    const labelCounts = { __all__: totalDone, __none__: 0 };

    completedTasks.forEach((t) => {
      const doneKey = t.completedAt ? toKey(t.completedAt) : t.dateKey || todayStr;
      if (doneKey === todayStr) {
        todayCount += 1;
      }
      if (daysBetween(doneKey, todayStr) <= 7) {
        weekCount += 1;
      }

      const ids = Array.isArray(t.labelIds) && t.labelIds.length > 0
        ? t.labelIds.filter(Boolean).map(String)
        : t.labelId
          ? [String(t.labelId)]
          : [];

      if (ids.length === 0) {
        labelCounts.__none__ = (labelCounts.__none__ || 0) + 1;
      } else {
        ids.forEach((id) => {
          labelCounts[id] = (labelCounts[id] || 0) + 1;
        });
      }
    });

    // Find top completed label
    let topLabel = null;
    let topCount = 0;
    Object.entries(labelCounts).forEach(([id, count]) => {
      if (id !== "__all__" && id !== "__none__" && count > topCount) {
        topCount = count;
        topLabel = labelsById[id] || { id, name: id, color: null };
      }
    });

    return {
      totalDone,
      totalAll,
      completionRate,
      todayCount,
      weekCount,
      labelCounts,
      topLabel,
      topCount,
    };
  }, [completedTasks, allWorkspaceTasks, labelsById]);

  // Filter and sort completed tasks
  const filteredTasks = useMemo(() => {
    let list = [...completedTasks];

    // Filter by label
    if (selectedLabelId && selectedLabelId !== "__all__") {
      if (selectedLabelId === "__none__") {
        list = list.filter((t) => {
          const ids = Array.isArray(t.labelIds) && t.labelIds.length > 0
            ? t.labelIds.filter(Boolean)
            : t.labelId
              ? [t.labelId]
              : [];
          return ids.length === 0;
        });
      } else {
        list = list.filter((t) => {
          const ids = Array.isArray(t.labelIds) && t.labelIds.length > 0
            ? t.labelIds.filter(Boolean).map(String)
            : t.labelId
              ? [String(t.labelId)]
              : [];
          return ids.includes(String(selectedLabelId));
        });
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((t) => (t.title || "").toLowerCase().includes(q));
    }

    // Filter by timeframe
    if (timeRange !== "all") {
      const todayStr = todayKey();
      if (timeRange === "today") {
        list = list.filter((t) => {
          const doneKey = t.completedAt ? toKey(t.completedAt) : t.dateKey;
          return doneKey === todayStr;
        });
      } else if (timeRange === "7d") {
        list = list.filter((t) => {
          const doneKey = t.completedAt ? toKey(t.completedAt) : t.dateKey;
          return doneKey && daysBetween(doneKey, todayStr) <= 7;
        });
      } else if (timeRange === "30d") {
        list = list.filter((t) => {
          const doneKey = t.completedAt ? toKey(t.completedAt) : t.dateKey;
          return doneKey && daysBetween(doneKey, todayStr) <= 30;
        });
      }
    }

    // Sort order
    list.sort((a, b) => {
      const timeA = a.completedAt || a.dateKey || a.createdAt || "";
      const timeB = b.completedAt || b.dateKey || b.createdAt || "";
      return sortBy === "oldest" ? timeA.localeCompare(timeB) : timeB.localeCompare(timeA);
    });

    return list;
  }, [completedTasks, selectedLabelId, searchQuery, timeRange, sortBy]);

  // Group filtered tasks by completion day
  const groupedTasks = useMemo(() => {
    const groups = [];
    const map = new Map();
    const todayStr = todayKey();

    filteredTasks.forEach((task) => {
      const dateKey = task.completedAt ? toKey(task.completedAt) : task.dateKey || todayStr;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
        groups.push({ dateKey, items: map.get(dateKey) });
      }
      map.get(dateKey).push(task);
    });

    return groups;
  }, [filteredTasks]);

  const activeLabelObj = selectedLabelId && selectedLabelId !== "__all__" && selectedLabelId !== "__none__"
    ? labelsById[selectedLabelId] || { id: selectedLabelId, name: selectedLabelId, color: null }
    : null;

  return (
    <section className="workspace-logs-section" aria-label="Completed task logs">
      {/* ── Little Stats Header Cards ───────────────────────────── */}
      <div className="workspace-logs-stats-grid">
        <div className="workspace-logs-stat-card is-primary">
          <div className="workspace-logs-stat-head">
            <span>Total Completed</span>
            <CheckCircle2 size={16} className="stat-icon-accent" />
          </div>
          <div className="workspace-logs-stat-val">
            <strong>{stats.totalDone}</strong>
            <span className="workspace-logs-stat-sub">
              {stats.totalAll - stats.totalDone} still active
            </span>
          </div>
          <div className="workspace-logs-stat-foot">
            <span>Workspace task archives</span>
          </div>
        </div>

        <div className="workspace-logs-stat-card">
          <div className="workspace-logs-stat-head">
            <span>Velocity</span>
            <TrendingUp size={16} className="stat-icon-accent" />
          </div>
          <div className="workspace-logs-stat-val">
            <strong>{stats.weekCount}</strong>
            <span className="workspace-logs-stat-sub">
              {stats.todayCount} today
            </span>
          </div>
          <div className="workspace-logs-stat-foot">
            <span>Completed in last 7 days</span>
          </div>
        </div>

        <div className="workspace-logs-stat-card">
          <div className="workspace-logs-stat-head">
            <span>Execution Rate</span>
            <Zap size={16} className="stat-icon-accent" />
          </div>
          <div className="workspace-logs-stat-val">
            <strong>{stats.completionRate}%</strong>
            <span className="workspace-logs-stat-sub">
              of {stats.totalAll} total
            </span>
          </div>
          <div className="workspace-logs-stat-foot">
            <span>Workspace efficiency</span>
          </div>
        </div>

        <div className="workspace-logs-stat-card">
          <div className="workspace-logs-stat-head">
            <span>Top Category</span>
            <Tag size={16} className="stat-icon-accent" />
          </div>
          <div className="workspace-logs-stat-val">
            {stats.topLabel ? (
              <div className="workspace-logs-top-label-wrap">
                {stats.topLabel.color && (
                  <span
                    className="workspace-logs-label-dot"
                    style={{ background: stats.topLabel.color }}
                    aria-hidden="true"
                  />
                )}
                <strong>{stats.topLabel.name}</strong>
              </div>
            ) : (
              <strong>—</strong>
            )}
            <span className="workspace-logs-stat-sub">
              {stats.topCount > 0 ? `${stats.topCount} tasks` : "No labels yet"}
            </span>
          </div>
          <div className="workspace-logs-stat-foot">
            <span>Most completed tag</span>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ────────────────────────────── */}
      <div className="workspace-logs-toolbar">
        {/* Search input */}
        <div className="workspace-logs-search">
          <Search size={14} className="workspace-logs-search-icon" aria-hidden="true" />
          <input
            type="text"
            className="workspace-logs-search-input"
            placeholder="Search completed tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search completed tasks"
          />
          {searchQuery && (
            <button
              type="button"
              className="workspace-logs-search-clear"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Timeframe Chips */}
        <div className="workspace-logs-time-chips" role="radiogroup" aria-label="Filter timeframe">
          {[
            { id: "all", label: "All time" },
            { id: "today", label: "Today" },
            { id: "7d", label: "Last 7 days" },
            { id: "30d", label: "Last 30 days" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={timeRange === t.id}
              className={`workspace-logs-time-chip${timeRange === t.id ? " is-active" : ""}`}
              onClick={() => setTimeRange(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Label Filter Tray ───────────────────────────────────── */}
      <div className="workspace-logs-label-tray" aria-label="Filter completed tasks by label">
        <Tag size={13} className="quick-label-tray-icon" aria-hidden="true" />

        {/* All Pill */}
        <button
          type="button"
          className={`quick-label-pill${selectedLabelId === "__all__" ? " is-filtered is-selected" : ""}`}
          onClick={() => setSelectedLabelId("__all__")}
          aria-pressed={selectedLabelId === "__all__"}
          title="Show all completed tasks"
        >
          All
          <span className="quick-label-count">({stats.totalDone})</span>
        </button>

        {/* Unlabeled Pill */}
        {(stats.labelCounts.__none__ > 0 || selectedLabelId === "__none__") && (
          <button
            type="button"
            className={`quick-label-pill${selectedLabelId === "__none__" ? " is-filtered is-selected" : ""}`}
            onClick={() => setSelectedLabelId((cur) => (cur === "__none__" ? "__all__" : "__none__"))}
            aria-pressed={selectedLabelId === "__none__"}
            title="Show completed tasks without a label"
          >
            None
            <span className="quick-label-count">({stats.labelCounts.__none__ || 0})</span>
          </button>
        )}

        {/* Custom Label Pills */}
        {(quickLabels || []).map((label) => {
          const isSelected = selectedLabelId === label.id;
          const count = stats.labelCounts[label.id] || 0;
          const ink = labelColorInk(label.color);

          return (
            <button
              key={label.id}
              type="button"
              className={`quick-label-pill${isSelected ? " is-filtered is-selected" : ""}`}
              style={
                isSelected
                  ? {
                      "--pill-bg": label.color,
                      "--pill-ink": ink,
                      background: label.color,
                      color: ink,
                      borderColor: ink,
                    }
                  : {
                      "--pill-bg": label.color,
                      "--pill-ink": ink,
                    }
              }
              onClick={() => setSelectedLabelId((cur) => (cur === label.id ? "__all__" : label.id))}
              aria-pressed={isSelected}
              title={`Filter completed tasks labeled "${label.name}"`}
            >
              {label.name}
              {count > 0 && <span className="quick-label-count">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Filter status banner if filtered */}
      {(selectedLabelId !== "__all__" || searchQuery || timeRange !== "all") && (
        <div className="workspace-logs-filter-banner">
          <div className="workspace-logs-filter-banner-text">
            <Filter size={13} aria-hidden="true" />
            <span>
              Showing {filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"}
              {activeLabelObj && (
                <>
                  {" "}with label <strong>“{activeLabelObj.name}”</strong>
                </>
              )}
              {selectedLabelId === "__none__" && " with no label"}
              {searchQuery && (
                <>
                  {" "}matching <em>"{searchQuery}"</em>
                </>
              )}
              {timeRange !== "all" && ` (${timeRange === "today" ? "Today" : timeRange === "7d" ? "Past 7 days" : "Past 30 days"})`}
            </span>
          </div>
          <button
            type="button"
            className="workspace-logs-filter-reset"
            onClick={() => {
              setSelectedLabelId("__all__");
              setSearchQuery("");
              setTimeRange("all");
            }}
          >
            Clear filters
          </button>
        </div>
      )}

      {/* ── Completed Tasks List ────────────────────────────────── */}
      <div className="workspace-logs-body">
        {filteredTasks.length === 0 ? (
          <div className="workspace-logs-empty">
            <div className="workspace-logs-empty-icon">
              <History size={32} />
            </div>
            {completedTasks.length === 0 ? (
              <>
                <h3>No completed tasks yet</h3>
                <p>
                  As you check off items in the {workspaceName} checklist, they will be archived here with their labels and completion timestamps.
                </p>
                {onSwitchToTasks && (
                  <button
                    type="button"
                    className="button button-primary workspace-logs-empty-btn"
                    onClick={onSwitchToTasks}
                  >
                    Go to Checklist
                  </button>
                )}
              </>
            ) : (
              <>
                <h3>No logs match your filter</h3>
                <p>Try clearing your search or switching label filters.</p>
                <button
                  type="button"
                  className="button button-secondary workspace-logs-empty-btn"
                  onClick={() => {
                    setSelectedLabelId("__all__");
                    setSearchQuery("");
                    setTimeRange("all");
                  }}
                >
                  Show all completed tasks ({completedTasks.length})
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="workspace-logs-groups">
            {groupedTasks.map((group) => {
              const groupDate = formatFriendly(group.dateKey);
              const isToday = group.dateKey === todayKey();

              return (
                <div key={group.dateKey} className="workspace-logs-group">
                  <div className="workspace-logs-group-header">
                    <span className="workspace-logs-group-date">
                      {isToday ? "Today" : groupDate}
                    </span>
                    <span className="workspace-logs-group-count">
                      {group.items.length} {group.items.length === 1 ? "task" : "tasks"}
                    </span>
                  </div>

                  <ul className="workspace-logs-list">
                    {group.items.map((task) => {
                      const labelIds = Array.isArray(task.labelIds) && task.labelIds.length > 0
                        ? task.labelIds
                        : task.labelId
                          ? [task.labelId]
                          : [];
                      const labels = labelIds.map((id) => labelsById[id]).filter(Boolean);
                      const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
                      const insight = getTaskLogInsights(task);

                      return (
                        <li key={task.id} className="workspace-log-row">
                          {/* Static Completed Indicator (read-only archive, cannot uncheck) */}
                          <div className="workspace-log-rail">
                            <span
                              className="workspace-log-check-static"
                              aria-label="Completed"
                              title="Completed"
                            >
                              <Check size={12} strokeWidth={2.6} aria-hidden="true" />
                            </span>
                          </div>

                          {/* Task Content */}
                          <div className="workspace-log-content">
                            <div className="workspace-log-title-row">
                              {/* Labels with exact colors */}
                              {labels.map((l) => (
                                <span
                                  key={l.id}
                                  className="quick-task-label-chip is-static"
                                  style={{
                                    "--label-bg": l.color,
                                    "--label-ink": labelColorInk(l.color),
                                  }}
                                >
                                  {l.name}
                                </span>
                              ))}

                              {/* Task Title with Strikethrough */}
                              <span className="workspace-log-title">
                                {task.title}
                              </span>
                            </div>

                            {/* Metadata row */}
                            <div className="workspace-log-meta">
                              {insight.startedDateLabel && (
                                <span className="workspace-log-meta-item" title="Task creation date">
                                  <History size={11} aria-hidden="true" />
                                  <span>Started {insight.startedDateLabel}</span>
                                </span>
                              )}

                              {task.dueDate && (
                                <span className="workspace-log-meta-item" title="Original expected deadline">
                                  <CalendarDays size={11} aria-hidden="true" />
                                  <span>Due {formatFriendly(task.dueDate)}</span>
                                </span>
                              )}

                              {subtasks.length > 0 && (
                                <span className="workspace-log-meta-item">
                                  <Layers size={11} aria-hidden="true" />
                                  <span>{subtasks.filter((s) => s.done).length}/{subtasks.length} steps</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Creative Log Telemetry & Insights (Replaces Delete/Reopen buttons) */}
                          <div className="workspace-log-insight" title={insight.badgeTooltip}>
                            <div className={`workspace-log-badge is-${insight.badgeVariant}`}>
                              {insight.badgeVariant === "early" && (
                                <Zap size={11} strokeWidth={2.4} aria-hidden="true" />
                              )}
                              {insight.badgeVariant === "ontime" && (
                                <CheckCircle2 size={11} strokeWidth={2.4} aria-hidden="true" />
                              )}
                              {insight.badgeVariant === "late" && (
                                <Clock size={11} strokeWidth={2.4} aria-hidden="true" />
                              )}
                              {insight.badgeVariant === "neutral" && (
                                <Check size={11} strokeWidth={2.4} aria-hidden="true" />
                              )}
                              <span>{insight.badgeLabel}</span>
                            </div>

                            <div className="workspace-log-timing-details">
                              {insight.completedTime ? (
                                <span className="workspace-log-timing-sub" title="Finished time">
                                  <Clock size={10} aria-hidden="true" />
                                  <span>{insight.completedTime}</span>
                                </span>
                              ) : (
                                <span className="workspace-log-timing-sub" title="Finished on">
                                  <CheckCircle2 size={10} aria-hidden="true" />
                                  <span>{formatFriendly(insight.completedDateKey)}</span>
                                </span>
                              )}

                              {insight.durationLabel && (
                                <>
                                  <span className="workspace-log-timing-sep" aria-hidden="true">•</span>
                                  <span className="workspace-log-timing-sub is-duration" title="Turnaround time">
                                    <Timer size={10} aria-hidden="true" />
                                    <span>
                                      {insight.durationLabel === "Same day" ? "Same day" : `Took ${insight.durationLabel}`}
                                    </span>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
