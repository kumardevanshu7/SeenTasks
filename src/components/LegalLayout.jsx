import { Link, Outlet } from "react-router-dom";
import Logo from "./Logo";
import LegalLinks from "./LegalLinks";

/** Minimal shell for public legal pages (no app sidebar). */
export default function LegalLayout() {
  return (
    <div className="legal-shell">
      <header className="legal-shell-head">
        <Link className="legal-shell-brand" to="/">
          <Logo size={22} />
          SeenTasks
        </Link>
        <Link className="legal-shell-app" to="/app">Open app</Link>
      </header>
      <main className="legal-shell-main">
        <Outlet />
      </main>
      <footer className="legal-shell-foot">
        <LegalLinks muted />
        <p>Copyright © 2026 Arigato Labs. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
