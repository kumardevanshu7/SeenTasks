import { Link } from "react-router-dom";
import LegalLinks from "../components/LegalLinks";

export default function AboutPage() {
  return (
    <div className="page narrow-page legal-page">
      <section className="simple-hero">
        <p className="eyebrow">Arigato Labs</p>
        <h1>About Arigato Labs</h1>
        <p>
          SeenTasks is a product of <strong>Arigato Labs</strong>, invented and led by{" "}
          <strong>Kumar Devanshu</strong> (2026).
        </p>
      </section>

      <section className="legal-prose">
        <p>
          We build sleek, modern, high-performance tools that help people get things done with
          clarity and calm. SeenTasks focuses on Quick tasks, Follow Flow, Everyday repeats, and
          report cards — no AI required.
        </p>
        <p>
          <strong>CodebyTushu</strong> (Tushinder Kumar) is a related coding-education brand —
          LeetCode-style questions and a YouTube channel for interview prep. It is separate from
          SeenTasks but part of the same builder ecosystem.
        </p>
        <p>
          <Link className="text-link" to="/contact">
            Contact us
          </Link>
          {" · "}
          <Link className="text-link" to="/app/explore">
            Explore Arigato Labs
          </Link>
        </p>
        <LegalLinks className="legal-links-inline" muted />
        <p className="legal-copy-note">Copyright © 2026 Arigato Labs. All Rights Reserved.</p>
      </section>
    </div>
  );
}
