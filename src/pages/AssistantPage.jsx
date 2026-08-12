import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { LoaderCircle, Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { chatWithAssistant } from "../lib/openrouter";
import { useTaskStore } from "../store/useTaskStore";
import { todayKey } from "../lib/date";
import { DEFAULT_WORKSPACE_ID } from "../lib/quickTaskService";

const STARTERS = [
  "Aaj kya pending hai? 👀",
  "Mera Everyday flow ka scene kya hai?",
  "CodebyTushu kya hai btw?",
  "Be honest — am I slacking today? 😅",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Yo! 👋 Main tera SeenTasks buddy hoon — tasks, flows, report cards, sab puchh. Casual hi baat karte hain, aur agar tu procrastinate kar raha hai toh bol dunga 😤",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  const quickTasks = useTaskStore((s) => s.quickTasks);
  const tasks = useTaskStore((s) => s.tasks);
  const quickLabels = useTaskStore((s) => s.quickLabels);
  const quickWorkspaces = useTaskStore((s) => s.quickWorkspaces);
  const followFlows = useTaskStore((s) => s.followFlows);
  const persona = useTaskStore((s) => s.persona);

  const labelsById = useMemo(() => {
    const map = {};
    (quickLabels || []).forEach((l) => {
      map[l.id] = l;
    });
    return map;
  }, [quickLabels]);

  const workspacesById = useMemo(() => {
    const map = { [DEFAULT_WORKSPACE_ID]: { id: DEFAULT_WORKSPACE_ID, name: "Personal" } };
    (quickWorkspaces || []).forEach((w) => {
      map[w.id] = w;
    });
    return map;
  }, [quickWorkspaces]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  function buildContext() {
    return {
      dateKey: todayKey(),
      quickTasks: quickTasks || [],
      tasks: (tasks || []).filter((t) => t.status !== "aborted"),
      labelsById,
      workspacesById,
      flows: followFlows || [],
      persona: persona || [],
    };
  }

  async function send(text) {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError("");
    try {
      const reply = await chatWithAssistant(next, buildContext());
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setError("The assistant is unavailable right now. Check your OpenRouter key and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page narrow-page assistant-page">
      <section className="simple-hero">
        <p className="eyebrow">Your buddy</p>
        <h1>Talk it through</h1>
        <p>
          Casual chat about your tasks, flows, and reports — emojis, honesty, and the occasional roast included.
        </p>
      </section>

      <section className="chat-window">
        <div className="chat-scroll" ref={scrollRef}>
          {messages.map((message, index) => (
            <motion.div
              key={index}
              className={`chat-bubble chat-${message.role}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {message.role === "assistant" && (
                <span className="chat-mark">
                  <Sparkles size={13} />
                </span>
              )}
              {message.role === "assistant" ? (
                <div className="chat-md">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              ) : (
                <p>{message.content}</p>
              )}
            </motion.div>
          ))}
          {busy && (
            <div className="chat-bubble chat-assistant chat-typing">
              <span className="chat-mark">
                <Sparkles size={13} />
              </span>
              <LoaderCircle className="spin" size={16} />
            </div>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="chat-starters">
            {STARTERS.map((s) => (
              <button key={s} type="button" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        {error && (
          <p className="chat-error" role="alert">
            {error}
          </p>
        )}

        <form
          className="chat-input"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Kuch bhi puchh — tasks, flows, ya bas baatein…"
            disabled={busy}
          />
          <button
            type="submit"
            className="icon-button icon-button-coral"
            disabled={busy || !input.trim()}
            aria-label="Send"
          >
            {busy ? <LoaderCircle className="spin" size={18} /> : <Send size={18} />}
          </button>
        </form>
      </section>
    </div>
  );
}
