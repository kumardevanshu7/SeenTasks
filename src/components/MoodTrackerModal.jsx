import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Clock, Flame, Heart, Lock, Moon, Sparkles, X } from "lucide-react";
import { useTaskStore } from "../store/useTaskStore";
import { MOOD_EXPRESSIONS, getMoodWindowCountdown, isMoodWindowOpen } from "../lib/moodService";
import { formatFriendly, todayKey } from "../lib/date";
import { triggerConfetti } from "../lib/audioConfetti";

export default function MoodTrackerModal({ open, onClose }) {
  const dailyMoods = useTaskStore((s) => s.dailyMoods) || {};
  const recordDailyMood = useTaskStore((s) => s.recordDailyMood);

  const today = todayKey();
  const todayEntry = dailyMoods[today];

  const [selectedMoodId, setSelectedMoodId] = useState(todayEntry?.moodId || "");
  const [note, setNote] = useState(todayEntry?.note || "");
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

  const isOpen = countdown.isOpen;
  const activeMood = MOOD_EXPRESSIONS.find((m) => m.id === selectedMoodId);

  function handleSave() {
    if (!selectedMoodId) return;
    recordDailyMood(today, selectedMoodId, note);
    setSavedSuccess(true);
    triggerConfetti();
    setTimeout(() => {
      setSavedSuccess(false);
    }, 2500);
  }

  if (!open) return null;

  // Past moods history (sorted recent first)
  const pastEntries = Object.entries(dailyMoods)
    .map(([dateKey, data]) => ({ dateKey, ...data }))
    .sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1));

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
          <div className="mood-modal-header">
            <div className="mood-modal-title">
              <span className="mood-header-icon">
                <Moon size={20} />
              </span>
              <div>
                <h2>Daily Expression & Mood</h2>
                <p className="mood-modal-sub">
                  Reflect on your inner state · Open strictly 11:00 PM – 11:59 PM
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

          {/* Window status banner */}
          <div className={`mood-window-banner${isOpen ? " is-open" : " is-locked"}`}>
            <div className="mood-window-info">
              {isOpen ? <Sparkles size={16} /> : <Lock size={16} />}
              <div>
                <strong>{isOpen ? "Nightly Reflection is LIVE" : "Window opens tonight at 11:00 PM"}</strong>
                <p>{countdown.label}</p>
              </div>
            </div>
            {isOpen && (
              <span className="mood-live-badge">
                <span className="mood-live-dot" /> Live
              </span>
            )}
          </div>

          {/* Selected mood preview if saved or chosen */}
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

          {/* Form input when window is open */}
          {isOpen && (
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
                <button
                  type="button"
                  className="button button-primary mood-lock-btn"
                  disabled={!selectedMoodId}
                  onClick={handleSave}
                >
                  {savedSuccess ? (
                    <>
                      <Check size={16} /> Locked in for Today!
                    </>
                  ) : todayEntry ? (
                    "Update Today's Mood"
                  ) : (
                    "Lock in Today's Mood"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Expression Library Grid */}
          <div className="mood-lib-section">
            <div className="mood-lib-head">
              <h3>Expression Library ({MOOD_EXPRESSIONS.length})</h3>
              <span>{isOpen ? "Tap an expression to choose your mood" : "Explore expressions & their deep meanings"}</span>
            </div>

            <div className="mood-grid">
              {MOOD_EXPRESSIONS.map((expr) => {
                const selected = selectedMoodId === expr.id;
                return (
                  <article
                    key={expr.id}
                    className={`mood-card${selected ? " is-selected" : ""}${!isOpen ? " is-read-only" : ""}`}
                    onClick={() => {
                      if (isOpen) {
                        setSelectedMoodId(expr.id);
                      }
                    }}
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

          {/* Past Reflection History */}
          {pastEntries.length > 0 && (
            <div className="mood-history-section">
              <div className="mood-lib-head">
                <h3>Past Reflections</h3>
                <span>{pastEntries.length} logged</span>
              </div>
              <div className="mood-history-list">
                {pastEntries.slice(0, 10).map((entry) => {
                  const m = MOOD_EXPRESSIONS.find((x) => x.id === entry.moodId);
                  return (
                    <div key={entry.dateKey} className="mood-history-row">
                      <span className="mood-history-emoji">{m?.emoji || "✨"}</span>
                      <div className="mood-history-body">
                        <div className="mood-history-head">
                          <strong>{m?.label || "Reflected"}</strong>
                          <span>{formatFriendly(entry.dateKey)}</span>
                        </div>
                        {entry.note && <p className="mood-history-note">"{entry.note}"</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
