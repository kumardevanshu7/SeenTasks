import { useMemo, useState } from "react";
import { ArrowRight, AtSign, Check, LogOut, Sparkles } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import Logo from "./Logo";

export default function UsernameSetup() {
  const { user, claimUsername, signOut } = useAuth();
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const valid = useMemo(() => /^[a-z0-9_]{3,20}$/.test(username), [username]);

  async function submit(event) {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      await claimUsername(username);
    } catch (claimError) {
      const code = claimError.message || "";
      setError(code.includes("taken") ? "That username is already taken. Try another." : code.includes("reserved") ? "That username is reserved. Try another." : "Username could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="onboarding-shell">
      <header className="onboarding-brand"><Logo size={26} /> SeenTasks</header>
      <section className="onboarding-card">
        <div className="onboarding-story"><span className="onboarding-mark">✣</span><p className="eyebrow">One last thoughtful detail</p><h1>How should people find you?</h1><p>Your username becomes your private connection handle. Friends can search it without needing your email.</p><div className="onboarding-promise"><Sparkles size={16} /><span>Lowercase, unique, and yours. We never make your email public.</span></div></div>
        <form className="username-form" onSubmit={submit}>
          <div className="google-identity">{user?.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : <span>{user?.displayName?.[0] || "Y"}</span>}<div><strong>{user?.displayName || "Your account"}</strong><small>{user?.email}</small></div><Check size={17} /></div>
          <label htmlFor="username">Choose a username</label>
          <div className={`username-input${error ? " username-input-error" : ""}`}><AtSign size={17} /><input id="username" value={username} onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))} placeholder="your_name" autoFocus autoComplete="username" /></div>
          <p className="username-help">3–20 characters · lowercase letters, numbers, and underscore</p>
          {error && <p className="username-error" role="alert">{error}</p>}
          <button className="button button-primary username-submit" disabled={!valid || busy} type="submit">{busy ? "Claiming your name…" : "Continue to my day"}<ArrowRight size={17} /></button>
          <button className="onboarding-signout" type="button" onClick={signOut}><LogOut size={14} /> Use another Google account</button>
        </form>
      </section>
    </main>
  );
}
