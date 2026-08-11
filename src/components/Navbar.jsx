import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { CalendarDays, CalendarRange, CheckSquare, ClipboardList, GitBranch, LogOut, MessageCircle, Menu, Plus, Settings, Sparkles, Trash2, UserCircle, Users, X } from "lucide-react";
import { useTaskStore } from "../store/useTaskStore";
import { useAuth } from "../hooks/useAuth";
import Logo from "./Logo";
import { todayKey } from "../lib/date";
import { flowProgress } from "../lib/flowService";
import { prefetchRoute } from "../lib/prefetchRoute";

function warm(path) {
  prefetchRoute(path);
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const binCount = useTaskStore((state) => state.getBinTasks().length);
  const quickOpenCount = useTaskStore(
    (state) => state.quickTasks.filter((t) => t.dateKey === todayKey() && !t.done).length
  );
  const flowActiveCount = useTaskStore(
    (state) =>
      (state.followFlows || []).filter((f) => {
      const p = flowProgress(f, todayKey());
        return p.total > 0 && !p.complete;
      }).length
  );
  const connectionCount = useTaskStore((state) => state.connections.length);
  const requestCount = useTaskStore((state) => state.incomingRequests.length);
  const displayName = profile?.displayName || user?.displayName || "Your workspace";
  const username = profile?.username ? `@${profile.username}` : "Personal focus system";
  const initial = displayName.charAt(0).toUpperCase();

  const linkClass = ({ isActive }) => `side-link${isActive ? " side-link-active" : ""}`;
  const warmProps = (path) => ({
    onPointerEnter: () => warm(path),
    onFocus: () => warm(path),
    onTouchStart: () => warm(path),
  });

  function openComposer() {
    warm("/app/today");
    navigate("/app/today");
    setOpen(false);
    window.setTimeout(() => window.dispatchEvent(new CustomEvent("open-task-composer")), 0);
  }

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  return (
    <>
      <header className="mobile-header">
        <button className="icon-button" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu size={19} /></button>
        <Link className="mobile-brand" to="/app" {...warmProps("/app")}><Logo size={22} /> SeenTasks</Link>
        <button className="icon-button icon-button-coral" onClick={openComposer} aria-label="Add task"><Plus size={19} /></button>
      </header>

      {open && <button className="sidebar-backdrop" onClick={() => setOpen(false)} aria-label="Close navigation" />}
      <aside className={`sidebar${open ? " sidebar-open" : ""}`}>
        <div className="sidebar-top">
          <Link className="brand" to="/app" onClick={() => setOpen(false)} {...warmProps("/app")}><Logo size={26} /><span>SeenTasks</span></Link>
          <button className="sidebar-close" onClick={() => setOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>

        <div className="profile-card">
          {user?.photoURL ? <img className="avatar avatar-photo" src={user.photoURL} alt="" referrerPolicy="no-referrer" decoding="async" /> : <span className="avatar">{initial}</span>}
          <span className="profile-copy"><strong title={displayName}>{displayName}</strong><small title={username}>{username}</small></span>
        </div>

        <button className="add-task-button" onClick={openComposer}><Plus size={17} /> Add task</button>

        <nav className="side-nav" aria-label="Main navigation">
          <NavLink to="/app" end className={linkClass} onClick={() => setOpen(false)} {...warmProps("/app")}><CheckSquare size={17} /><span>Quick tasks</span>{quickOpenCount > 0 && <em>{quickOpenCount}</em>}</NavLink>
          <NavLink to="/app/flows" className={linkClass} onClick={() => setOpen(false)} {...warmProps("/app/flows")}><GitBranch size={17} /><span>Follow Flow</span>{flowActiveCount > 0 && <em>{flowActiveCount}</em>}</NavLink>
          <NavLink to="/app/reports" className={linkClass} onClick={() => setOpen(false)} {...warmProps("/app/reports")}><ClipboardList size={17} /><span>Report</span></NavLink>
          <NavLink to="/app/today" className={linkClass} onClick={() => setOpen(false)} {...warmProps("/app/today")}><CalendarDays size={17} /><span>Today</span></NavLink>
          <NavLink to="/app/calendar" className={linkClass} onClick={() => setOpen(false)} {...warmProps("/app/calendar")}><CalendarRange size={17} /><span>Calendar</span></NavLink>
          <NavLink to="/app/persona" className={linkClass} onClick={() => setOpen(false)} {...warmProps("/app/persona")}><UserCircle size={17} /><span>Your persona</span></NavLink>
          <NavLink to="/app/assistant" className={linkClass} onClick={() => setOpen(false)} {...warmProps("/app/assistant")}><MessageCircle size={17} /><span>Assistant</span></NavLink>
          <NavLink to="/app/bin" className={linkClass} onClick={() => setOpen(false)} {...warmProps("/app/bin")}><Trash2 size={17} /><span>Abort bin</span>{binCount > 0 && <em>{binCount}</em>}</NavLink>
          <NavLink to="/app/team" className={linkClass} onClick={() => setOpen(false)} {...warmProps("/app/team")}><Users size={17} /><span>Organization</span>{requestCount > 0 ? <em className="em-alert">{requestCount}</em> : connectionCount > 0 && <em>{connectionCount}</em>}</NavLink>
          <NavLink to="/app/settings" className={linkClass} onClick={() => setOpen(false)} {...warmProps("/app/settings")}><Settings size={17} /><span>Settings</span></NavLink>
          <NavLink to="/app/explore" className={linkClass} onClick={() => setOpen(false)} {...warmProps("/app/explore")}>
            <img className="nav-brand-icon" src="/arigato-single-logo.png" alt="" width={17} height={17} decoding="async" /><span>Explore Arigato Labs</span>
          </NavLink>
        </nav>

        <div className="sidebar-label">Your system</div>
        <div className="focus-note"><Sparkles size={17} /><div><strong>AI priority guide</strong><p>Tasks are sorted with urgency and your well-being in mind.</p></div></div>

        <div className="sidebar-footer firebase-footer">
          <div className="firebase-status"><span className="status-dot" /><span><strong>Google secured</strong><small>Firebase authentication active</small></span></div>
          <button className="sidebar-signout" onClick={handleSignOut}><LogOut size={15} /> Sign out</button>
        </div>
      </aside>
    </>
  );
}
