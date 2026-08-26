const { isValidDateOnly } = require("./dateOnly");

const HEALTH_PROGRESS_FEATURE_KEYS = [
  "weightPic",
  "glucose",
  "bloodPressure",
  "menstrualCycle",
  "conditionComparison",
];

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
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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
  HEALTH_PROGRESS_BODY_PARTS,
  GLUCOSE_TYPES,
  defaultHealthProgressFeatures,
  normalizeHealthProgressFeatures,
  isFemaleUser,
  resolveHealthProgressSettings,
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
  formatChartDate,
  formatSummaryDate,
};
