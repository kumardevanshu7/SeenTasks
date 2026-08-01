import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Smooth scroll only on marketing pages — /app stays native & snappy.
// Lenis is loaded on demand so it stays out of the /app critical path.
export function useLenis() {
  const { pathname } = useLocation();
  const enabled = !pathname.startsWith("/app");

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    let lenis = null;
    let frame = 0;

    import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      lenis = new Lenis({
        duration: 1.1,
        smoothWheel: true,
      });
      function raf(time) {
        lenis?.raf(time);
        frame = requestAnimationFrame(raf);
      }
      frame = requestAnimationFrame(raf);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      lenis?.destroy();
    };
  }, [enabled]);
}
