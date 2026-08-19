/** Prefetch lazy route chunks so nav feels instant on phone. */
const loaders = {
  "/app/today": () => import("../pages/TodayPage"),
  "/app/calendar": () => import("../pages/CalendarPage"),
  "/app/persona": () => import("../pages/PersonaPage"),
  "/app/assistant": () => import("../pages/AssistantPage"),
  "/app/bin": () => import("../pages/BinPage"),
  "/app/team": () => import("../pages/TeamPage"),
  "/app/settings": () => import("../pages/SettingsPage"),
  "/app/explore": () => import("../pages/ExplorePage"),
};

const warmed = new Set();

export function prefetchRoute(path) {
  const key = path?.split("?")[0] || "";
  // Core routes (Quick tasks / workspace / flows) are already in the main bundle.
  if (
    key === "/app" ||
    key.startsWith("/app/workspace/") ||
    key === "/app/flows" ||
    key.startsWith("/app/flows/") ||
    key.startsWith("/app/reports") ||
    key === "/app/achievements"
  ) {
    return;
  }
  const loader = loaders[key];
  if (!loader || warmed.has(key)) return;
  warmed.add(key);
  loader().catch(() => {
    warmed.delete(key);
  });
}

/** Warm secondary app screens after first paint. */
export function prefetchCoreApp() {
  const run = () => {
    ["/app/today", "/app/settings", "/app/calendar"].forEach(prefetchRoute);
  };
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: 1800 });
  } else {
    window.setTimeout(run, 400);
  }
}
