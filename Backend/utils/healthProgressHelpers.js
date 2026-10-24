const { isValidDateOnly } = require("./dateOnly");

const HEALTH_PROGRESS_FEATURE_KEYS = [
  "weightPic",
  "glucose",
  "bloodPressure",
  "menstrualCycle",
  "conditionComparison",
];

const HEALTH_PROGRESS_CLIENT_UPLOAD_KEYS = [
  "weightPic",
  "glucose",
  "bloodPressure",
  "conditionComparison",
];

const HEALTH_PROGRESS_TIME_ZONE = "Asia/Kolkata";

const HEALTH_PROGRESS_BODY_PARTS = [
  "face",
  "skin",
  "belly",
  "arms",
  "legs",
  "back",
  "full_body",
  "other",
];

const GLUCOSE_TYPES = new Set(["fbs", "ppbs"]);

function defaultHealthProgressFeatures() {
  return {
    weightPic: false,
    glucose: false,
    bloodPressure: false,
    menstrualCycle: false,
    conditionComparison: false,
  };
}

function normalizeHealthProgressFeatures(value, fallback) {
  const base = fallback || defaultHealthProgressFeatures();
  if (value == null) return { ...base };

  let raw = value;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return { ...base };
    }
  }

  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { ...base };
  }

  const out = { ...base };
  for (const key of HEALTH_PROGRESS_FEATURE_KEYS) {
    if (raw[key] !== undefined) {
      out[key] = Boolean(raw[key]);
    }
  }
  return out;
}

function isFemaleUser(user) {
  const gender = String(user?.gender || "").toLowerCase().trim();
  return gender === "female" || gender === "girl";
}

function resolveHealthProgressSettings(user) {
  const stored = normalizeHealthProgressFeatures(user?.healthProgressFeatures);
  const menstrualCycle =
    Boolean(stored.menstrualCycle) && isFemaleUser(user);

  return {
    weightPic: Boolean(stored.weightPic),
    glucose: Boolean(stored.glucose),
    bloodPressure: Boolean(stored.bloodPressure),
    menstrualCycle,
    conditionComparison: Boolean(stored.conditionComparison),
  };
}

function programLookupText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function trackerFeatureKeysForProgramLabel(label) {
  const text = programLookupText(label);
  if (!text) return [];

  const keys = [];
  if (/\b(fat loss|weight loss|fatloss)\b/.test(text)) keys.push("weightPic");
  if (/\bdiabetes\b/.test(text)) keys.push("glucose");
  if (/\b(pcod|pcos|pmos)\b/.test(text)) keys.push("menstrualCycle");
  if (/\b(hypertension|blood pressure|heart)\b/.test(text)) keys.push("bloodPressure");
  return keys;
}

function applyPurchasedProgramTrackers(settings, labels, user) {
  const next = normalizeHealthProgressFeatures(settings);
  const female = isFemaleUser(user);
  for (const label of labels || []) {
    for (const key of trackerFeatureKeysForProgramLabel(label)) {
      if (key === "menstrualCycle" && !female) continue;
      next[key] = true;
    }
  }
  if (!female) next.menstrualCycle = false;
  return next;
}

function emptyHealthProgressClientUpload() {
  return {
    weightPic: { open: false, closedAt: null, source: null },
    glucose: { open: false, closedAt: null, source: null },
    bloodPressure: { open: false, closedAt: null, source: null },
    conditionComparison: { open: false, closedAt: null, source: null },
  };
}

function normalizeHealthProgressClientUpload(value) {
  const base = emptyHealthProgressClientUpload();
  if (!value || typeof value !== "object" || Array.isArray(value)) return base;
  for (const key of HEALTH_PROGRESS_CLIENT_UPLOAD_KEYS) {
    const row = value[key];
    if (!row || typeof row !== "object") continue;
    const source = row.source === "saturday" || row.source === "coach" ? row.source : null;
    base[key] = {
      open: row.open === true,
      closedAt: row.closedAt ? String(row.closedAt) : null,
      source: row.open === true ? source : null,
    };
  }
  return base;
}

function isHealthProgressSaturday(now = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: HEALTH_PROGRESS_TIME_ZONE,
    weekday: "short",
  }).format(now) === "Sat";
}

function healthProgressSaturdayStartIso(now = new Date()) {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: HEALTH_PROGRESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return new Date(`${date}T00:00:00.000+05:30`).toISOString();
}

