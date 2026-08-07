import { Link } from "react-router-dom";
import LegalLinks from "../components/LegalLinks";

export default function AboutPage() {
  return (
    <div className="page narrow-page legal-page">
      <section className="simple-hero">
        <p className="eyebrow">Arigato Labs</p>
        <h1>About Arigato Labs</h1>
        <p>SeenTasks is a product of Arigato Labs.</p>
      </section>

      <section className="legal-prose">
        <p>
          Built by <strong>Kumar Devanshu</strong>, founder of <strong>Arigato Labs</strong> (2026).
        </p>
        <p>
          We build sleek, modern, high-performance tools that help people get things done with clarity and calm.
          Software should feel fast, natural, and carefully designed.
        </p>
        <p>
          <Link className="text-link" to="/contact">Contact us</Link>
          {" · "}
          <Link className="text-link" to="/app/explore">Explore Arigato Labs</Link>
        </p>
        <LegalLinks className="legal-links-inline" muted />
        <p className="legal-copy-note">Copyright © 2026 Arigato Labs. All Rights Reserved.</p>
      </section>
    </div>
  );
}
