import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Check, CheckSquare, ChevronDown, History } from "lucide-react";
import QuickTasks from "../components/QuickTasks";
import WorkspaceLogs from "../components/WorkspaceLogs";
import DateStrip from "../components/DateStrip";
import OnePasswordGate from "../components/OnePasswordGate";
import { todayKey, toKey } from "../lib/date";
import { useTaskStore } from "../store/useTaskStore";
import { DEFAULT_WORKSPACE_ID, workspaceColorInk } from "../lib/quickTaskService";

export default function WorkspacePage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "logs" ? "logs" : "tasks";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [logFilterLabelId, setLogFilterLabelId] = useState(() => searchParams.get("label") || null);
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const switchRef = useRef(null);
  const workspaces = useTaskStore((s) => s.quickWorkspaces);
  const quickTasks = useTaskStore((s) => s.quickTasks);
  const deleteQuickWorkspace = useTaskStore((s) => s.deleteQuickWorkspace);

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") === "logs" ? "logs" : "tasks";
    setActiveTab(tabFromUrl);
    const labelFromUrl = searchParams.get("label");
    if (labelFromUrl) setLogFilterLabelId(labelFromUrl);
  }, [searchParams]);

  const workspace = useMemo(
    () => (workspaces || []).find((w) => w.id === workspaceId),
    [workspaces, workspaceId]
  );

  const switchList = useMemo(() => {
    const custom = (workspaces || []).filter((w) => w.id !== DEFAULT_WORKSPACE_ID);
    return [
      { id: DEFAULT_WORKSPACE_ID, name: "Personal", color: "#e8e1d6", href: "/app" },
      ...custom.map((w) => ({
        id: w.id,
        name: w.name,
        color: w.color,
        href: `/app/workspace/${w.id}`,
      })),
    ];
  }, [workspaces]);

  const scopedTasks = useMemo(
    () => (quickTasks || []).filter((t) => (t.workspaceId || DEFAULT_WORKSPACE_ID) === workspaceId),
    [quickTasks, workspaceId]
  );

  const openCount = useMemo(
    () => scopedTasks.filter((t) => !t.done).length,
    [scopedTasks]
  );

  const completedCount = useMemo(
    () => scopedTasks.filter((t) => t.done).length,
    [scopedTasks]
  );

  function handleTabChange(nextTab) {
    setActiveTab(nextTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (nextTab === "logs") {
        next.set("tab", "logs");
      } else {
        next.delete("tab");
        next.delete("label");
      }
      return next;
    });
  }

  const counts = useMemo(() => {
    const map = {};
    scopedTasks.forEach((task) => {
      if (task.dateKey) map[task.dateKey] = (map[task.dateKey] || 0) + 1;
      if (task.done && task.completedAt) {
        const doneKey = toKey(task.completedAt);
        if (doneKey && doneKey !== task.dateKey) {
          map[doneKey] = (map[doneKey] || 0) + 1;
        }
      }
    });
    return map;
  }, [scopedTasks]);

  useEffect(() => {
    if (!switchOpen) return undefined;
    function onDoc(e) {
      if (switchRef.current && !switchRef.current.contains(e.target)) {
        setSwitchOpen(false);
      }
    }
    function onKey(e) {
      if (e.key === "Escape") setSwitchOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [switchOpen]);

  if (!workspaceId || workspaceId === DEFAULT_WORKSPACE_ID) {
    return <Navigate to="/app" replace />;
  }

  if (workspaces?.length && !workspace) {
    return <Navigate to="/app" replace />;
  }

  const theme = workspace?.color || "#c9dff3";
  const ink = workspaceColorInk(theme);

  function goWorkspace(item) {
    setSwitchOpen(false);
    if (item.id === workspaceId) return;
    navigate(item.href);
  }

  return (
    <div
      className="page narrow-page page-quick page-workspace"
      style={{ "--ws-color": theme, "--ws-ink": ink }}
    >
      <div className="workspace-topbar">
        <Link to="/app" className="workspace-back">
          <ArrowLeft size={16} /> Quick tasks
        </Link>

        <div className="workspace-switcher" ref={switchRef}>
          <button
            type="button"
            className="workspace-switcher-btn"
            aria-haspopup="listbox"
            aria-expanded={switchOpen}
            onClick={() => setSwitchOpen((v) => !v)}
          >
            Switch workspace
            <ChevronDown size={15} aria-hidden="true" />
          </button>
          {switchOpen && (
            <ul className="workspace-switcher-menu" role="listbox" aria-label="Workspaces">
              {switchList.map((item) => {
                const active = item.id === workspaceId;
                return (
                  <li key={item.id} role="option" aria-selected={active}>
                    <button
                      type="button"
                      className={`workspace-switcher-item${active ? " is-active" : ""}`}
                      onClick={() => goWorkspace(item)}
                    >
                      <span
                        className="workspace-switcher-dot"
                        style={{ background: item.color }}
                        aria-hidden="true"
                      />
                      <span className="workspace-switcher-name">{item.name}</span>
                      {active && <Check size={14} aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <header className="workspace-title-block">
        <h1 className="workspace-title">
          {workspace?.name || "Workspace"}
          <BadgeCheck className="workspace-verified" size={28} aria-label="Workspace" />
        </h1>
        {workspace && workspace.id !== DEFAULT_WORKSPACE_ID && (
          <button type="button" className="workspace-hero-delete" onClick={() => setDeleteOpen(true)}>
            Delete workspace
          </button>
        )}
      </header>

      {/* Workspace View Tabs: Checklist & Logs */}
      <div className="workspace-tabs-bar" role="tablist" aria-label="Workspace view">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "tasks"}
          className={`workspace-tab-btn${activeTab === "tasks" ? " is-active" : ""}`}
          onClick={() => handleTabChange("tasks")}
        >
          <CheckSquare size={14} aria-hidden="true" />
          <span>Checklist</span>
          {openCount > 0 && <span className="workspace-tab-badge">{openCount}</span>}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "logs"}
          className={`workspace-tab-btn${activeTab === "logs" ? " is-active" : ""}`}
          onClick={() => handleTabChange("logs")}
        >
          <History size={14} aria-hidden="true" />
          <span>Logs</span>
          {completedCount > 0 && (
            <span className="workspace-tab-badge is-done">{completedCount}</span>
          )}
        </button>
      </div>

      {activeTab === "logs" ? (
        <WorkspaceLogs
          workspaceId={workspaceId}
          workspaceName={workspace?.name || "Workspace"}
          workspaceColor={theme}
          initialLabelId={logFilterLabelId}
          onSwitchToTasks={() => handleTabChange("tasks")}
        />
      ) : (
        <>
          <DateStrip
            selected={selectedDate}
            onSelect={setSelectedDate}
            counts={counts}
            range={14}
            instantScroll
          />
          <QuickTasks
            dateKey={selectedDate}
            workspaceId={workspaceId}
            onOpenLogs={(labelId) => {
              setLogFilterLabelId(labelId);
              setActiveTab("logs");
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.set("tab", "logs");
                if (labelId) next.set("label", labelId);
                return next;
              });
            }}
          />
        </>
      )}

      <OnePasswordGate
        open={deleteOpen}
        title={`Delete workspace “${workspace?.name || ""}”`}
        description="Open tasks move to Personal. Answer your One Password question to continue."
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          deleteQuickWorkspace(workspaceId);
          setDeleteOpen(false);
          navigate("/app");
        }}
      />
    </div>
  );
}
