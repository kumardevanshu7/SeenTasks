import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { LoaderCircle, Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { chatWithAssistant } from "../lib/openrouter";

const STARTERS = [
  "Help me plan a calm but productive day.",
  "I feel overwhelmed. What should I do first?",
  "Break this big task into small steps.",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi, I'm your SeenTasks companion. Tell me what's on your mind and we'll shape your day together." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(text) {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError("");
    try {
      const reply = await chatWithAssistant(next);
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
        <p className="eyebrow">Think out loud</p>
        <h1>Talk it through</h1>
        <p>A calm companion for planning, prioritizing, and staying balanced. Powered by your OpenRouter model.</p>
      </section>

      <section className="chat-window">
        <div className="chat-scroll" ref={scrollRef}>
          {messages.map((message, index) => (
            <motion.div key={index} className={`chat-bubble chat-${message.role}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              {message.role === "assistant" && <span className="chat-mark"><Sparkles size={13} /></span>}
              {message.role === "assistant"
                ? <div className="chat-md"><ReactMarkdown>{message.content}</ReactMarkdown></div>
                : <p>{message.content}</p>}
            </motion.div>
          ))}
          {busy && <div className="chat-bubble chat-assistant chat-typing"><span className="chat-mark"><Sparkles size={13} /></span><LoaderCircle className="spin" size={16} /></div>}
        </div>

        {messages.length <= 1 && (
          <div className="chat-starters">{STARTERS.map((s) => <button key={s} type="button" onClick={() => send(s)}>{s}</button>)}</div>
        )}
        {error && <p className="chat-error" role="alert">{error}</p>}

        <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything about your day…" disabled={busy} />
          <button type="submit" className="icon-button icon-button-coral" disabled={busy || !input.trim()} aria-label="Send">{busy ? <LoaderCircle className="spin" size={18} /> : <Send size={18} />}</button>
        </form>
      </section>
    </div>
  );
}
