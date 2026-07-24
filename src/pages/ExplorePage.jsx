import { motion } from "framer-motion";
import { BadgeCheck } from "lucide-react";

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
        <h4>Legal disclaimer &amp; license</h4>
        <p>Copyright © 2026 Arigato Labs. All Rights Reserved.</p>
        <p>Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:</p>
        <p>The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.</p>
        <p className="disclaimer-fine">THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY.</p>
      </footer>
    </div>
  );
}
