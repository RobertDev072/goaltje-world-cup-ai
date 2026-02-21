/**
 * Format a UTC date to Dutch (NL) timezone display
 */
export function formatNLDate(utcDate: string | Date): string {
  const date = typeof utcDate === "string" ? new Date(utcDate) : utcDate;
  return date.toLocaleDateString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatNLTime(utcDate: string | Date): string {
  const date = typeof utcDate === "string" ? new Date(utcDate) : utcDate;
  return date.toLocaleTimeString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatNLDateTime(utcDate: string | Date): string {
  return `${formatNLDate(utcDate)} ${formatNLTime(utcDate)}`;
}

export function isToday(utcDate: string | Date): boolean {
  const date = typeof utcDate === "string" ? new Date(utcDate) : utcDate;
  const now = new Date();
  const nlDate = date.toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam" });
  const nlNow = now.toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam" });
  return nlDate === nlNow;
}
