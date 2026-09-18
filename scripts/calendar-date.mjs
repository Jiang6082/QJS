export const QJS_TIME_ZONE = process.env.QJS_TIME_ZONE || "America/New_York";

export function calendarDate(value = new Date(), timeZone = QJS_TIME_ZONE) {
  if (value === null || value === "") return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const dateOnly = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(dateOnly.getTime()) && dateOnly.toISOString().slice(0, 10) === value ? value : null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function shiftCalendarDate(value, days) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match || !calendarDate(value) || !Number.isInteger(days)) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
