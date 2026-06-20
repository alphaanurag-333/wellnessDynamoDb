const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toDateOnlyString(date) {
  const y = date.getUTCFullYear();
  const m = pad2(date.getUTCMonth() + 1);
  const d = pad2(date.getUTCDate());
  return `${y}-${m}-${d}`;
}

function parseDateOnly(value) {
  const raw = String(value ?? "").trim();
  if (!DATE_ONLY_REGEX.test(raw)) return null;
  const [y, m, d] = raw.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return null;
  }
  return dt;
}

function todayDateOnly() {
  return toDateOnlyString(new Date());
}

function addDaysDateOnly(dateOnly, deltaDays) {
  const dt = parseDateOnly(dateOnly);
  if (!dt) return null;
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return toDateOnlyString(dt);
}

function listDateRange(endDateOnly, days) {
  const count = Math.max(1, Math.min(Number(days) || 7, 366));
  const end = parseDateOnly(endDateOnly) ? endDateOnly : todayDateOnly();
  const dates = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = addDaysDateOnly(end, -i);
    if (d) dates.push(d);
  }
  return dates;
}

function dayLabel(dateOnly) {
  const dt = parseDateOnly(dateOnly);
  if (!dt) return "";
  return dt.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

function isValidDateOnly(value) {
  return parseDateOnly(value) != null;
}

module.exports = {
  DATE_ONLY_REGEX,
  toDateOnlyString,
  parseDateOnly,
  todayDateOnly,
  addDaysDateOnly,
  listDateRange,
  dayLabel,
  isValidDateOnly,
};
