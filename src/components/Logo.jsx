// Reusable SeenTasks brand mark. `animated` uses CSS breath — no motion lib.
export default function Logo({ size = 28, withWordmark = false, animated = false, className = "" }) {
  const image = (
    <img
      src="/seentasks-logo.png"
      alt="SeenTasks"
      width={size}
      height={size}
      className="logo-mark"
      decoding="async"
      fetchPriority={animated ? "high" : "low"}
      style={{ width: size, height: size }}
    />
  );

  const mark = animated ? <span className="logo-animated">{image}</span> : image;

  if (!withWordmark) return <span className={`logo ${className}`.trim()}>{mark}</span>;
  return (
    <span className={`logo logo-wordmark ${className}`.trim()}>
      {mark}
      <span className="logo-word">SeenTasks</span>
    </span>
  );
}
