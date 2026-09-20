import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AtSign,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Link2,
  Search,
  Send,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  searchProfiles,
  sendConnectionRequest,
  respondToRequest,
  deleteAssignedTask,
  removeConnection,
} from "../lib/collabService";
import { useAuth } from "../hooks/useAuth";
import { useTaskStore } from "../store/useTaskStore";

const HOW_STEPS = [
  {
    icon: <Search size={18} />,
    title: "Search by username",
    desc: "Find anyone on SeenTasks by their unique handle. Emails stay private.",
  },
  {
    icon: <Send size={18} />,
    title: "Send a request",
    desc: "One tap to connect. They accept — and you're in each other's org.",
  },
  {
    icon: <CheckCircle2 size={18} />,
    title: "Assign real work",
    desc: "Delegate tasks directly from the Add Task box. Track completion here.",
  },
];

export default function TeamPage() {
  const { profile } = useAuth();
  const connections = useTaskStore((s) => s.connections);
  const incoming = useTaskStore((s) => s.incomingRequests);
  const assignedByMe = useTaskStore((s) => s.assignedByMe);

  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [requested, setRequested] = useState([]);
  const [error, setError] = useState("");
  const [removeConfirm, setRemoveConfirm] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = setTimeout(async () => {
      const q = term.trim();
      if (q.length < 1) { setResults([]); return; }
      try { setResults(await searchProfiles(q)); }
      catch { setError("Search is unavailable right now."); }
    }, 220);
    return () => clearTimeout(id);
  }, [term]);

  async function request(toProfile) {
    try {
      await sendConnectionRequest(profile, toProfile);
      setRequested((r) => [...r, toProfile.uid]);
    } catch {
      setError("Could not send the request.");
    }
  }

  function copyHandle() {
    const handle = profile?.username || profile?.displayName || "";
    if (!handle) return;
    navigator.clipboard.writeText(handle).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const assignedGroups = useMemo(() => {
    const map = new Map();
    assignedByMe.forEach((task) => {
      const key = task.toUid;
      if (!map.has(key))
        map.set(key, { username: task.toUsername, name: task.toName, total: 0, done: 0, items: [] });
      const g = map.get(key);
      g.total += 1;
      if (task.status === "completed") g.done += 1;
      g.items.push(task);
    });
    return [...map.values()];
  }, [assignedByMe]);

  const connectedUids = new Set(connections.map((c) => c.uid));

  return (
    <div className="page narrow-page">

      {/* ── Handle card ── */}
      {profile && (
        <section className="team-handle-card">
          <div className="team-handle-avatar">
            {profile.photoURL
              ? <img src={profile.photoURL} alt="" referrerPolicy="no-referrer" />
              : <span>{profile.displayName?.[0]?.toUpperCase() || "?"}</span>}
          </div>
          <div className="team-handle-info">
            <p className="team-handle-name">{profile.displayName || "You"}</p>
            <div className="team-handle-row">
              <AtSign size={13} className="team-handle-at" />
              <span className="team-handle-slug">{profile.username || "—"}</span>
            </div>
            <p className="team-handle-hint">Share your handle so others can find and connect with you.</p>
          </div>
          <button
            type="button"
            className={`team-copy-btn${copied ? " is-copied" : ""}`}
            onClick={copyHandle}
            title="Copy handle"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? "Copied!" : "Copy handle"}</span>
          </button>
        </section>
      )}

      {/* ── How it works ── */}
      <section className="team-how-section">
        {HOW_STEPS.map((s, i) => (
          <div key={i} className="team-how-step">
            <div className="team-how-icon">{s.icon}</div>
            <div className="team-how-body">
              <strong>{s.title}</strong>
              <p>{s.desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* ── Incoming requests ── */}
      {incoming.length > 0 && (
        <section className="content-card request-section">
          <div className="card-heading">
            <span className="heading-icon"><Clock size={18} /></span>
            <div>
              <h2>Requests</h2>
              <p>{incoming.length} {incoming.length === 1 ? "person wants" : "people want"} to connect</p>
            </div>
          </div>
          <div className="member-list">
            <AnimatePresence mode="popLayout">
              {incoming.map((req) => (
                <motion.div
                  key={req.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="member-row"
                >
                  {req.fromPhoto
                    ? <img className="member-avatar member-photo" src={req.fromPhoto} alt="" referrerPolicy="no-referrer" />
                    : <span className="member-avatar">{req.fromName?.[0]?.toUpperCase()}</span>}
                  <div className="member-info">
                    <h3>{req.fromName}</h3>
                    <p><AtSign size={12} /> {req.fromUsername}</p>
                  </div>
                  <div className="request-actions">
                    <button className="button button-primary request-accept" onClick={() => respondToRequest(req.id, true)}>
                      <Check size={15} /> Accept
                    </button>
                    <button className="icon-button icon-button-danger" onClick={() => respondToRequest(req.id, false)} aria-label="Reject">
                      <X size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      {/* ── Search ── */}
      <section className="team-search-section">
        <div className="team-search-head">
          <Link2 size={16} className="team-search-head-icon" />
          <div>
            <h2>Find people</h2>
            <p>Search by username — type to see live suggestions</p>
          </div>
        </div>
        <div className="team-search-bar">
          <Search size={15} className="team-search-icon" />
          <input
            id="people-search"
            value={term}
            onChange={(e) =>
              setTerm(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))
            }
            placeholder="type a username…"
            autoComplete="off"
          />
          {term && (
            <button className="team-search-clear" onClick={() => { setTerm(""); setResults([]); }} aria-label="Clear">
              <X size={13} />
            </button>
          )}
        </div>
        {results.length > 0 && (
          <div className="team-search-results">
            {results.map((p) => {
              const already = connectedUids.has(p.uid);
              const sent = requested.includes(p.uid);
              return (
                <div key={p.uid} className="search-row">
                  {p.photoURL
                    ? <img className="search-avatar" src={p.photoURL} alt="" referrerPolicy="no-referrer" />
                    : <span className="search-avatar">{p.displayName?.[0]?.toUpperCase()}</span>}
                  <div className="search-info">
                    <strong>{p.displayName}</strong>
                    <small>@{p.username}</small>
                  </div>
                  {already
                    ? <span className="search-tag is-connected">Connected</span>
                    : sent
                    ? <span className="search-tag">Requested</span>
                    : (
                      <button className="button button-cream search-send" onClick={() => request(p)}>
                        <Send size={14} /> Request
                      </button>
                    )}
                </div>
              );
            })}
          </div>
        )}
        {error && <p className="invite-error" role="alert">{error}</p>}
      </section>

      {/* ── Connections ── */}
      <section className="content-card member-section">
        <div className="card-heading">
          <span className="heading-icon"><Users size={18} /></span>
          <div>
            <h2>Connections</h2>
            <p>{connections.length} connected</p>
          </div>
        </div>
        {connections.length === 0 ? (
          <div className="soft-empty">
            <UserPlus size={28} />
            <h3>No connections yet</h3>
            <p>Search for someone above and send a request to build your org.</p>
          </div>
        ) : (
          <div className="team-connections-grid">
            {connections.map((c) => (
              <div key={c.uid} className="team-connection-card">
                {c.photoURL
                  ? <img className="conn-avatar conn-photo" src={c.photoURL} alt="" referrerPolicy="no-referrer" />
                  : <span className="conn-avatar">{c.name?.[0]?.toUpperCase()}</span>}
                <div className="conn-info">
                  <strong>{c.name}</strong>
                  <span><AtSign size={11} />{c.username}</span>
                </div>
                <button
                  type="button"
                  className="icon-button icon-button-danger conn-remove"
                  onClick={() => setRemoveConfirm(c)}
                  title={`Remove ${c.name}`}
                  aria-label={`Remove ${c.name}`}
                >
                  <UserMinus size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Assigned tasks ── */}
      <section className="content-card member-section">
        <div className="card-heading">
          <span className="heading-icon"><Send size={18} /></span>
          <div>
            <h2>Tasks you assigned</h2>
            <p>Work delegated to others — kept out of your own list</p>
          </div>
        </div>
        {assignedGroups.length === 0 ? (
          <div className="soft-empty">
            <Send size={28} />
            <h3>Nothing assigned yet</h3>
            <p>Assign a task to a connection from the Add Task box.</p>
          </div>
        ) : (
          <div className="assigned-groups">
            {assignedGroups.map((g) => (
              <div key={g.username} className="assigned-group">
                <div className="assigned-group-head">
                  <span className="member-avatar">{g.name?.[0]?.toUpperCase()}</span>
                  <div className="member-info">
                    <h3>{g.name}</h3>
                    <p><AtSign size={12} /> {g.username}</p>
                  </div>
                  <span className="assigned-count">{g.done}/{g.total} done</span>
                </div>
                <div className="assigned-items">
                  {g.items.map((task) => (
                    <div key={task.id} className={`assigned-item${task.status === "completed" ? " assigned-item-done" : ""}`}>
                      <span>{task.title}</span>
                      <button
                        className="icon-button icon-button-danger"
                        onClick={() => deleteAssignedTask(task.id)}
                        aria-label="Remove"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Remove confirm modal ── */}
      <AnimatePresence>
        {removeConfirm && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setRemoveConfirm(null)}
          >
            <motion.div
              className="quick-delete-modal"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="quick-delete-head">
                <span className="heading-icon" style={{ color: "var(--error)" }}>
                  <UserMinus size={20} />
                </span>
                <div><h2>Remove connection</h2></div>
                <button type="button" className="icon-button" onClick={() => setRemoveConfirm(null)} aria-label="Close">
                  <X size={16} />
                </button>
              </div>
              <div className="quick-delete-body">
                <p>
                  Are you sure you want to remove <strong>{removeConfirm.name}</strong> (@{removeConfirm.username}) from your organization?
                </p>
                <p style={{ color: "var(--muted-soft)", fontSize: "11px", marginTop: "4px" }}>
                  They will be disconnected and you won't be able to assign tasks until you reconnect.
                </p>
              </div>
              <div className="quick-delete-footer">
                <button type="button" className="button button-secondary" onClick={() => setRemoveConfirm(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="button"
                  style={{ background: "var(--error)", color: "#fff" }}
                  onClick={async () => {
                    try {
                      await removeConnection(removeConfirm.uid, removeConfirm.requestId);
                      setRemoveConfirm(null);
                    } catch {
                      setError("Could not remove connection.");
                      setRemoveConfirm(null);
                    }
                  }}
                >
                  Remove connection
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
