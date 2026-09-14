import { calendarDate, shiftCalendarDate } from "../scripts/calendar-date.mjs";

export function employerDate(value) {
  if (typeof value !== "string") return null;
  const day = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? calendarDate(day) : null;
}
export function sourceDateFromNotes(notes = "", scanAt) {
  const exact = [...String(notes).matchAll(/(?:^|[|;]\s*)(?:posted|datePosted|lastPostedDate|released)=([^|;\s]+)/gi)]
    .map((match) => employerDate(match[1])).filter(Boolean);
  if (exact.length) return { date: exact.sort()[0], evidence: "employer_field" };
  const relative = String(notes).match(/Posted\s+(Today|Yesterday|(\d+)(\+)?\s+Days?\s+Ago)/i);
  if (!relative || relative[3]) return null; // A bound such as 30+ is not a date.
  const base = calendarDate(scanAt);
  if (!base) return null;
  const offset = /Today/i.test(relative[1]) ? 0 : /Yesterday/i.test(relative[1]) ? 1 : Number(relative[2]);
  return { date: shiftCalendarDate(base, -offset), evidence: "employer_relative_label" };
}
export function inDateWindow(date, since, until) {
  return Boolean(employerDate(date) && date >= since && date <= until);
}