function resolveHealthProgressClientUpload(value, now = new Date()) {
  const stored = normalizeHealthProgressClientUpload(value);
  const saturday = isHealthProgressSaturday(now);
  const saturdayStart = saturday ? new Date(healthProgressSaturdayStartIso(now)).getTime() : 0;
  const next = emptyHealthProgressClientUpload();
  let changed = false;

  for (const key of HEALTH_PROGRESS_CLIENT_UPLOAD_KEYS) {
    const row = stored[key];
    let open = row.open === true;
    let source = open ? (row.source || "coach") : null;
    if (!open && saturday) {
      const closedAt = row.closedAt ? new Date(row.closedAt).getTime() : 0;
      if (!row.closedAt || !Number.isFinite(closedAt) || closedAt < saturdayStart) {
        open = true;
        source = "saturday";
      }
    }
    next[key] = {
      open,
      closedAt: row.closedAt,
      source,
    };
    if (open !== row.open || source !== row.source) changed = true;
  }

  return { windows: next, changed, stored: next };
}

function closeHealthProgressClientUpload(value, featureKey, now = new Date()) {
  const stored = normalizeHealthProgressClientUpload(value);
  if (!HEALTH_PROGRESS_CLIENT_UPLOAD_KEYS.includes(featureKey)) return stored;
  stored[featureKey] = {
    open: false,
    closedAt: now.toISOString(),
    source: null,
  };
  return stored;
}

function openHealthProgressClientUpload(value, featureKey) {
  const stored = normalizeHealthProgressClientUpload(value);
  if (!HEALTH_PROGRESS_CLIENT_UPLOAD_KEYS.includes(featureKey)) return stored;
  stored[featureKey] = {
    open: true,
    closedAt: stored[featureKey].closedAt,
    source: "coach",
  };
  return stored;
}

function hasAnyHealthProgressFeature(settings) {
  if (!settings) return false;
  return HEALTH_PROGRESS_FEATURE_KEYS.some((key) => Boolean(settings[key]));
}

function normalizeGlucoseType(value) {
  const next = String(value || "").toLowerCase().trim();
  if (!GLUCOSE_TYPES.has(next)) {
    throw new Error("type must be fbs or ppbs");
  }
  return next;
}

function normalizeBodyPart(value) {
  const next = String(value || "").toLowerCase().trim().replace(/\s+/g, "_");
  if (!HEALTH_PROGRESS_BODY_PARTS.includes(next)) {
    throw new Error("Invalid body part");
  }
  return next;
}

const WEIGHT_KG_MAX = 500;
const WEIGHT_LBS_MAX = 1102;
const GLUCOSE_VALUE_MAX = 600;
const BP_SYS_MAX = 300;
const BP_DIA_MAX = 200;
const HEALTH_NUMBER_RAW_MAX_LEN = 8;
const BODY_PART_OTHER_MAX_LEN = 200;
const LBS_TO_KG = 0.453592;
const POSITIVE_NUMBER_RE = /^\d+(\.\d{1,2})?$/;

function toIsoDateOnly(value) {
  if (value === undefined || value === null || value === "") return null;
  const extracted = extractDateOnlyInput(value);
  if (extracted && isValidDateOnly(extracted)) return extracted;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toRecordedAtFromDateOnly(dateOnly) {
  if (!dateOnly) return new Date().toISOString();
  const d = new Date(`${dateOnly}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function healthProgressToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: HEALTH_PROGRESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function healthProgressDateKey(value) {
  if (value === undefined || value === null || value === "") return "";
  const str = String(value).trim();
  if (!str) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(str) && isValidDateOnly(str)) return str;
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: HEALTH_PROGRESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function alignWeightLogDates(item) {
  const recordedAt = item?.recordedAt || null;
  const date = healthProgressDateKey(recordedAt) || null;
  return {
    date,
    recordedAt,
    createdAt: recordedAt,
    updatedAt: recordedAt,
  };
}

function healthProgressDayBounds(dateOnly) {
  const key = healthProgressDateKey(dateOnly);
  if (!key) return null;
  const start = new Date(`${key}T00:00:00.000+05:30`);
  const end = new Date(`${key}T23:59:59.999+05:30`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return { start: start.toISOString(), end: end.toISOString() };
}

function extractDateOnlyInput(value) {
  if (value === undefined || value === null || value === "") return "";
  const str = String(value).trim();
  if (!str) return "";
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : str;
}

function parseRequiredDateOnly(value, fieldName = "date") {
  const raw = extractDateOnlyInput(value);
  if (!raw) throw new Error(`${fieldName} is required`);
  if (!isValidDateOnly(raw)) throw new Error(`${fieldName} must be YYYY-MM-DD`);
  if (raw > healthProgressToday()) {
    throw new Error(`${fieldName} cannot be in the future`);
  }
  return raw;
}

function parseMenstrualDates(body = {}) {
  const startDate = parseRequiredDateOnly(body.startDate ?? body.start_date, "startDate");
  const endDate = parseRequiredDateOnly(body.endDate ?? body.end_date, "endDate");
  if (endDate < startDate) {
    throw new Error("endDate must be on or after startDate");
  }
  return { startDate, endDate };
}

function parsePositiveBoundedNumber(raw, { field, max, decimals = 2 }) {
  if (raw === undefined || raw === null || raw === "") return null;
  const str = String(raw).trim();
  if (/[eE]/.test(str) || !POSITIVE_NUMBER_RE.test(str)) {
    throw new Error(`${field} must be a positive number`);
  }
  if (str.length > HEALTH_NUMBER_RAW_MAX_LEN) {
    throw new Error(`${field} must be greater than 0 and at most ${max}`);
  }
  const n = Number(str);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${field} must be a positive number`);
  }
  if (n > max) {
    throw new Error(`${field} must be greater than 0 and at most ${max}`);
  }
  return Number(n.toFixed(decimals));
}

