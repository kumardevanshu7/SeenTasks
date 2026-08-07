import { Link } from "react-router-dom";

const LINKS = [
  { to: "/about", label: "About" },
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
  { to: "/disclaimer", label: "Disclaimer" },
  { to: "/contact", label: "Contact" },
];

export default function LegalLinks({ className = "", muted = false }) {
  return (
    <nav className={`legal-links${muted ? " legal-links-muted" : ""}${className ? ` ${className}` : ""}`} aria-label="Legal">
      {LINKS.map((item) => (
        <Link key={item.to} to={item.to}>{item.label}</Link>
      ))}
    </nav>
  );
}

export { LINKS as LEGAL_NAV_LINKS };
