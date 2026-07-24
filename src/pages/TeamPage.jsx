import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AtSign, LoaderCircle, UserPlus, Users, X } from "lucide-react";
import { addFriendByUsername, loadFriends, removeFriend } from "../lib/profileService";
import { useAuth } from "../hooks/useAuth";
import { useTaskStore } from "../store/useTaskStore";

export default function TeamPage() {
  const { user } = useAuth();
  const members = useTaskStore((state) => state.members);
  const addMember = useTaskStore((state) => state.addMember);
  const setMembers = useTaskStore((state) => state.setMembers);
  const removeMember = useTaskStore((state) => state.removeMember);
  const tasks = useTaskStore((state) => state.tasks);
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!user) return undefined;
    loadFriends(user.uid)
      .then((friends) => {
        if (active) setMembers(friends.map((friend) => ({
          id: friend.uid || friend.id,
          name: friend.displayName || friend.username,
          username: friend.username,
          photoURL: friend.photoURL || "",
        })));
      })
      .catch(() => setError("Connections could not be loaded."));
    return () => { active = false; };
  }, [user, setMembers]);

  async function handleAdd(event) {
    event.preventDefault();
    if (!username.trim() || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const friend = await addFriendByUsername(username);
      addMember({ id: friend.uid, name: friend.displayName, username: friend.username, photoURL: friend.photoURL });
      setMessage(`@${friend.username} is now in your connections.`);
      setUsername("");
    } catch (requestError) {
      const code = requestError.message || "";
      setError(code.includes("not-found") ? "No account uses that username." : code.includes("self") ? "You cannot add your own username." : "This person could not be added right now.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(memberId) {
    try {
      await removeFriend(user.uid, memberId);
      removeMember(memberId);
    } catch {
      setError("This connection could not be removed.");
    }
  }

  return (
    <div className="page narrow-page">
      <section className="simple-hero">
        <p className="eyebrow">Work with people you trust</p>
        <h1>Your connections</h1>
        <p>Find a SeenTasks account by its unique username, then assign thoughtful work without exposing anyone’s email.</p>
      </section>

      <section className="team-callout">
        <div><span className="callout-mark">✣</span><p className="eyebrow">Private discovery</p><h2>Bring someone into the plan.</h2><p>Usernames make people easy to find while their personal email stays private.</p></div>
        <form className="invite-form" onSubmit={handleAdd}>
          <label htmlFor="friend-username">SeenTasks username</label>
          <div className="dark-username-input"><AtSign size={16} /><input id="friend-username" value={username} onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))} placeholder="friend_name" autoComplete="off" /></div>
          <p className="invite-privacy">Searches only the public username profile.</p>
          {error && <p className="invite-error" role="alert">{error}</p>}
          {message && <p className="invite-success">{message}</p>}
          <button className="button button-cream" type="submit" disabled={!username || busy}>{busy ? <><LoaderCircle className="spin" size={16} /> Finding…</> : <><UserPlus size={16} /> Add connection</>}</button>
        </form>
      </section>

      <section className="content-card member-section">
        <div className="card-heading"><span className="heading-icon"><Users size={18} /></span><div><h2>Connections</h2><p>{members.length} person{members.length === 1 ? "" : "s"} available for assignment</p></div></div>
        <div className="member-list">
          <AnimatePresence mode="popLayout">
            {members.map((member) => {
              const assignedCount = tasks.filter((task) => task.assignedTo === member.id).length;
              return (
                <motion.article key={member.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="member-row">
                  {member.photoURL ? <img className="member-avatar member-photo" src={member.photoURL} alt="" referrerPolicy="no-referrer" /> : <span className="member-avatar">{member.name[0]?.toUpperCase()}</span>}
                  <div className="member-info"><h3>{member.name}</h3><p><AtSign size={12} /> {member.username || "connection"}</p></div>
                  <span className="assignment-count">{assignedCount} assigned</span>
                  <button className="icon-button icon-button-danger" onClick={() => handleRemove(member.id)} aria-label={`Remove ${member.name}`}><X size={16} /></button>
                </motion.article>
              );
            })}
          </AnimatePresence>
          {members.length === 0 && <div className="soft-empty"><Users size={24} /><h3>No connections yet</h3><p>Search for someone by username above.</p></div>}
        </div>
      </section>
    </div>
  );
}
