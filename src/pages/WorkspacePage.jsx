import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Check, ChevronDown } from "lucide-react";
import QuickTasks from "../components/QuickTasks";
import DateStrip from "../components/DateStrip";
import OnePasswordGate from "../components/OnePasswordGate";
import { todayKey, toKey } from "../lib/date";
import { useTaskStore } from "../store/useTaskStore";
import { DEFAULT_WORKSPACE_ID, workspaceColorInk } from "../lib/quickTaskService";

export default function WorkspacePage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const switchRef = useRef(null);
  const workspaces = useTaskStore((s) => s.quickWorkspaces);
  const quickTasks = useTaskStore((s) => s.quickTasks);
  const deleteQuickWorkspace = useTaskStore((s) => s.deleteQuickWorkspace);

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

      <DateStrip
        selected={selectedDate}
        onSelect={setSelectedDate}
        counts={counts}
        range={14}
        instantScroll
      />
      <QuickTasks dateKey={selectedDate} workspaceId={workspaceId} />

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