function parseHealthWeightKg(rawWeight, unitRaw) {
  if (rawWeight === undefined || rawWeight === null || rawWeight === "") return null;

  const str = String(rawWeight).trim();
  if (/[eE]/.test(str) || !POSITIVE_NUMBER_RE.test(str)) {
    throw new Error("weightKg must be a positive number");
  }
  if (str.length > HEALTH_NUMBER_RAW_MAX_LEN) {
    throw new Error("weightKg must be greater than 0 and at most 500");
  }

  const n = Number(str);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("weightKg must be a positive number");
  }

  const unit = String(unitRaw || "kg").toLowerCase().trim();
  const isLbs = unit === "lbs" || unit === "lb";
  const weightKg = isLbs ? Number((n * LBS_TO_KG).toFixed(2)) : Number(n.toFixed(2));
  if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > WEIGHT_KG_MAX) {
    throw new Error("weightKg must be greater than 0 and at most 500");
  }
  return weightKg;
}

function parseGlucoseValue(raw) {
  return parsePositiveBoundedNumber(raw, { field: "value", max: GLUCOSE_VALUE_MAX, decimals: 1 });
}

function parseBloodPressureSys(raw) {
  return parsePositiveBoundedNumber(raw, { field: "sys", max: BP_SYS_MAX, decimals: 1 });
}

function parseBloodPressureDia(raw) {
  return parsePositiveBoundedNumber(raw, { field: "dia", max: BP_DIA_MAX, decimals: 1 });
}

function parseConditionBodyPart(body = {}) {
  const bodyPart = normalizeBodyPart(body.bodyPart ?? body.body_part);
  if (bodyPart !== "other") {
    return { bodyPart, bodyPartOther: null };
  }
  const other = String(body.bodyPartOther ?? body.body_part_other ?? "").trim();
  if (!other) {
    throw new Error("bodyPartOther is required when bodyPart is other");
  }
  return { bodyPart, bodyPartOther: other.slice(0, BODY_PART_OTHER_MAX_LEN) };
}

function formatChartDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()}${months[d.getMonth()]}${String(d.getFullYear()).slice(-2)}`;
}

function formatSummaryDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${d.getDate()} ${months[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
}

module.exports = {
  HEALTH_PROGRESS_FEATURE_KEYS,
  HEALTH_PROGRESS_CLIENT_UPLOAD_KEYS,
  HEALTH_PROGRESS_BODY_PARTS,
  GLUCOSE_TYPES,
  defaultHealthProgressFeatures,
  normalizeHealthProgressFeatures,
  normalizeHealthProgressClientUpload,
  resolveHealthProgressClientUpload,
  closeHealthProgressClientUpload,
  openHealthProgressClientUpload,
  isHealthProgressSaturday,
  isFemaleUser,
  resolveHealthProgressSettings,
  trackerFeatureKeysForProgramLabel,
  applyPurchasedProgramTrackers,
  hasAnyHealthProgressFeature,
  normalizeGlucoseType,
  normalizeBodyPart,
  toIsoDateOnly,
  toRecordedAtFromDateOnly,
  toNumberOrNull,
  WEIGHT_KG_MAX,
  WEIGHT_LBS_MAX,
  GLUCOSE_VALUE_MAX,
  BP_SYS_MAX,
  BP_DIA_MAX,
  parseHealthWeightKg,
  parseGlucoseValue,
  parseBloodPressureSys,
  parseBloodPressureDia,
  parseRequiredDateOnly,
  parseMenstrualDates,
  parseConditionBodyPart,
  healthProgressToday,
  healthProgressDateKey,
  alignWeightLogDates,
  healthProgressDayBounds,
  formatChartDate,
  formatSummaryDate,
};
