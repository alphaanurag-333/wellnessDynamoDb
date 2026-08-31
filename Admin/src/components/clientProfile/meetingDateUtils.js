const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAY_FROM_SUN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isSameCalendarDay(a, b) {
  return a && b
    && a.getDate() === b.getDate()
    && a.getMonth() === b.getMonth()
    && a.getFullYear() === b.getFullYear();
}

export function isBeforeCalendarDay(date, minDate) {
  if (!date || !minDate) return false;
  return startOfDay(date).getTime() < startOfDay(minDate).getTime();
}

export function formatDdMmYyyy(date) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}-${m}-${date.getFullYear()}`;
}

export function formatDateLabel(date) {
  const day = WEEKDAY_FROM_SUN[date.getDay()];
  return `${day} · ${String(date.getDate()).padStart(2, "0")} ${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatShortDate(date) {
  return `${String(date.getDate()).padStart(2, "0")} ${MONTH_LABELS[date.getMonth()].toUpperCase()}`;
}

export function formatDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseDateKey(value) {
  if (!value) return null;
  const date = startOfDay(new Date(`${value}T12:00:00`));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getCalendarRoot() {
  return document.querySelector(".updated-admin") || document.body;
}

export function placeCalendarPopover(anchor) {
  const rect = anchor.getBoundingClientRect();
  const width = Math.min(280, Math.max(240, window.innerWidth - 16));
  const height = 328;
  let left = rect.right - width;
  if (left < 8) left = 8;
  if (left + width > window.innerWidth - 8) {
    left = Math.max(8, window.innerWidth - width - 8);
  }
  let top = rect.bottom + 8;
  if (top + height > window.innerHeight - 8) {
    const above = rect.top - height - 8;
    top = above >= 8 ? above : Math.max(8, window.innerHeight - height - 8);
  }
  return { top, left, width };
}

export function buildUpcomingDates(fromDate = new Date()) {
  const start = startOfDay(fromDate);
  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      id: `d${index}`,
      day: WEEKDAY_FROM_SUN[date.getDay()].toUpperCase(),
      date,
      dateLabel: String(date.getDate()).padStart(2, "0"),
    };
  });
}
