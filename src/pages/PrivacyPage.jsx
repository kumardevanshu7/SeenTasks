import LegalLinks from "../components/LegalLinks";

export default function PrivacyPage() {
  return (
    <div className="page narrow-page legal-page">
      <section className="simple-hero">
        <p className="eyebrow">Legal</p>
        <h1>Privacy Policy</h1>
        <p>Last updated: 2026 · SeenTasks by Arigato Labs</p>
      </section>

      <section className="legal-prose">
        <h2>Who we are</h2>
        <p>
          SeenTasks is a product of <strong>Arigato Labs</strong>, founded by Kumar Devanshu.
          Contact: <a href="mailto:kumardevanshu3001@gmail.com">kumardevanshu3001@gmail.com</a>.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>Account details from Google sign-in (name, email, photo URL) via Firebase Authentication.</li>
          <li>Content you create in the app — for example Quick tasks (Firestore), Today / AI tasks and persona preferences (this device), and collaboration data when you use Organization features.</li>
          <li>Security settings you choose, such as One Password (question + hashed answer stored in Firebase — not the plain answer).</li>
          <li>Optional contact-form messages you send us (name, email, subject, message).</li>
        </ul>

        <h2>How we use data</h2>
        <p>
          We use this information to run SeenTasks: sign you in, sync Quick tasks across your devices,
          power AI prioritization when enabled, protect deletes with One Password, and respond to support messages.
        </p>

        <h2>Third parties</h2>
        <ul>
          <li><strong>Google / Firebase</strong> — authentication and Firestore database.</li>
          <li><strong>OpenRouter</strong> — optional AI analysis of task text you submit for prioritization.</li>
          <li><strong>Hosting</strong> — the platform that serves this web app (e.g. Vercel).</li>
          <li><strong>Web3Forms</strong> (or similar) — only if you use the Contact form, to deliver email to the founder.</li>
        </ul>
        <p>We do not sell your personal data.</p>

        <h2>Storage &amp; retention</h2>
        <p>
          Quick tasks and account-linked cloud data live in Firebase under your user id.
          Some preferences and AI task boards are stored on this device (browser storage).
          You can remove Quick tasks and reset app data from Settings (One Password required).
          Sign-out stops access from this browser; deleting cloud data permanently may require contacting us.
        </p>

        <h2>Security</h2>
        <p>
          We use reasonable safeguards (authenticated Firebase access, hashed One Password answers).
          No system is perfectly secure — protect your Google account and avoid sharing sensitive secrets in task titles.
        </p>

        <h2>Children</h2>
        <p>SeenTasks is not directed at children under 13.</p>

        <h2>Changes</h2>
        <p>We may update this policy. Continued use after changes means you accept the updated version.</p>

        <h2>Contact</h2>
        <p>
          Questions: <a href="mailto:kumardevanshu3001@gmail.com">kumardevanshu3001@gmail.com</a>
          {" · "}
          <a href="/contact">Contact form</a>
        </p>

        <LegalLinks className="legal-links-inline" muted />
        <p className="legal-copy-note">Copyright © 2026 Arigato Labs. All Rights Reserved.</p>
      </section>
    </div>
  );
}
