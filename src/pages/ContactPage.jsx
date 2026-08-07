import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Send } from "lucide-react";
import LegalLinks from "../components/LegalLinks";

const CONTACT_EMAIL = "kumardevanshu3001@gmail.com";
const WEB3FORMS_URL = "https://api.web3forms.com/submit";

function buildMessageBody({ name, email, subject, message }) {
  return [
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "  ARIGATO LABS · CONTACT",
    "  Product: SeenTasks",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "",
    `From:     ${name}`,
    `Email:    ${email}`,
    `Subject:  ${subject}`,
    "",
    "Message",
    "-------",
    message,
    "",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "Sent from SeenTasks contact form",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  ].join("\n");
}

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const accessKey = import.meta.env.VITE_WEB3FORMS_KEY || "";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSent(false);

    if (!accessKey) {
      setError("Contact form is not configured yet. Email us directly at the address below.");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        access_key: accessKey,
        subject: `[SeenTasks] ${subject.trim()}`,
        from_name: `Arigato Labs · SeenTasks`,
        name: name.trim(),
        email: email.trim(),
        message: buildMessageBody({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
        }),
      };

      const res = await fetch(WEB3FORMS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.message || "Could not send message.");
      }
      setSent(true);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed. Try again or email us directly.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page narrow-page legal-page">
      <section className="simple-hero">
        <p className="eyebrow">Arigato Labs</p>
        <h1>Contact</h1>
        <p>Questions about SeenTasks or Arigato Labs? Send a message — it goes to the founder.</p>
      </section>

      <section className="content-card contact-card">
        <form className="one-password-form contact-form" onSubmit={handleSubmit}>
          <label>
            Name
            <input
              className="text-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
              autoComplete="name"
              disabled={busy}
            />
          </label>
          <label>
            Email
            <input
              className="text-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={120}
              autoComplete="email"
              disabled={busy}
            />
          </label>
          <label>
            Subject
            <input
              className="text-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              maxLength={120}
              disabled={busy}
            />
          </label>
          <label>
            Message
            <textarea
              className="text-input contact-textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={6}
              maxLength={4000}
              disabled={busy}
            />
          </label>

          {error && <p className="quick-delete-error">{error}</p>}
          {sent && <p className="one-password-ok">Message sent — we’ll get back to you by email.</p>}

          <div className="one-password-actions">
            <button type="submit" className="button button-primary" disabled={busy}>
              {busy ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
              {busy ? "Sending…" : "Send message"}
            </button>
          </div>
        </form>

        <p className="contact-direct">
          Or email directly:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          {" · "}
          <Link to="/about">About</Link>
        </p>
      </section>

      <div className="legal-page-bottom">
        <LegalLinks muted />
        <p className="legal-copy-note">Copyright © 2026 Arigato Labs. All Rights Reserved.</p>
      </div>
    </div>
  );
}
