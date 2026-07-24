import { motion } from "framer-motion";

// Reusable SeenTasks brand mark. `animated` adds a gentle breathing motion,
// used on loading and hero moments.
export default function Logo({ size = 28, withWordmark = false, animated = false, className = "" }) {
  const image = (
    <img
      src="/seentasks-logo.png"
      alt="SeenTasks"
      width={size}
      height={size}
      className="logo-mark"
      style={{ width: size, height: size }}
    />
  );

  const mark = animated ? (
    <motion.span
      className="logo-animated"
      initial={{ scale: 0.9, opacity: 0.7 }}
      animate={{ scale: [0.94, 1, 0.94], opacity: [0.75, 1, 0.75] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
    >
      {image}
    </motion.span>
  ) : (
    image
  );

  if (!withWordmark) return <span className={`logo ${className}`.trim()}>{mark}</span>;
  return (
    <span className={`logo logo-wordmark ${className}`.trim()}>
      {mark}
      <span className="logo-word">SeenTasks</span>
    </span>
  );
}
