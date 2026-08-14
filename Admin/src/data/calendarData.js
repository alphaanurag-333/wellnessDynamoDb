export const CAL_LEGEND = [
  { label: "Confirmed", color: "#2b8f5b" },
  { label: "Held", color: "#e0b23a" },
  { label: "Blocked", color: "#5e6ad2" },
  { label: "Free", color: "#dde3ec" },
];

export const CAL_DEMO_TODAY = new Date(2026, 7, 14);
export const CAL_DEFAULT_DATE = new Date(2026, 7, 4);

export const CAL_HOUR_START = 8;
export const CAL_HOUR_END = 22;
export const CAL_HOUR_PX = 52;

export const CAL_EVENTS = [
  { id: "ev-huddle", date: "2026-08-04", start: "09:30", end: "10:00", label: "Team huddle", type: "blocked", canDelete: true },
  { id: "ev-dipti", date: "2026-08-04", start: "11:00", end: "11:45", label: "Dipti Patil", type: "confirmed" },
  { id: "ev-neha", date: "2026-08-05", start: "10:00", end: "10:45", label: "Neha Iyer", type: "confirmed" },
  { id: "ev-arjun", date: "2026-08-06", start: "10:00", end: "10:45", label: "Arjun Kapoor", type: "confirmed" },
  { id: "ev-ritu", date: "2026-08-06", start: "15:00", end: "15:45", label: "Ritu Sharma", type: "confirmed" },
];

export const CAL_CONFIRMED = [
  { id: "cf-dipti", name: "Dipti Patil", initial: "DP", date: "04 Aug 2026", time: "11:00", kind: "LAUNCH review", mode: "Video call" },
  { id: "cf-ritu", name: "Ritu Sharma", initial: "RS", date: "06 Aug 2026", time: "15:00", kind: "PWC consult", mode: "Video call" },
];

export const CAL_OFFERS = [
  {
    id: "of-banita",
    name: "Banita Acharya",
    initial: "BA",
    kind: "LAUNCH meeting",
    duration: "30 min",
    mode: "Phone call",
    release: "28 h 0 min",
    slots: ["05 Aug · 09:00-09:30", "05 Aug · 16:00-16:30", "06 Aug · 18:00-18:30"],
  },
];

export const CAL_AWAITING = [
  { id: "aw-1", name: "Kabir Shah", initial: "KS", meta: "Fat Loss consult · waiting on client pick" },
];

export const CAL_CHANGES = [
  {
    id: "ch-ritu",
    name: "Ritu Sharma",
    initial: "RS",
    meta: "Asked to move 06 Aug at 15:00 · today, 09:20 IST",
    reason: "Work meeting clash — can we move it later in the week?",
    wants: ["07 Aug · 16:00-16:45", "08 Aug · 11:00-11:45"],
  },
];

export function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDdMmYyyy(date) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}-${m}-${date.getFullYear()}`;
}

export function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function formatWeekLabel(start) {
  const end = addDays(start, 6);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const sameMonth = start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${String(start.getDate()).padStart(2, "0")} ${months[start.getMonth()]} – ${String(end.getDate()).padStart(2, "0")} ${months[end.getMonth()]} ${end.getFullYear()}`;
  }
  return `${String(start.getDate()).padStart(2, "0")} ${months[start.getMonth()]} – ${String(end.getDate()).padStart(2, "0")} ${months[end.getMonth()]} ${end.getFullYear()}`;
}

export function dayTag(events) {
  const sessions = events.filter((entry) => entry.type === "confirmed").length;
  const blocks = events.filter((entry) => entry.type === "blocked").length;
  const held = events.filter((entry) => entry.type === "held").length;
  const parts = [];
  if (sessions) parts.push(`${sessions} session${sessions === 1 ? "" : "s"}`);
  if (blocks) parts.push(`${blocks} block${blocks === 1 ? "" : "s"}`);
  if (held) parts.push(`${held} held`);
  return parts.join(" · ") || "free";
}

export const BLOCK_CALENDARS = ["Mine (Admin desk)"];

export const BLOCK_LENGTHS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1 h 30 min" },
  { value: 120, label: "2 hours" },
];

export function minutesFromMidnight(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function addMinutesToTime(hhmm, minutes) {
  const total = minutesFromMidnight(hhmm) + minutes;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function eventDurationMin(start, end) {
  return minutesFromMidnight(end) - minutesFromMidnight(start);
}

export function eventStyle(start, end, hourStart, hourPx) {
  const topMin = minutesFromMidnight(start) - hourStart * 60;
  const heightMin = minutesFromMidnight(end) - minutesFromMidnight(start);
  return {
    top: `${(topMin / 60) * hourPx}px`,
    height: `${(heightMin / 60) * hourPx}px`,
  };
}
