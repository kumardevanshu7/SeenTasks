export function todayKey() {
  const d = new Date();
  return toKey(d);
}

export function toKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isBeforeToday(dateKey) {
  return dateKey < todayKey();
}

export function daysBetween(fromKey, toKeyValue) {
  const a = new Date(fromKey);
  const b = new Date(toKeyValue);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((b - a) / 86400000));
}

export function formatFriendly(dateKey) {
  const d = new Date(dateKey);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatClock(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatMonthDay(dateKey) {
  const d = new Date(`${dateKey}T12:00:00`);
  return {
    month: d.toLocaleDateString(undefined, { month: "short" }),
    day: String(d.getDate()),
  };
}
