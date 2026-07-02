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

function toIsoDateOnly(value) {
  if (value === undefined || value === null || value === "") return null;
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
  formatChartDate,
  formatSummaryDate,
};
