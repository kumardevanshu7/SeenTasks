import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BrainCircuit, CalendarCheck2, Check, HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";
import InstallButton from "../components/InstallButton";
import Logo from "../components/Logo";
import { useAuth } from "../hooks/useAuth";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.3l-3.3-2.6c-.9.6-2 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.7A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.5 14a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9.2L6.5 14Z" />
      <path fill="#EA4335" d="M12 6.1c1.6 0 3 .5 4.1 1.6l3.1-3A10 10 0 0 0 3.1 7.5l3.4 2.7A5.9 5.9 0 0 1 12 6.1Z" />
    </svg>
  );
}

export default function LandingPage() {
  const { user, profile, loading, signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function enterApp() {
    if (user) return navigate("/app");
    setBusy(true);
    setError("");
    try {
      const result = await signInWithGoogle();
      if (result) navigate("/app");
    } catch (authError) {
      setError(authError.code === "auth/popup-closed-by-user" ? "Sign-in was closed. Try again when you’re ready." : "Google sign-in could not start. Check Firebase Auth settings and try again.");
    } finally {
      setBusy(false);
    }
  }

  const ctaLabel = user ? (profile?.username ? "Open my day" : "Choose my username") : busy || loading ? "Preparing…" : "Continue with Google";

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <a className="landing-brand" href="#top"><Logo size={26} /> SeenTasks</a>
        <nav><a href="#method">The method</a><a href="#features">Features</a><a href="#wellbeing">Well-being</a></nav>
        <div className="landing-nav-actions"><InstallButton /><button className="button button-primary" disabled={busy || loading} onClick={enterApp}>{!user && <GoogleIcon />}{ctaLabel}</button></div>
      </header>

      <main id="top">
        <section className="landing-hero">
          <motion.div className="landing-hero-copy" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <p className="eyebrow">A calmer way to get things done</p>
            <h1>Your day,<br /><em>considered.</em></h1>
            <p>SeenTasks reads what is on your mind, weighs urgency against your energy, and helps you choose what deserves today—not just what shouts the loudest.</p>
            <div className="landing-hero-actions">
              <button className="button landing-google-button" disabled={busy || loading} onClick={enterApp}>{!user && <GoogleIcon />}{ctaLabel}<ArrowRight size={17} /></button>
              <span>Free to begin · Private by design</span>
            </div>
            {error && <p className="auth-error" role="alert">{error}</p>}
          </motion.div>

          <motion.div className="product-preview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .12 }}>
            <div className="preview-top"><span><i /> Your considered plan</span><small>Tuesday, 4 tasks</small></div>
            <div className="preview-message"><Sparkles size={15} /><p>You have one time-sensitive task. Start there, then protect an hour for yourself.</p></div>
            <div className="preview-task preview-task-primary"><button /><div><small>First priority</small><strong>Send the proposal before noon</strong><p>Clearing this first will take pressure off the rest of your day.</p></div><em>Now</em></div>
            <div className="preview-task"><button /><div><small>Second priority</small><strong>Review notes from yesterday</strong><p>Useful today, but it can follow your focused work.</p></div><em>Today</em></div>
            <div className="preview-task"><button /><div><small>Tomorrow</small><strong>Research a new desk setup</strong><p>Nothing about this needs your energy today.</p></div><em>Rest</em></div>
            <div className="preview-footer"><span>✣</span><p>Prioritized with urgency and well-being in mind.</p></div>
          </motion.div>
        </section>
        <section className="trust-strip" aria-label="Product principles">
          <span><ShieldCheck size={16} /> Google-secured sign in</span>
          <span><BrainCircuit size={16} /> Human-centered priority</span>
          <span><CalendarCheck2 size={16} /> Daily recall, without guilt</span>
        </section>

        <section className="landing-method" id="method">
          <div className="section-intro"><p className="eyebrow">Priority without panic</p><h2>Not every task deserves the same part of you.</h2><p>Most task apps collect work. SeenTasks helps you make a humane decision about it.</p></div>
          <div className="method-grid">
            <article><span>01</span><BrainCircuit size={24} /><h3>Read the context</h3><p>Your wording, deadlines, and intent shape how a task is understood.</p></article>
            <article><span>02</span><HeartHandshake size={24} /><h3>Protect your energy</h3><p>Urgency matters, but so do focus, recovery, and the person doing the work.</p></article>
            <article><span>03</span><CalendarCheck2 size={24} /><h3>Choose the right day</h3><p>Do it first, later today, or tomorrow—with a reason you can understand.</p></article>
          </div>
        </section>

        <section className="landing-dark-band" id="features">
          <div className="dark-band-copy"><p className="eyebrow">A memory for unfinished work</p><h2>Postponed does not mean forgotten.</h2><p>Recall incomplete tasks into a new day. Each return increases its iteration signal, from a gentle tint to a clear red warning by the tenth recall.</p><ul><li><Check size={15} /> One-click daily recall</li><li><Check size={15} /> Ten-step visual urgency</li><li><Check size={15} /> Abort and restore with history intact</li></ul></div>
          <div className="iteration-demo"><div className="iteration-demo-head"><span>Iteration history</span><small>Visual urgency</small></div>{[2, 4, 7, 10].map((level) => <div className={`iteration-row iteration-${level}`} key={level}><span>{level}×</span><div><strong>Prepare the quarterly review</strong><small>Recalled into today</small></div><em>{level === 10 ? "Needs a decision" : "Still open"}</em></div>)}</div>
        </section>

        <section className="feature-section" id="wellbeing">
          <div className="section-intro"><p className="eyebrow">Built for real days</p><h2>A task system that leaves room for being human.</h2></div>
          <div className="feature-grid"><article><span>✣</span><h3>Explainable AI</h3><p>Every priority includes a plain-language reason, so the model advises rather than commands.</p></article><article><span>↻</span><h3>Gentle accountability</h3><p>Iteration colors make repeated delay visible without turning your day into a punishment.</p></article><article><span>◎</span><h3>Shared responsibility</h3><p>Create an organization, connect with people, and assign work with clear ownership.</p></article></div>
        </section>

        <section className="landing-cta"><div><span>✣</span><h2>Begin with what is on your mind.</h2><p>Let SeenTasks turn a crowded list into a considered day.</p></div><div><button className="button button-cream" disabled={busy || loading} onClick={enterApp}>{!user && <GoogleIcon />}{ctaLabel}<ArrowRight size={17} /></button><InstallButton className="button landing-install-light" /></div></section>
      </main>

      <footer className="landing-footer">
        <a className="landing-brand" href="#top"><Logo size={24} /> SeenTasks</a>
        <p>Thoughtful work, one day at a time.</p>
        <div>
          <a href="#method">Method</a>
          <a href="#features">Features</a>
          <a href="/about">About</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/contact">Contact</a>
          <span>© 2026 Arigato Labs</span>
        </div>
      </footer>
    </div>
  );
}
