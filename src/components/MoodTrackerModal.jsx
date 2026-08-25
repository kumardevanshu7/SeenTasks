import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  Flame,
  Lock,
  Moon,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { useTaskStore } from "../store/useTaskStore";
import { MOOD_EXPRESSIONS, getMoodWindowCountdown, isMoodWindowOpen } from "../lib/moodService";
import { formatFriendly, todayKey } from "../lib/date";
import { triggerConfetti } from "../lib/audioConfetti";

export default function MoodTrackerModal({ open, onClose }) {
  const dailyMoods = useTaskStore((s) => s.dailyMoods) || {};
  const recordDailyMood = useTaskStore((s) => s.recordDailyMood);

  const today = todayKey();
  const todayEntry = dailyMoods[today];
  const isLoggedToday = Boolean(todayEntry && todayEntry.moodId);

  const [selectedMoodId, setSelectedMoodId] = useState(todayEntry?.moodId || "");
  const [note, setNote] = useState(todayEntry?.note || "");
  const [isEditing, setIsEditing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [countdown, setCountdown] = useState(() => getMoodWindowCountdown());

  // Update countdown every 10 seconds
  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(getMoodWindowCountdown());
    }, 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (todayEntry) {
      setSelectedMoodId(todayEntry.moodId);
      setNote(todayEntry.note || "");
    }
  }, [todayEntry]);

  const isWindowOpen = countdown.isOpen;
  const activeMood = MOOD_EXPRESSIONS.find((m) => m.id === selectedMoodId);
  const todaySavedMood = MOOD_EXPRESSIONS.find((m) => m.id === todayEntry?.moodId);

  function handleSave() {
    if (!selectedMoodId) return;
    recordDailyMood(today, selectedMoodId, note);
    setSavedSuccess(true);
    triggerConfetti();
    setIsEditing(false);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 2500);
  }

  if (!open) return null;

  // Past moods history (sorted recent first)
  const pastEntries = Object.entries(dailyMoods)
    .map(([dateKey, data]) => ({ dateKey, ...data }))
    .sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1));

  // Determine whether to show the active logging form or the completed session summary
  const showForm = isWindowOpen && (!isLoggedToday || isEditing);

  return (
    <AnimatePresence>
      <motion.div
        className="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="mood-modal-card"
          initial={{ scale: 0.95, opacity: 0, y: 14 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="mood-modal-header">
            <div className="mood-modal-title">
              <span className="mood-header-icon">
                <Moon size={20} />
              </span>
              <div>
                <h2>Nightly Expression & Mood</h2>
                <p className="mood-modal-sub">
                  Daily reflection window · 11:00 PM – 11:59 PM
                </p>
              </div>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Session Over / Window Status Banner */}
          {isLoggedToday && !isEditing ? (
            <div className="mood-window-banner is-complete">
              <div className="mood-window-info">
                <CheckCircle2 size={18} className="mood-complete-check" />
                <div>
                  <strong>Today’s Reflection Completed</strong>
                  <p>Session closed for today · Next window opens tomorrow at 11:00 PM</p>
                </div>
              </div>
              <span className="mood-done-badge">
                <Check size={12} /> Logged
              </span>
            </div>
          ) : (
            <div className={`mood-window-banner${isWindowOpen ? " is-open" : " is-locked"}`}>
              <div className="mood-window-info">
                {isWindowOpen ? <Sparkles size={16} /> : <Lock size={16} />}
                <div>
                  <strong>{isWindowOpen ? "Nightly Reflection is LIVE" : "Window opens tonight at 11:00 PM"}</strong>
                  <p>{countdown.label}</p>
                </div>
              </div>
              {isWindowOpen && (
                <span className="mood-live-badge">
                  <span className="mood-live-dot" /> Live
                </span>
              )}
            </div>
          )}

          {/* VIEW 1: Today Already Logged - Clean Confirmed Mood Card */}
          {isLoggedToday && !isEditing && todaySavedMood && (
            <div className="mood-completed-summary">
              <div
                className="mood-confirmed-card"
                style={{
                  "--mood-bg": todaySavedMood.color,
                }}
              >
                <div className="mood-confirmed-header">
                  <span className="mood-confirmed-emoji">{todaySavedMood.emoji}</span>
                  <div className="mood-confirmed-title-wrap">
                    <div className="mood-confirmed-badge-row">
                      <span className="mood-confirmed-tag">{todaySavedMood.vibeTag}</span>
                      <span className="mood-confirmed-date">Today · {formatFriendly(today)}</span>
                    </div>
                    <h3>{todaySavedMood.label}</h3>
                  </div>
                </div>

                <p className="mood-confirmed-meaning">{todaySavedMood.meaning}</p>

                {todayEntry.note && (
                  <div className="mood-confirmed-quote">
                    <span>“{todayEntry.note}”</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 2: Active Logging Form (When window is open and user is choosing/editing) */}
          {showForm && (
            <>
              {/* Selected mood preview */}
              {activeMood && (
                <div
                  className="mood-active-showcase"
                  style={{
                    "--mood-bg": activeMood.color,
                  }}
                >
                  <span className="mood-showcase-emoji">{activeMood.emoji}</span>
                  <div className="mood-showcase-info">
                    <div className="mood-showcase-head">
                      <h3>{activeMood.label}</h3>
                      <span className="mood-showcase-tag">{activeMood.vibeTag}</span>
                    </div>
                    <p>{activeMood.meaning}</p>
                  </div>
                </div>
              )}

              {/* Note input & Save Button */}
              <div className="mood-entry-form">
                <label htmlFor="mood-thought">One-line thought / highlight (optional):</label>
                <input
                  id="mood-thought"
                  className="text-input mood-note-input"
                  placeholder="e.g. Cleared 4 flows, felt invincible today!"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={140}
                />
                <div className="mood-form-actions">
                  {isEditing && (
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    className="button button-primary mood-lock-btn"
                    disabled={!selectedMoodId}
                    onClick={handleSave}
                  >
                    {savedSuccess ? (
                      <>
                        <Check size={16} /> Saved for Today!
                      </>
                    ) : isLoggedToday ? (
                      "Update Today's Mood"
                    ) : (
                      "Confirm Today's Mood"
                    )}
                  </button>
                </div>
              </div>

              {/* Expression Library Grid */}
              <div className="mood-lib-section">
                <div className="mood-lib-head">
                  <h3>Expression Library ({MOOD_EXPRESSIONS.length})</h3>
                  <span>Tap an expression to choose your mood</span>
                </div>

                <div className="mood-grid">
                  {MOOD_EXPRESSIONS.map((expr) => {
                    const selected = selectedMoodId === expr.id;
                    return (
                      <article
                        key={expr.id}
                        className={`mood-card${selected ? " is-selected" : ""}`}
                        onClick={() => setSelectedMoodId(expr.id)}
                        style={{
                          "--expr-bg": expr.color,
                        }}
                      >
                        <div className="mood-card-top">
                          <span className="mood-emoji">{expr.emoji}</span>
                          <span className="mood-tag">{expr.vibeTag}</span>
                        </div>
                        <strong className="mood-title">{expr.label}</strong>
                        <p className="mood-meaning">{expr.meaning}</p>
                      </article>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Past Reflection History List */}
          {pastEntries.length > 0 && (
            <div className="mood-history-section">
              <div className="mood-lib-head">
                <h3>Reflection History</h3>
                <span>{pastEntries.length} logged</span>
              </div>
              <div className="mood-history-list">
                {pastEntries.map((entry) => {
                  const m = MOOD_EXPRESSIONS.find((x) => x.id === entry.moodId);
                  const isCurrent = entry.dateKey === today;
                  return (
                    <div key={entry.dateKey} className={`mood-history-row${isCurrent ? " is-today" : ""}`}>
                      <span className="mood-history-emoji">{m?.emoji || "✨"}</span>
                      <div className="mood-history-body">
                        <div className="mood-history-head">
                          <strong>{m?.label || "Reflected"}</strong>
                          <span className="mood-history-tag">{m?.vibeTag}</span>
                          <span className="mood-history-date">{formatFriendly(entry.dateKey)}</span>
                        </div>
                        {entry.note && <p className="mood-history-note">“{entry.note}”</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Action: View in Analytics */}
          <div className="mood-modal-footer">
            <Link
              to="/app/analytics"
              className="mood-analytics-link"
              onClick={onClose}
            >
              <TrendingUp size={15} /> View Full Mood & Habit Analytics
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
