import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Calendar,
  CheckSquare,
  ClipboardList,
  Compass,
  CornerDownLeft,
  Folder,
  GitBranch,
  Moon,
  Plus,
  Search,
  Settings,
  Sparkles,
  Timer,
  Trash2,
  TrendingUp,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useTaskStore } from "../store/useTaskStore";
import { todayKey } from "../lib/date";
import { playTickSound, triggerConfetti } from "../lib/audioConfetti";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const quickWorkspaces = useTaskStore((s) => s.quickWorkspaces) || [];
  const followFlows = useTaskStore((s) => s.followFlows) || [];
  const addQuickTask = useTaskStore((s) => s.addQuickTask);
  const soundEnabled = useTaskStore((s) => s.soundEnabled);
  const setSoundEnabled = useTaskStore((s) => s.setSoundEnabled);

  // Listen for Ctrl+K / Cmd+K and custom event
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((cur) => !cur);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }

    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-command-palette", onOpen);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-command-palette", onOpen);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Build command items
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const isTaskCreation = q.startsWith("+") || q.startsWith("/task ") || q.startsWith("add ");

    if (isTaskCreation) {
      const cleanTitle = q.replace(/^(\+|\/task\s+|add\s+)/i, "").trim();
      return [
        {
          id: "create-task-instant",
          type: "action",
          icon: <Plus size={16} className="cmd-icon-action" />,
          title: cleanTitle ? `Create Quick Task: “${cleanTitle}”` : "Type a task title to add...",
          badge: "Instant Add",
          disabled: !cleanTitle,
          action: () => {
            if (cleanTitle) {
              addQuickTask({ title: cleanTitle, dateKey: todayKey() });
              if (soundEnabled) playTickSound();
              triggerConfetti();
              setOpen(false);
            }
          },
        },
      ];
    }

    const baseItems = [
      // Core Navigation
      {
        id: "nav-quick",
        type: "navigation",
        icon: <CheckSquare size={16} />,
        title: "Quick Tasks",
        category: "Pages",
        shortcut: "G Q",
        action: () => {
          navigate("/app");
          setOpen(false);
        },
      },
      {
        id: "nav-flows",
        type: "navigation",
        icon: <GitBranch size={16} />,
        title: "Follow Flows (Everyday Routines & Sequences)",
        category: "Pages",
        shortcut: "G F",
        action: () => {
          navigate("/app/flows");
          setOpen(false);
        },
      },
      {
        id: "nav-reports",
        type: "navigation",
        icon: <ClipboardList size={16} />,
        title: "Daily Report Cards & GPA",
        category: "Pages",
        shortcut: "G R",
        action: () => {
          navigate("/app/reports");
          setOpen(false);
        },
      },
      {
        id: "nav-analytics",
        type: "navigation",
        icon: <TrendingUp size={16} />,
        title: "Productivity Analytics & 365 Heatmap",
        category: "Pages",
        shortcut: "G A",
        action: () => {
          navigate("/app/analytics");
          setOpen(false);
        },
      },
      {
        id: "nav-achievements",
        type: "navigation",
        icon: <Trophy size={16} />,
        title: "Trophy Cabinet & Badges",
        category: "Pages",
        action: () => {
          navigate("/app/achievements");
          setOpen(false);
        },
      },
      {
        id: "nav-guide",
        type: "navigation",
        icon: <BookOpen size={16} />,
        title: "Guide & Handbook (Blog)",
        category: "Pages",
        badge: "Handbook",
        action: () => {
          navigate("/app/guide");
          setOpen(false);
        },
      },
      {
        id: "nav-calendar",
        type: "navigation",
        icon: <Calendar size={16} />,
        title: "Calendar Overview",
        category: "Pages",
        action: () => {
          navigate("/app/calendar");
          setOpen(false);
        },
      },
      {
        id: "nav-settings",
        type: "navigation",
        icon: <Settings size={16} />,
        title: "Settings & System Security",
        category: "Pages",
        action: () => {
          navigate("/app/settings");
          setOpen(false);
        },
      },
      {
        id: "nav-bin",
        type: "navigation",
        icon: <Trash2 size={16} />,
        title: "Abort Bin",
        category: "Pages",
        action: () => {
          navigate("/app/bin");
          setOpen(false);
        },
      },

      // Instant Actions
      {
        id: "act-timer",
        type: "action",
        icon: <Timer size={16} className="cmd-icon-timer" />,
        title: "Start 25-Min Focus Timer",
        category: "Actions",
        badge: "Focus",
        action: () => {
          setOpen(false);
          window.dispatchEvent(new CustomEvent("open-focus-timer"));
        },
      },
      {
        id: "act-mood",
        type: "action",
        icon: <Moon size={16} className="cmd-icon-mood" />,
        title: "Open Nightly Mood Reflection",
        category: "Actions",
        badge: "Reflection",
        action: () => {
          setOpen(false);
          window.dispatchEvent(new CustomEvent("open-mood-tracker"));
        },
      },
      {
        id: "act-sound",
        type: "action",
        icon: soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />,
        title: soundEnabled ? "Mute Sound Effects" : "Enable Sound Effects",
        category: "Actions",
        badge: soundEnabled ? "Active" : "Muted",
        action: () => {
          setSoundEnabled(!soundEnabled);
          setOpen(false);
        },
      },

      // Workspaces
      ...quickWorkspaces.map((ws) => ({
        id: `ws-${ws.id}`,
        type: "workspace",
        icon: <Folder size={16} style={{ color: ws.color }} />,
        title: `Workspace: ${ws.name}`,
        category: "Workspaces",
        action: () => {
          navigate(`/app/workspace/${ws.id}`);
          setOpen(false);
        },
      })),

      // Follow Flows
      ...followFlows.map((f) => ({
        id: `flow-${f.id}`,
        type: "flow",
        icon: <GitBranch size={16} style={{ color: f.color }} />,
        title: `Flow: ${f.name}`,
        category: "Flows",
        badge: f.repeat === "daily" ? "Everyday" : "Sequence",
        action: () => {
          navigate(`/app/flows/${f.id}`);
          setOpen(false);
        },
      })),
    ];

    if (!q) return baseItems;

    return baseItems.filter((it) => {
      const matchTitle = it.title.toLowerCase().includes(q);
      const matchCat = (it.category || "").toLowerCase().includes(q);
      return matchTitle || matchCat;
    });
  }, [query, quickWorkspaces, followFlows, navigate, soundEnabled, setSoundEnabled, addQuickTask]);

  // Handle arrow keys and Enter
  function handleInputKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((cur) => (cur + 1) % Math.max(items.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((cur) => (cur - 1 + items.length) % Math.max(items.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = items[selectedIndex];
      if (target && !target.disabled) {
        target.action();
      }
    }
  }

  if (!open) return null;

  return (
    <div className="command-palette-backdrop" onClick={() => setOpen(false)}>
      <div
        className="command-palette-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Command Palette"
      >
        {/* Search bar input */}
        <div className="command-palette-search-row">
          <Search size={18} className="command-palette-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Type a page, command, or '+ task title'..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
          />
          {query ? (
            <button
              type="button"
              className="command-palette-clear"
              onClick={() => setQuery("")}
              aria-label="Clear query"
            >
              <X size={14} />
            </button>
          ) : (
            <kbd className="command-palette-kbd">ESC</kbd>
          )}
        </div>

        {/* Results list */}
        <div className="command-palette-results" role="listbox">
          {items.length === 0 ? (
            <div className="command-palette-empty">
              <Compass size={24} />
              <p>No matching commands found for “{query}”</p>
              <span>Tip: Type <strong>+ Buy milk</strong> to instantly add a task.</span>
            </div>
          ) : (
            items.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  className={`command-palette-item${isSelected ? " is-selected" : ""}${item.disabled ? " is-disabled" : ""}`}
                  onClick={() => {
                    if (!item.disabled) item.action();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="cmd-item-icon">{item.icon}</span>
                  <div className="cmd-item-info">
                    <span className="cmd-item-title">{item.title}</span>
                    {item.category && <small className="cmd-item-cat">{item.category}</small>}
                  </div>
                  {item.badge && <span className="cmd-item-badge">{item.badge}</span>}
                  {item.shortcut && <kbd className="cmd-item-shortcut">{item.shortcut}</kbd>}
                  {isSelected && <CornerDownLeft size={13} className="cmd-item-enter-icon" />}
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="command-palette-footer">
          <div className="cmd-footer-hints">
            <span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span>
            <span><kbd>↵</kbd> to select</span>
            <span><kbd>esc</kbd> to close</span>
          </div>
          <span className="cmd-footer-brand">
            <Sparkles size={11} /> SeenTasks Command
          </span>
        </div>
      </div>
    </div>
  );
}
