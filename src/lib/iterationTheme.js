// Delay-based styling. A task that gets recalled from a past day into today
// carries how many days it has slipped. The card tints from light red at
// 1 day to a strong dark red by 10+ days, with a "Delayed by N day(s)" label.

export function getIterationStyle(delayDays = 0) {
  if (delayDays < 1) {
    return { overlay: 0, glow: "none", label: null };
  }
  const capped = Math.min(delayDays, 10);
  // Map 1..10 -> intensity 0.12..1
  const intensity = 0.12 + ((capped - 1) / 9) * 0.88;

  return {
    overlay: intensity,
    glow: `0 0 ${6 + intensity * 22}px rgba(198, 69, 69, ${0.2 + intensity * 0.45})`,
    label: `Delayed by ${delayDays} day${delayDays === 1 ? "" : "s"}`,
    borderColor: `rgba(198, 69, 69, ${0.28 + intensity * 0.6})`,
    bg: `rgba(198, 69, 69, ${0.05 + intensity * 0.2})`,
  };
}
