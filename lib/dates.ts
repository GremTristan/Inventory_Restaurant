// All "business day" computations use the restaurants' local time zone,
// not UTC: a ticket paid at 23:30 in Geneva belongs to that evening's
// service, not to tomorrow. Swiss and French customers share this zone.
export const APP_TIME_ZONE = process.env.APP_TIMEZONE || "Europe/Zurich";

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// "YYYY-MM-DD" in local time.
export function localDay(date: Date = new Date()): string {
  return dayFormatter.format(date);
}

// "YYYY-MM" in local time.
export function localMonth(date: Date = new Date()): string {
  return localDay(date).slice(0, 7);
}

export function todayPeriod(): string {
  return localDay();
}

export function monthPeriod(): string {
  return localMonth();
}

export function addDays(day: string, delta: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + delta));
  return date.toISOString().slice(0, 10);
}

// Monday-based week start for a "YYYY-MM-DD" day.
export function startOfWeek(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = (date.getUTCDay() + 6) % 7; // 0 = Monday
  return addDays(day, -weekday);
}

export function startOfMonth(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

export function formatDayLabel(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-CH", { weekday: "short", day: "numeric", month: "short" }).format(
    new Date(Date.UTC(y, m - 1, d, 12))
  );
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("fr-CH", { hour: "2-digit", minute: "2-digit", timeZone: APP_TIME_ZONE }).format(
    new Date(iso)
  );
}
