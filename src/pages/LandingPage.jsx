import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  CheckSquare,
  ClipboardList,
  GitBranch,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
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

const FEATURES = [
  {
    icon: CheckSquare,
    title: "Quick tasks",
    body: "Your everyday checklist. Add tasks, optional due dates and labels, workspaces, and a Not completed section after midnight.",
  },
  {
    icon: GitBranch,
    title: "Follow Flow",
    body: "One-time step paths — complete one step to unlock the next. No calendar noise, just the sequence.",
  },
  {
    icon: RefreshCw,
    title: "Everyday flows",
    body: "Daily repeat sequences that reset at 12:00 AM. Optional end dates, labels, and per-step start/end windows.",
  },
  {
    icon: ClipboardList,
    title: "Report cards",
    body: "After midnight, yesterday’s Everyday progress becomes a grade (A+ to F), feedback, and a progress ring on the Report page.",
  },
];

const HOW_TO = [
  "Sign in with Google and open Quick tasks — type a task and press Enter.",
  "Create a Follow Flow for a one-time checklist, or an Everyday flow for daily habits.",
  "Everyday steps can appear on Quick tasks too — open the flow to complete them in order.",
  "Check Report after midnight for yesterday’s grades and daily completion history.",
];

const FAQ = [
  {
    q: "What is SeenTasks?",
    a: "A calm task app from Arigato Labs — Quick tasks for your day, Follow Flow for step-by-step paths, and Everyday flows with nightly report cards.",
  },
  {
    q: "Who built SeenTasks?",
    a: "Kumar Devanshu is the master behind SeenTasks. It was invented at Arigato Labs (2026) — a studio focused on fast, thoughtful productivity tools.",
  },
  {
    q: "How do Everyday flows work?",
    a: "Build a daily sequence. It resets at midnight. Yesterday’s completion % becomes a school-style grade with feedback on the Report page.",
  },
  {
    q: "Do I need AI to use SeenTasks?",
    a: "No. The core app is Quick tasks + Follow Flow + Report. Sign in, add tasks, and go.",
  },
];

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
      setError(
        authError.code === "auth/popup-closed-by-user"
          ? "Sign-in was closed. Try again when you’re ready."
          : "Google sign-in could not start. Check Firebase Auth settings and try again."
      );
    } finally {
      setBusy(false);
    }
  }

  const ctaLabel = user
    ? profile?.username
      ? "Open SeenTasks"
      : "Choose my username"
    : busy || loading
      ? "Preparing…"
      : "Continue with Google";

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <a className="landing-brand" href="#top">
          <Logo size={26} /> SeenTasks
        </a>
        <nav>
          <a href="#features">Features</a>
          <a href="#how">How to use</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="landing-nav-actions">
          <InstallButton />
          <button className="button button-primary" disabled={busy || loading} onClick={enterApp}>
            {!user && <GoogleIcon />}
            {ctaLabel}
          </button>
        </div>
      </header>

      <main id="top">
        <section className="landing-hero">
          <motion.div
            className="landing-hero-copy"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="eyebrow">Arigato Labs · Kumar Devanshu</p>
            <h1>
              Quick tasks.
              <br />
              <em>Flows that repeat.</em>
            </h1>
            <p>
              SeenTasks is a simple productivity app: check off Quick tasks, follow step-by-step
              flows, run Everyday daily sequences, and read report cards each morning. Built at
              Arigato Labs by Kumar Devanshu.
            </p>
            <div className="landing-hero-actions">
              <button
                className="button landing-google-button"
                disabled={busy || loading}
                onClick={enterApp}
              >
                {!user && <GoogleIcon />}
                {ctaLabel}
                <ArrowRight size={17} />
              </button>
              <span>Free · Google sign-in · PWA installable</span>
            </div>
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
          </motion.div>

          <motion.div
            className="product-preview landing-preview-flows"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            <div className="preview-top">
              <span>
                <i /> Quick tasks + Everyday
              </span>
              <small>Today</small>
            </div>
            <div className="preview-task preview-task-primary">
              <button aria-hidden="true" />
              <div>
                <small>Quick task</small>
                <strong>Reply to client email</strong>
                <p>Stays on today until midnight or you mark it done.</p>
              </div>
              <em>Open</em>
            </div>
            <div className="preview-task">
              <button aria-hidden="true" />
              <div>
                <small>Everyday flow</small>
                <strong>Morning habits · Step 2 of 5</strong>
                <p>Complete in Follow Flow — unlocks the next step.</p>
              </div>
              <em>36%</em>
            </div>
            <div className="preview-message">
              <Sparkles size={15} />
              <p>Yesterday: Daily Do It Stuffs — 100% · Grade A+</p>
            </div>
            <div className="preview-footer">
              <span>✣</span>
              <p>Report cards land after 12:00 AM.</p>
            </div>
          </motion.div>
        </section>

        <section className="trust-strip" aria-label="Product principles">
          <span>
            <ShieldCheck size={16} /> Google-secured sign in
          </span>
          <span>
            <CheckSquare size={16} /> Quick tasks & workspaces
          </span>
          <span>
            <GitBranch size={16} /> Follow Flow & Everyday
          </span>
        </section>

        <section className="landing-method" id="features">
          <div className="section-intro">
            <p className="eyebrow">What you can do</p>
            <h2>Everything in SeenTasks, in plain language.</h2>
            <p>No AI required — just lists, sequences, and daily grades.</p>
          </div>
          <div className="feature-grid landing-feature-grid">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <article key={title}>
                <Icon size={22} aria-hidden="true" />
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-dark-band" id="how">
          <div className="dark-band-copy">
            <p className="eyebrow">How to use</p>
            <h2>Start in under a minute.</h2>
            <p>
              SeenTasks is designed so a new user knows exactly where to go: Quick tasks for the
              day, Follow Flow for sequences, Report for yesterday’s score.
            </p>
            <ul>
              {HOW_TO.map((line) => (
                <li key={line}>
                  <Check size={15} /> {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="iteration-demo landing-about-panel">
            <div className="iteration-demo-head">
              <span>Arigato Labs</span>
              <small>2026</small>
            </div>
            <div className="landing-about-block">
              <strong>Kumar Devanshu</strong>
              <p>Master & builder of SeenTasks. Founder of Arigato Labs.</p>
            </div>
            <div className="landing-about-block">
              <strong>SeenTasks</strong>
              <p>Quick tasks, one-time flows, Everyday repeats, workspaces, labels, and report cards.</p>
            </div>
          </div>
        </section>

        <section className="feature-section landing-faq" id="faq">
          <div className="section-intro">
            <p className="eyebrow">Questions & answers</p>
            <h2>Common questions</h2>
          </div>
          <div className="landing-faq-list">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="landing-faq-item">
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="landing-cta">
          <div>
            <span>✣</span>
            <h2>Open Quick tasks and build your first flow.</h2>
            <p>Sign in once — your lists sync with Firebase.</p>
          </div>
          <div>
            <button className="button button-cream" disabled={busy || loading} onClick={enterApp}>
              {!user && <GoogleIcon />}
              {ctaLabel}
              <ArrowRight size={17} />
            </button>
            <InstallButton className="button landing-install-light" />
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <a className="landing-brand" href="#top">
          <Logo size={24} /> SeenTasks
        </a>
        <p>Invented at Arigato Labs · Kumar Devanshu</p>
        <div>
          <a href="#features">Features</a>
          <a href="#how">How to use</a>
          <a href="#faq">FAQ</a>
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
