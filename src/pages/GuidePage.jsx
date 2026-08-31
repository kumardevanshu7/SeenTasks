import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  CheckSquare,
  Clock,
  Compass,
  Flame,
  GitBranch,
  HelpCircle,
  Keyboard,
  ListTree,
  Lock,
  Moon,
  Share2,
  ShieldCheck,
  Sparkles,
  Timer,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";

export default function GuidePage({ inApp = false }) {
  const [activeSection, setActiveSection] = useState("philosophy");

  const sections = [
    { id: "philosophy", label: "The Philosophy", icon: <Sparkles size={16} /> },
    { id: "quicktasks", label: "Quick Tasks & Subtasks", icon: <CheckSquare size={16} /> },
    { id: "flows", label: "Follow Flows & Routines", icon: <GitBranch size={16} /> },
    { id: "reports", label: "Report Cards & GPA", icon: <TrendingUp size={16} /> },
    { id: "mood", label: "Nightly Mood Reflection", icon: <Moon size={16} /> },
    { id: "timer", label: "Focus Timer & Audio", icon: <Timer size={16} /> },
    { id: "shortcuts", label: "Command Palette (Ctrl+K)", icon: <Keyboard size={16} /> },
    { id: "security", label: "One Password Security", icon: <Lock size={16} /> },
  ];

  function scrollTo(id) {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div className="guide-page-container">
      {/* Top Hero Banner */}
      <header className="guide-hero">
        <div className="guide-hero-nav">
          <Link to={inApp ? "/app" : "/"} className="workspace-back">
            <ArrowLeft size={15} /> {inApp ? "Back to workspace" : "Back to home"}
          </Link>
          <span className="guide-version-tag">SeenTasks Handbook · 2026 Edition</span>
        </div>

        <div className="guide-hero-content">
          <p className="eyebrow">The Official Guide & Handbook</p>
          <h1>How to build calm, human momentum with SeenTasks</h1>
          <p className="guide-hero-lead">
            An editorial guide to intentional daily planning, midnight resets, micro-steps, and guilt-free streak protection.
          </p>

          <div className="guide-hero-meta">
            <span>📖 6 min read</span>
            <span>·</span>
            <span>⚡ Keyboard shortcuts included</span>
            <span>·</span>
            <span>🌱 Updated for 2026</span>
          </div>
        </div>
      </header>

      {/* Main Content Layout with Sticky Sidebar */}
      <div className="guide-main-grid">
        {/* Sticky Table of Contents */}
        <aside className="guide-toc-sidebar">
          <div className="guide-toc-card">
            <h4>Contents</h4>
            <nav className="guide-toc-nav">
              {sections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`guide-toc-link${activeSection === s.id ? " is-active" : ""}`}
                  onClick={() => scrollTo(s.id)}
                >
                  <span className="guide-toc-icon">{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </nav>

            <div className="guide-toc-cta">
              <p>Ready to try?</p>
              <Link to="/app" className="button button-primary guide-cta-btn">
                Open App <Sparkles size={14} />
              </Link>
            </div>
          </div>
        </aside>

        {/* Editorial Body Articles */}
        <main className="guide-article-body">
          {/* Section 1: The Philosophy */}
          <section id="philosophy" className="guide-section">
            <div className="guide-section-badge">
              <Sparkles size={14} /> Philosophy
            </div>
            <h2>1. Why Midnight Resets Create True Momentum</h2>
            <p>
              Traditional task apps act like endless digital storage lockers: tasks pile up over weeks, overdue red numbers generate guilt, and opening your app causes anxiety rather than clarity.
            </p>
            <p>
              <strong>SeenTasks is built on the philosophy of the Human Daily Reset.</strong> Every day at 12:00 AM midnight, the slate is gently wiped clean. Unfinished items are archived into a calm retrospective rather than lingering to haunt your morning. Each sunrise begins with zero guilt and a fresh canvas.
            </p>

            <div className="guide-callout-card">
              <div className="guide-callout-head">
                <ShieldCheck size={18} className="callout-icon" />
                <strong>The 3 SeenTasks Principles</strong>
              </div>
              <ul>
                <li><strong>1. Intentional Speed:</strong> Pick 3-5 things that truly matter today instead of writing 40 tasks you will never do.</li>
                <li><strong>2. Guilt-Free Rest:</strong> Streak Shields protect your momentum when you take deliberate rest days.</li>
                <li><strong>3. Evening Reflection:</strong> Close your workday with gratitude and reflection at 11:00 PM rather than endless late-night scrolling.</li>
              </ul>
            </div>
          </section>

          {/* Section 2: Quick Tasks & Subtasks */}
          <section id="quicktasks" className="guide-section">
            <div className="guide-section-badge">
              <CheckSquare size={14} /> Checklist & Steps
            </div>
            <h2>2. Quick Tasks, Workspaces & Micro-Steps</h2>
            <p>
              Quick Tasks is your primary daily workspace. Here is how to unlock its full power:
            </p>

            <div className="guide-feature-grid">
              <div className="guide-feature-box">
                <h4><ListTree size={16} /> Micro-Steps (Subtasks)</h4>
                <p>
                  Click the <strong>ListTree icon</strong> on any task row to expand an inline checklist. Break intimidating tasks into 2-4 bite-sized actions (e.g. “Draft email”, “Find attachment”). A progress counter (<code>2/3 steps</code>) keeps you motivated.
                </p>
              </div>

              <div className="guide-feature-box">
                <h4><Calendar size={16} /> Cross-Day Due Dates</h4>
                <p>
                  When you set a future due date (e.g. created on Aug 27, due Sep 2), the task remains <strong>active across every intermediate day</strong>. It never docks your percentage until the final deadline arrives.
                </p>
              </div>

              <div className="guide-feature-box">
                <h4><Compass size={16} /> Workspaces & Labels</h4>
                <p>
                  Organize tasks across workspaces (e.g. <em>Personal</em>, <em>Client Work</em>, <em>Health</em>). Tap any color-coded label pill to instantly filter tasks with a single click.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Follow Flows */}
          <section id="flows" className="guide-section">
            <div className="guide-section-badge">
              <GitBranch size={14} /> Daily Routines
            </div>
            <h2>3. Everyday Routines vs Step-by-Step Sequences</h2>
            <p>
              <strong>Follow Flows</strong> provide structured pathways for repeating habits and one-time milestone projects:
            </p>
            <ul>
              <li><strong>Everyday Flows (Daily Repeat):</strong> Ideal for morning routines, workout sequences, or evening wind-downs. Ticked steps archive into your daily report at midnight and reset automatically.</li>
              <li><strong>One-Time Sequences:</strong> Milestone paths that unlock step-by-step as you tick each previous phase. Perfect for product launches, study roadmaps, and book writing.</li>
              <li><strong>Workspace Mirrors:</strong> Everyday flow steps automatically mirror onto your Today Quick Tasks list, so you never have to switch tabs.</li>
            </ul>
          </section>

          {/* Section 4: Report Cards & GPA */}
          <section id="reports" className="guide-section">
            <div className="guide-section-badge">
              <TrendingUp size={14} /> Analytics & Grades
            </div>
            <h2>4. School-Style Report Cards & 365-Day Heatmap</h2>
            <p>
              Every morning, your yesterday’s completion percentage is transformed into a school-style letter grade (<strong>A+ to F</strong>) with personalized AI feedback.
            </p>
            <div className="guide-feature-grid">
              <div className="guide-feature-box">
                <h4><Flame size={16} /> Streak Shields</h4>
                <p>
                  You receive 2 monthly Streak Shields. If you take a planned weekend off or get sick, your streak is preserved automatically without resetting to zero.
                </p>
              </div>
              <div className="guide-feature-box">
                <h4><Share2 size={16} /> Shareable Report Card</h4>
                <p>
                  Click the <strong>Share Card</strong> button on any report to generate a high-resolution retro aesthetic PNG image ready to download or paste directly to WhatsApp or social media.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5: Nightly Mood Reflection */}
          <section id="mood" className="guide-section">
            <div className="guide-section-badge">
              <Moon size={14} /> Emotional Wellbeing
            </div>
            <h2>5. The 11:00 PM Reflection Window</h2>
            <p>
              At 11:00 PM each night, the <strong>Nightly Mood tracker</strong> goes live. Take 60 seconds to pick your mood expression (e.g. ⚡ <em>Energized</em>, 🌿 <em>Calm & Content</em>, 🌊 <em>Flow State</em>, 🛋️ <em>Restful</em>) and write a one-line highlight of the day.
            </p>
            <p>
              Over months, the Analytics page correlates your moods with your most productive hours so you learn when you perform at your best.
            </p>
          </section>

          {/* Section 6: Focus Timer */}
          <section id="timer" className="guide-section">
            <div className="guide-section-badge">
              <Timer size={14} /> Deep Work
            </div>
            <h2>6. The 25-Minute Focus Timer</h2>
            <p>
              Built on the proven Pomodoro cadence: 25 minutes of uninterrupted single-task focus followed by a 5-minute restorative break.
            </p>
            <ul>
              <li><strong>Minimizable Window:</strong> Minimize the timer into a floating pill so you can navigate workspaces while it runs.</li>
              <li><strong>Auditory Completion Cue:</strong> A gentle bell rings when your session finishes, accompanied by celebratory confetti.</li>
            </ul>
          </section>

          {/* Section 7: Command Palette */}
          <section id="shortcuts" className="guide-section">
            <div className="guide-section-badge">
              <Keyboard size={14} /> Power Users
            </div>
            <h2>7. Command Palette (`Ctrl + K` / `Cmd + K`)</h2>
            <p>
              Power users can navigate the entire SeenTasks app without touching the mouse:
            </p>

            <table className="guide-shortcut-table">
              <thead>
                <tr>
                  <th>Shortcut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><kbd>Ctrl + K</kbd> or <kbd>Cmd + K</kbd></td>
                  <td>Open Global Command Palette from any screen</td>
                </tr>
                <tr>
                  <td><code>+ task title</code> in Command Palette</td>
                  <td>Instantly create a new Quick Task</td>
                </tr>
                <tr>
                  <td><kbd>G</kbd> then <kbd>Q</kbd></td>
                  <td>Jump to Quick Tasks</td>
                </tr>
                <tr>
                  <td><kbd>G</kbd> then <kbd>F</kbd></td>
                  <td>Jump to Follow Flows</td>
                </tr>
                <tr>
                  <td><kbd>G</kbd> then <kbd>R</kbd></td>
                  <td>Jump to Daily Reports</td>
                </tr>
                <tr>
                  <td><kbd>G</kbd> then <kbd>A</kbd></td>
                  <td>Jump to Productivity Analytics</td>
                </tr>
                <tr>
                  <td><kbd>Esc</kbd></td>
                  <td>Close any active modal or command palette</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Section 8: One Password Security */}
          <section id="security" className="guide-section">
            <div className="guide-section-badge">
              <Lock size={14} /> Security
            </div>
            <h2>8. Zero Plain-Text Security with One Password</h2>
            <p>
              To protect you from accidental bulk deletions or device tampering, SeenTasks uses the <strong>One Password Security Question</strong>.
            </p>
            <p>
              Your answer is hashed cryptographically before being stored. Sensitive actions like <em>Batch Delete</em>, <em>Workspace Wipe</em>, and <em>App Reset</em> require answering your security question to ensure intentional, safe control.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
