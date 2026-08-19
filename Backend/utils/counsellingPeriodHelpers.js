const { v4: uuidv4 } = require("uuid");

const TIMEZONE = "Asia/Kolkata";
const IST_OFFSET = "+05:30";
const DEFAULT_DURATION_MINUTES = 45;
const DEFAULT_CONCERN = "Counselling session";

const PERIOD_CATALOG = {
  morning: {
    key: "morning",
    label: "Morning",
    startHour: 8,
    startMinute: 0,
    endHour: 12,
    endMinute: 0,
  },
  afternoon: {
    key: "afternoon",
    label: "Afternoon",
    startHour: 12,
    startMinute: 0,
    endHour: 16,
    endMinute: 0,
  },
  early_evening: {
    key: "early_evening",
    label: "Early evening",
    startHour: 16,
    startMinute: 0,
    endHour: 18,
    endMinute: 0,
  },
  evening: {
    key: "evening",
    label: "Evening",
    startHour: 18,
    startMinute: 0,
    endHour: 20,
    endMinute: 0,
  },
};

const PERIOD_KEYS = new Set(Object.keys(PERIOD_CATALOG));

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatHm(hour, minute) {
  return `${pad(hour)}:${pad(minute)}`;
}

function periodMeta(period) {
  return PERIOD_CATALOG[String(period || "").trim()] || null;
}

function listPeriodCatalog() {
  return Object.values(PERIOD_CATALOG).map((row) => ({
    key: row.key,
    label: row.label,
    startLocal: formatHm(row.startHour, row.startMinute),
    endLocal: formatHm(row.endHour, row.endMinute),
    timezone: TIMEZONE,
  }));
}

function wallTimeToDate(dateYmd, hour, minute) {
  return new Date(`${dateYmd}T${formatHm(hour, minute)}:00${IST_OFFSET}`);
}

function periodWindow(dateYmd, period) {
  const meta = periodMeta(period);
  if (!meta) return null;
  const startAt = wallTimeToDate(dateYmd, meta.startHour, meta.startMinute);
  const endAt = wallTimeToDate(dateYmd, meta.endHour, meta.endMinute);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) return null;
  return { startAt, endAt, meta };
}

function normalizeDateYmd(value) {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const probe = new Date(`${raw}T12:00:00${IST_OFFSET}`);
  if (Number.isNaN(probe.getTime())) return null;
  return raw;
}

function normalizePeriodKey(value) {
  const key = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return PERIOD_KEYS.has(key) ? key : null;
}

function enrichOffer(offer) {
  const date = offer?.date;
  const period = offer?.period;
  const window = periodWindow(date, period);
  const meta = periodMeta(period);
  return {
    id: String(offer?.id || ""),
    date,
    period,
    label: meta?.label || period,
    startLocal: meta ? formatHm(meta.startHour, meta.startMinute) : null,
    endLocal: meta ? formatHm(meta.endHour, meta.endMinute) : null,
    timezone: TIMEZONE,
    startAt: window?.startAt?.toISOString() || null,
    endAt: window?.endAt?.toISOString() || null,
  };
}

function normalizePeriodOffers(rawOffers) {
  if (!Array.isArray(rawOffers) || !rawOffers.length) {
    const err = new Error("At least one availability offer is required");
    err.name = "ValidationError";
    throw err;
  }

  const seen = new Set();
  const offers = rawOffers.map((raw, index) => {
    const date = normalizeDateYmd(raw?.date || raw?.offerDate);
    const period = normalizePeriodKey(raw?.period || raw?.timePeriod);
    if (!date) {
      const err = new Error(`offers[${index}].date must be YYYY-MM-DD`);
      err.name = "ValidationError";
      throw err;
    }
    if (!period) {
      const err = new Error(`offers[${index}].period is invalid`);
      err.name = "ValidationError";
      throw err;
    }
    const key = `${date}#${period}`;
    if (seen.has(key)) {
      const err = new Error(`Duplicate offer for ${date} ${period}`);
      err.name = "ValidationError";
      throw err;
    }
    seen.add(key);
    return enrichOffer({
      id: String(raw?.id || uuidv4()),
      date,
      period,
    });
  });

  return offers;
}

function isScheduledAtInWindow(scheduledAt, dateYmd, period, durationMinutes = DEFAULT_DURATION_MINUTES) {
  const window = periodWindow(dateYmd, period);
  if (!window) return false;
  const start = new Date(scheduledAt);
  if (Number.isNaN(start.getTime())) return false;
  const durationMs = Math.max(15, Number(durationMinutes) || DEFAULT_DURATION_MINUTES) * 60 * 1000;
  const end = new Date(start.getTime() + durationMs);
  return start.getTime() >= window.startAt.getTime() && end.getTime() <= window.endAt.getTime();
}

module.exports = {
  TIMEZONE,
  DEFAULT_DURATION_MINUTES,
  DEFAULT_CONCERN,
  PERIOD_CATALOG,
  PERIOD_KEYS,
  periodMeta,
  listPeriodCatalog,
  periodWindow,
  normalizeDateYmd,
  normalizePeriodKey,
  normalizePeriodOffers,
  enrichOffer,
  isScheduledAtInWindow,
};
