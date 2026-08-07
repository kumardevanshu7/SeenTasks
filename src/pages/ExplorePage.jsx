import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BadgeCheck } from "lucide-react";
import LegalLinks from "../components/LegalLinks";

export default function ExplorePage() {
  return (
    <div className="page narrow-page explore-page">
      <motion.header className="explore-header" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <p className="eyebrow">The studio behind SeenTasks</p>
        <h1>Our company</h1>
        <p>Redefining productivity and everyday focus for the modern era.</p>
      </motion.header>

      <motion.div className="explore-logo" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
        <img src="/arigato-labs-logo.png" alt="Arigato Labs" />
      </motion.div>

      <motion.div className="explore-copy" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
        <span className="founder-badge"><BadgeCheck size={15} /> Verified Founder</span>
        <p className="founder-text"><strong>SeenTasks</strong> is proudly developed by <strong>Kumar Devanshu</strong>, the founder of <strong>Arigato Labs</strong>, in 2026.</p>
        <p className="mission-text">Our mission is to build sleek, modern, high-performance tools that empower individuals and teams to achieve their goals with elegance and ease. We believe software should feel natural, fast, and distinctly beautiful.</p>
      </motion.div>

      <footer className="explore-footer">
        <h4>Arigato Labs</h4>
        <p>Copyright © 2026 Arigato Labs. All Rights Reserved.</p>
        <p>
          <strong>SeenTasks</strong> is a product of Arigato Labs, founded by Kumar Devanshu.
          Brand name and logos may not be reused outside Arigato Labs apps without permission.
        </p>
        <p className="disclaimer-fine">
          See{" "}
          <Link to="/privacy">Privacy</Link>,{" "}
          <Link to="/terms">Terms</Link>, and{" "}
          <Link to="/disclaimer">Disclaimer</Link>.
          {" "}Contact:{" "}
          <a href="mailto:kumardevanshu3001@gmail.com">kumardevanshu3001@gmail.com</a>
        </p>
        <LegalLinks className="legal-links-explore" muted />
      </footer>
    </div>
  );
}
