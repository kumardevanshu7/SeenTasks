import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

// Smooth scroll only on marketing pages — /app stays native & snappy.
// Lenis is loaded on demand so it stays out of the /app critical path.
export function useLenis() {
  const { pathname } = useLocation();
  const enabled = !pathname.startsWith("/app");
  const lenisRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    let cancelled = false;
    import("lenis")
      .then(({ default: Lenis }) => {
        if (cancelled) return;
        lenisRef.current = new Lenis({
          duration: 1.1,
          smoothWheel: true,
          anchors: true,
          autoRaf: true,
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      lenisRef.current?.destroy();
      lenisRef.current = null;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    lenisRef.current?.scrollTo(0, { immediate: true });
  }, [pathname, enabled]);
}
