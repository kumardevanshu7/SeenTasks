import LegalLinks from "../components/LegalLinks";

export default function TermsPage() {
  return (
    <div className="page narrow-page legal-page">
      <section className="simple-hero">
        <p className="eyebrow">Legal</p>
        <h1>Terms &amp; Conditions</h1>
        <p>Last updated: 2026 · SeenTasks by Arigato Labs</p>
      </section>

      <section className="legal-prose">
        <h2>Agreement</h2>
        <p>By using SeenTasks you agree to these terms. If you do not agree, do not use the app.</p>

        <h2>The service</h2>
        <p>
          SeenTasks is a personal planning product from Arigato Labs: Quick tasks, AI-assisted Today planning,
          calendar views, persona settings, assistant chat, and optional collaboration features.
        </p>

        <h2>Accounts</h2>
        <p>
          You sign in with Google. You are responsible for activity under your account and for the content you add.
          Keep your Google account secure.
        </p>

        <h2>Acceptable use</h2>
        <p>
          Do not abuse the service, attempt to break security, harass others through collaboration features,
          or use SeenTasks for illegal activity.
        </p>

        <h2>Intellectual property</h2>
        <p>
          The Arigato Labs name, logos, and brand assets belong to Arigato Labs.
          They may not be reused outside Arigato Labs products without permission.
          See the company license in the project’s <code>brand-right</code> folder.
        </p>

        <h2>AI features</h2>
        <p>
          When you use AI prioritization or the assistant, outputs can be wrong or incomplete.
          You remain responsible for decisions about your day and work. Verify anything important yourself.
        </p>

        <h2>Availability</h2>
        <p>
          We may change, pause, or discontinue features. We do not guarantee uninterrupted uptime or that every device will sync instantly.
        </p>

        <h2>Termination</h2>
        <p>
          You may stop using SeenTasks anytime. We may suspend access for abuse or risk to the service.
          Settings → Reset your app can clear product data on your account (One Password required).
        </p>

        <h2>Governing note</h2>
        <p>These terms are interpreted under applicable law in India unless Arigato Labs later specifies otherwise.</p>

        <h2>Contact</h2>
        <p>
          <a href="mailto:kumardevanshu3001@gmail.com">kumardevanshu3001@gmail.com</a>
          {" · "}
          <a href="/contact">Contact form</a>
        </p>

        <LegalLinks className="legal-links-inline" muted />
        <p className="legal-copy-note">Copyright © 2026 Arigato Labs. All Rights Reserved.</p>
      </section>
    </div>
  );
}
