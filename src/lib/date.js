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
  const a = new Date(`${fromKey}T12:00:00`);
  const b = new Date(`${toKeyValue}T12:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((b - a) / 86400000));
}

export function addDaysToKey(dateKey, days) {
  const d = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateKey;
  d.setDate(d.getDate() + (Number(days) || 0));
  return toKey(d);
}

/** Deadline day for delay: dueDate if set, else the task’s dateKey (midnight cutoff). */
export function taskDeadlineKey(task) {
  if (task?.dueDate) return task.dueDate;
  return task?.dateKey || null;
}

/**
 * How many calendar days past the deadline (0 if still on time).
 * No due date → late starting the day after dateKey (12:00 AM).
 * With due date → late only after the due day ends.
 */
export function taskDelayDays(task, asOf = null) {
  const deadline = taskDeadlineKey(task);
  if (!deadline) return 0;
  const end =
    asOf ||
    (task?.done && task.completedAt ? toKey(task.completedAt) : todayKey());
  if (end <= deadline) return 0;
  return daysBetween(deadline, end);
}

export function formatDelayDays(days) {
  const n = Math.max(0, Number(days) || 0);
  if (n <= 0) return "";
  return n === 1 ? "1 day" : `${n} days`;
}

/** Copy when a task is finished after its midnight / due deadline. */
export function delayedCompletionMessage(days) {
  const label = formatDelayDays(days);
  if (!label) return "";
  return `You completed this task very delayed — around ${label} late.`;
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

/** e.g. "Aug 2, 1:04 AM" — for tasks that span days */
export function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Human duration between two ISO timestamps, e.g. "2d 4h" or "3h 12m". */
export function formatDuration(startIso, endIso) {
  if (!startIso || !endIso) return "";
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return "";
  const totalMins = Math.round((end - start) / 60000);
  const days = Math.floor(totalMins / 1440);
  const hours = Math.floor((totalMins % 1440) / 60);
  const mins = totalMins % 60;
  if (days > 0) {
    return mins > 0 ? `${days}d ${hours}h ${mins}m` : hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  return `${Math.max(1, mins)}m`;
}

export function formatMonthDay(dateKey) {
  const d = new Date(`${dateKey}T12:00:00`);
  return {
    month: d.toLocaleDateString(undefined, { month: "short" }),
    day: String(d.getDate()),
  };
}
