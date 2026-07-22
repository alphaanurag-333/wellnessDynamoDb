/**
 * Admin panel date display — consistent across all pages.
 * Date:      20 Jul 2026
 * DateTime:  20 Jul 2026, 3:45 pm
 */

const DATE_OPTS = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

const TIME_OPTS = {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
};

function parseDate(value) {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/** @returns {string} e.g. "20 Jul 2026" */
export function formatDate(value, { timeZone } = {}) {
  const d = parseDate(value);
  if (!d) return "—";
  const opts = timeZone ? { ...DATE_OPTS, timeZone } : DATE_OPTS;
  return d.toLocaleDateString("en-GB", opts);
}

/** @returns {string} e.g. "20 Jul 2026, 3:45 pm" */
export function formatDateTime(value, { timeZone } = {}) {
  const d = parseDate(value);
  if (!d) return "—";
  const opts = timeZone
    ? { ...DATE_OPTS, ...TIME_OPTS, timeZone }
    : { ...DATE_OPTS, ...TIME_OPTS };
  // en-GB yields "20 Jul 2026, 3:45 pm"
  return d.toLocaleString("en-GB", opts);
}
