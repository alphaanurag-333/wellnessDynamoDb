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

function istParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type) => parts.find((row) => row.type === type)?.value || "";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(hour),
    minute: Number(get("minute")),
    hm: `${hour}:${get("minute")}`,
  };
}

function periodFromIstHour(hour) {
  const h = Number(hour);
  if (h >= 8 && h < 12) return "morning";
  if (h >= 12 && h < 16) return "afternoon";
  if (h >= 16 && h < 18) return "early_evening";
  if (h >= 18 && h < 20) return "evening";
  if (h < 8) return "morning";
  if (h < 16) return "afternoon";
  if (h < 18) return "early_evening";
  return "evening";
}

function enrichOffer(offer) {
  if (String(offer?.kind || "").toLowerCase() === "slot" && offer?.startAt && offer?.endAt) {
    const start = new Date(offer.startAt);
    const end = new Date(offer.endAt);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const startParts = istParts(start);
      const endParts = istParts(end);
      const period = normalizePeriodKey(offer.period) || periodFromIstHour(startParts.hour);
      const meta = periodMeta(period);
      return {
        id: String(offer?.id || ""),
        date: offer.date || startParts.date,
        period,
        kind: "slot",
        label: offer.label || `${startParts.hm}–${endParts.hm}`,
        startLocal: offer.startLocal || startParts.hm,
        endLocal: offer.endLocal || endParts.hm,
        timezone: TIMEZONE,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        periodLabel: meta?.label || period,
      };
    }
  }

  const date = offer?.date;
  const period = offer?.period;
  const window = periodWindow(date, period);
  const meta = periodMeta(period);
  return {
    id: String(offer?.id || ""),
    date,
    period,
    kind: offer?.kind ? String(offer.kind) : "period",
    label: meta?.label || period,
    startLocal: meta ? formatHm(meta.startHour, meta.startMinute) : null,
    endLocal: meta ? formatHm(meta.endHour, meta.endMinute) : null,
    timezone: TIMEZONE,
    startAt: window?.startAt?.toISOString() || null,
    endAt: window?.endAt?.toISOString() || null,
  };
}

function normalizeSlotOffers(rawSlots) {
  if (!Array.isArray(rawSlots) || !rawSlots.length) {
    const err = new Error("At least one slot is required");
    err.name = "ValidationError";
    throw err;
  }

  const seen = new Set();
  return rawSlots.map((raw, index) => {
    const start = new Date(raw?.startAt || raw?.start_at || "");
    const end = new Date(raw?.endAt || raw?.end_at || "");
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      const err = new Error(`slots[${index}] requires valid startAt and endAt`);
      err.name = "ValidationError";
      throw err;
    }
    if (end.getTime() <= start.getTime()) {
      const err = new Error(`slots[${index}] endAt must be after startAt`);
      err.name = "ValidationError";
      throw err;
    }
    if (start.getTime() <= Date.now()) {
      const err = new Error(`slots[${index}].startAt must be in the future`);
      err.name = "ValidationError";
      throw err;
    }

    const startParts = istParts(start);
    const endParts = istParts(end);
    const key = `${start.toISOString()}#${end.toISOString()}`;
    if (seen.has(key)) {
      const err = new Error(`Duplicate slot at index ${index}`);
      err.name = "ValidationError";
      throw err;
    }
    seen.add(key);

    return enrichOffer({
      id: String(raw?.id || uuidv4()),
      kind: "slot",
      date: startParts.date,
      period: periodFromIstHour(startParts.hour),
      label: `${startParts.hm}–${endParts.hm}`,
      startLocal: startParts.hm,
      endLocal: endParts.hm,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
    });
  });
}

function todayYmdIst() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date());
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
    const today = todayYmdIst();
    if (date < today) {
      const err = new Error(`offers[${index}].date cannot be in the past`);
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

function isScheduledAtInWindow(scheduledAt, dateYmd, period, durationMinutes = DEFAULT_DURATION_MINUTES, offer = null) {
  const start = new Date(scheduledAt);
  if (Number.isNaN(start.getTime())) return false;
  const durationMs = Math.max(15, Number(durationMinutes) || DEFAULT_DURATION_MINUTES) * 60 * 1000;
  const end = new Date(start.getTime() + durationMs);

  if (offer && String(offer.kind || "").toLowerCase() === "slot" && offer.startAt && offer.endAt) {
    const windowStart = new Date(offer.startAt).getTime();
    const windowEnd = new Date(offer.endAt).getTime();
    if (!Number.isFinite(windowStart) || !Number.isFinite(windowEnd)) return false;
    return start.getTime() >= windowStart && end.getTime() <= windowEnd;
  }

  const window = periodWindow(dateYmd, period);
  if (!window) return false;
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
  normalizeSlotOffers,
  enrichOffer,
  isScheduledAtInWindow,
};
