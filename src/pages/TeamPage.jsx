import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AtSign, Check, Clock, Search, Send, UserMinus, UserPlus, Users, X } from "lucide-react";
import { searchProfiles, sendConnectionRequest, respondToRequest, deleteAssignedTask, removeConnection } from "../lib/collabService";
import { useAuth } from "../hooks/useAuth";
import { useTaskStore } from "../store/useTaskStore";

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

  const assignedGroups = useMemo(() => {
    const map = new Map();
    assignedByMe.forEach((task) => {
      const key = task.toUid;
      if (!map.has(key)) map.set(key, { username: task.toUsername, name: task.toName, total: 0, done: 0, items: [] });
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
      <section className="simple-hero">
        <p className="eyebrow">Work with people you trust</p>
        <h1>Your organization</h1>
        <p>Find people by username, send a request, and assign thoughtful work. Emails always stay private.</p>
      </section>

      {incoming.length > 0 && (
        <section className="content-card request-section">
          <div className="card-heading"><span className="heading-icon"><Clock size={18} /></span><div><h2>Requests</h2><p>{incoming.length} person wants to connect</p></div></div>
          <div className="member-list">
            <AnimatePresence mode="popLayout">
              {incoming.map((req) => (
                <motion.div key={req.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="member-row">
                  {req.fromPhoto ? <img className="member-avatar member-photo" src={req.fromPhoto} alt="" referrerPolicy="no-referrer" /> : <span className="member-avatar">{req.fromName?.[0]?.toUpperCase()}</span>}
                  <div className="member-info"><h3>{req.fromName}</h3><p><AtSign size={12} /> {req.fromUsername}</p></div>
                  <div className="request-actions">
                    <button className="button button-primary request-accept" onClick={() => respondToRequest(req.id, true)}><Check size={15} /> Accept</button>
                    <button className="icon-button icon-button-danger" onClick={() => respondToRequest(req.id, false)} aria-label="Reject"><X size={16} /></button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      <section className="team-callout">
        <div><span className="callout-mark">✣</span><p className="eyebrow">Find your people</p><h2>Search by username.</h2><p>Type a name and pick from live suggestions. They get your request in real time.</p></div>
        <div className="invite-form">
          <label htmlFor="people-search">Search people</label>
          <div className="dark-username-input"><Search size={16} /><input id="people-search" value={term} onChange={(e) => setTerm(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))} placeholder="start typing a username" autoComplete="off" /></div>
          {results.length > 0 && (
            <div className="search-results">
              {results.map((p) => {
                const already = connectedUids.has(p.uid);
                const sent = requested.includes(p.uid);
                return (
                  <div key={p.uid} className="search-row">
                    {p.photoURL ? <img className="search-avatar" src={p.photoURL} alt="" referrerPolicy="no-referrer" /> : <span className="search-avatar">{p.displayName?.[0]?.toUpperCase()}</span>}
                    <div className="search-info"><strong>{p.displayName}</strong><small>@{p.username}</small></div>
                    {already ? <span className="search-tag">Connected</span> : sent ? <span className="search-tag">Requested</span> : (
                      <button className="button button-cream search-send" onClick={() => request(p)}><Send size={14} /> Request</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {error && <p className="invite-error" role="alert">{error}</p>}
        </div>
      </section>

      <section className="content-card member-section">
        <div className="card-heading"><span className="heading-icon"><Users size={18} /></span><div><h2>Connections</h2><p>{connections.length} connected</p></div></div>
        <div className="member-list">
          {connections.map((c) => (
            <div key={c.uid} className="member-row">
              {c.photoURL ? <img className="member-avatar member-photo" src={c.photoURL} alt="" referrerPolicy="no-referrer" /> : <span className="member-avatar">{c.name?.[0]?.toUpperCase()}</span>}
              <div className="member-info"><h3>{c.name}</h3><p><AtSign size={12} /> {c.username}</p></div>
              <button
                type="button"
                className="icon-button icon-button-danger member-remove-btn"
                onClick={() => setRemoveConfirm(c)}
                title={`Remove ${c.name} from organization`}
                aria-label={`Remove ${c.name} from organization`}
              >
                <UserMinus size={16} />
              </button>
            </div>
          ))}
          {connections.length === 0 && <div className="soft-empty"><UserPlus size={24} /><h3>No connections yet</h3><p>Search for someone above to connect.</p></div>}
        </div>
      </section>

      <section className="content-card member-section">
        <div className="card-heading"><span className="heading-icon"><Send size={18} /></span><div><h2>Tasks you assigned</h2><p>Work you gave to others — kept out of your own list</p></div></div>
        <div className="assigned-groups">
          {assignedGroups.map((g) => (
            <div key={g.username} className="assigned-group">
              <div className="assigned-group-head">
                <span className="member-avatar">{g.name?.[0]?.toUpperCase()}</span>
                <div className="member-info"><h3>{g.name}</h3><p><AtSign size={12} /> {g.username}</p></div>
                <span className="assigned-count">{g.done}/{g.total} done</span>
              </div>
              <div className="assigned-items">
                {g.items.map((task) => (
                  <div key={task.id} className={`assigned-item${task.status === "completed" ? " assigned-item-done" : ""}`}>
                    <span>{task.title}</span>
                    <button className="icon-button icon-button-danger" onClick={() => deleteAssignedTask(task.id)} aria-label="Remove"><X size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {assignedGroups.length === 0 && <div className="soft-empty"><Send size={24} /><h3>Nothing assigned yet</h3><p>Assign a task to a connection from the Add task box.</p></div>}
        </div>
      </section>

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
                <div>
                  <h2>Remove connection</h2>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setRemoveConfirm(null)}
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="quick-delete-body">
                <p>
                  Are you sure you want to remove <strong>{removeConfirm.name}</strong> (@{removeConfirm.username}) from your organization?
                </p>
                <p style={{ color: "var(--muted-soft)", fontSize: "11px", marginTop: "4px" }}>
                  They will be disconnected from your organization and you won’t be able to assign tasks directly until you connect again.
                </p>
              </div>
              <div className="quick-delete-footer">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setRemoveConfirm(null)}
                >
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
