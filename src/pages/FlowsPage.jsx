import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, ClipboardList, GitBranch, Plus, RefreshCw } from "lucide-react";
import CreateFlowModal from "../components/CreateFlowModal";
import { useTaskStore } from "../store/useTaskStore";
import { flowColorInk, flowProgress, isEverydayActive } from "../lib/flowService";
import { labelColorInk } from "../lib/quickTaskService";
import { formatFriendly, toKey, todayKey } from "../lib/date";

function flowStartedLabel(createdAt) {
  if (!createdAt) return null;
  try {
    return formatFriendly(createdAt);
  } catch {
    return null;
  }
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toKey(d);
}

function FlowCard({ flow, everyday, labels }) {
  const prog = flowProgress(flow);
  const started = flowStartedLabel(flow.createdAt);
  const active = everyday ? isEverydayActive(flow, todayKey()) : true;
  const ended = everyday && !active;

  return (
    <Link
      to={`/app/flows/${flow.id}`}
      className={`flow-list-card${ended ? " is-ended" : ""}`}
      style={{
        "--flow-bg": flow.color,
        "--flow-ink": flowColorInk(flow.color),
      }}
    >
      <div>
        <strong>
          {flow.name}
          {everyday && <em className="flow-everyday-badge">{ended ? "Ended" : "Everyday"}</em>}
        </strong>
        {labels.length > 0 && (
          <div className="flow-card-labels">
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
          </div>
        )}
        <span>
          {everyday
            ? prog.total === 0
              ? "Add your first step"
              : ended
                ? "Everyday ended"
                : prog.complete
                  ? "All steps done today"
                  : `Step ${Math.min(prog.activeIndex + 1, prog.total)} of ${prog.total} today`
            : prog.total === 0
              ? "Add your first step"
              : prog.complete
                ? "All steps complete"
                : `Step ${Math.min(prog.activeIndex + 1, prog.total)} of ${prog.total}`}
          {everyday && flow.endDate
            ? ` · Ends ${formatFriendly(flow.endDate)}`
            : !everyday && started
              ? ` · Started ${started}`
              : ""}
        </span>
      </div>
      <em>{prog.pct}%</em>
    </Link>
  );
}

