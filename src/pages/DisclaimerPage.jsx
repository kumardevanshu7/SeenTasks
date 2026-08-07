import LegalLinks from "../components/LegalLinks";

export default function DisclaimerPage() {
  return (
    <div className="page narrow-page legal-page">
      <section className="simple-hero">
        <p className="eyebrow">Legal</p>
        <h1>Disclaimer</h1>
        <p>SeenTasks · Arigato Labs</p>
      </section>

      <section className="legal-prose">
        <p>
          SeenTasks and all Arigato Labs materials are provided <strong>“as is”</strong> without warranties of any kind,
          express or implied.
        </p>
        <p>
          To the maximum extent allowed by law, Arigato Labs and Kumar Devanshu are not liable for loss of data,
          profits, productivity, or any damages arising from use of — or inability to use — SeenTasks.
        </p>
        <p>
          Planning tools, reminders, and AI suggestions are helpers only. They are not professional legal,
          medical, financial, or mental-health advice.
        </p>
        <p>
          Third-party services (Google, Firebase, hosting providers, AI model providers) have their own terms and policies.
        </p>
        <p className="legal-copy-note">Copyright © 2026 Arigato Labs. All Rights Reserved.</p>
        <LegalLinks className="legal-links-inline" muted />
      </section>
    </div>
  );
}