export default function FlowsPage() {
  const navigate = useNavigate();
  const followFlows = useTaskStore((s) => s.followFlows) || [];
  const quickLabels = useTaskStore((s) => s.quickLabels) || [];
  const addFollowFlow = useTaskStore((s) => s.addFollowFlow);
  const rollEverydayFlows = useTaskStore((s) => s.rollEverydayFlows);
  const [createOpen, setCreateOpen] = useState(false);
  const [createEveryday, setCreateEveryday] = useState(false);

  useEffect(() => {
    rollEverydayFlows();
    const id = window.setInterval(() => rollEverydayFlows(), 30_000);
    const onFocus = () => rollEverydayFlows();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [rollEverydayFlows]);

  const labelsById = useMemo(() => {
    const map = {};
    quickLabels.forEach((l) => {
      map[l.id] = l;
    });
    return map;
  }, [quickLabels]);

  const everydayFlows = useMemo(
    () => followFlows.filter((f) => f.repeat === "daily"),
    [followFlows]
  );
  const oneShotFlows = useMemo(
    () => followFlows.filter((f) => f.repeat !== "daily"),
    [followFlows]
  );

  const yKey = yesterdayKey();
  const yesterdayReports = useMemo(() => {
    return everydayFlows
      .map((f) => {
        const report = (f.reports || []).find((r) => r.dateKey === yKey);
        if (!report) return null;
        return { flow: f, report };
      })
      .filter(Boolean);
  }, [everydayFlows, yKey]);

  function openCreate(everyday = false) {
    setCreateEveryday(everyday);
    setCreateOpen(true);
  }

  function handleCreate({ name, color, repeat, endDate, labelIds, anyOrder }) {
    const created = addFollowFlow({ name, color, repeat, endDate, labelIds, anyOrder });
    setCreateOpen(false);
    if (created?.id) navigate(`/app/flows/${created.id}`);
  }

  function labelsFor(flow) {
    return (flow.labelIds || []).map((id) => labelsById[id]).filter(Boolean);
  }

  return (
    <div className="page narrow-page page-flows">
      <section className="simple-hero simple-hero-compact">
        <p className="eyebrow">Follow Flow Tasks</p>
        <h1>Flows</h1>
        <p>Sequences that unlock step by step. Everyday flows reset at midnight.</p>
      </section>

      {followFlows.length === 0 ? (
        <div className="flow-empty-stage">
          <GitBranch size={28} />
          <h2>Create flow</h2>
          <p>One-time path, or Everyday that repeats and grades you each night.</p>
          <div className="flow-empty-actions">
            <button type="button" className="button button-primary" onClick={() => openCreate(false)}>
              <Plus size={16} /> Create flow
            </button>
            <button type="button" className="button button-secondary" onClick={() => openCreate(true)}>
              <RefreshCw size={16} /> Everyday flow
            </button>
          </div>
        </div>
      ) : (
        <>
          <section className="flow-section" aria-label="Everyday">
            <div className="flow-list-head">
              <div>
                <h2>Everyday</h2>
                <p className="flow-section-sub">Repeat daily · resets at 12:00 AM</p>
              </div>
              <button type="button" className="button button-secondary" onClick={() => openCreate(true)}>
                <Plus size={15} /> Create everyday
              </button>
            </div>

            {everydayFlows.length === 0 ? (
              <p className="flow-section-empty">No everyday flows yet — build a daily sequence.</p>
            ) : (
              <div className="flow-list">
                {everydayFlows.map((flow) => (
                  <FlowCard key={flow.id} flow={flow} everyday labels={labelsFor(flow)} />
                ))}
              </div>
            )}
          </section>

          {(yesterdayReports.length > 0 || everydayFlows.length > 0) && (
            <section className="flow-section flow-yesterday" aria-label="Yesterday reports">
              <div className="flow-list-head">
                <div>
                  <h2>Yesterday</h2>
                  <p className="flow-section-sub">
                    Report cards for {formatFriendly(yKey)}
                  </p>
                </div>
                <Link to="/app/reports" className="button button-secondary">
                  <ClipboardList size={15} /> Full report
                </Link>
              </div>

              {yesterdayReports.length === 0 ? (
                <p className="flow-section-empty">
                  No report yet — finish today and check back after midnight.
                </p>
              ) : (
                <Link to="/app/reports" className="report-teaser">
                  <div className="report-teaser-copy">
                    <strong>
                      {yesterdayReports.length} report card
                      {yesterdayReports.length === 1 ? "" : "s"} ready
                    </strong>
                    <span>
                      {yesterdayReports
                        .slice(0, 2)
                        .map(({ flow, report }) => `${flow.name} ${report.grade}`)
                        .join(" · ")}
                      {yesterdayReports.length > 2 ? "…" : ""}
                    </span>
                  </div>
                  <span className="report-teaser-go">
                    Open Report
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </span>
                </Link>
              )}
            </section>
          )}

          <section className="flow-section" aria-label="Your flows">
            <div className="flow-list-head">
              <div>
                <h2>Your flows</h2>
                <p className="flow-section-sub">One-time sequences — no midnight reset</p>
              </div>
              <button type="button" className="button button-secondary" onClick={() => openCreate(false)}>
                <Plus size={15} /> Create flow
              </button>
            </div>

            {oneShotFlows.length === 0 ? (
              <p className="flow-section-empty">No one-time flows yet.</p>
            ) : (
              <div className="flow-list">
                {oneShotFlows.map((flow) => (
                  <FlowCard key={flow.id} flow={flow} everyday={false} labels={labelsFor(flow)} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <CreateFlowModal
        open={createOpen}
        defaultEveryday={createEveryday}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
