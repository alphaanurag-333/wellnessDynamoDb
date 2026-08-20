export const PHOTO_ANGLES = [
  { label: "Front", urlKey: "frontPicUrl", slug: "front" },
  { label: "Right", urlKey: "rightPicUrl", slug: "right" },
  { label: "Left", urlKey: "leftPicUrl", slug: "left" },
];

export const BODY_ANALYTICS = {
  weeklyHint: "Weekly data uses the latest saved value in each week. Empty weeks still appear in the last 3 columns.",
  monthlyHint: "Monthly data uses the latest saved value in each month. Empty months still appear in the last 3 columns. Δ = latest − previous.",
};

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

const MEASURE_FIELDS = [
  { label: "Neck", field: "neckCm" },
  { label: "Shoulder", field: "shoulderCm" },
  { label: "Chest", field: "chestCm" },
  { label: "Waist", field: "waistCm" },
  { label: "Hip", field: "hipCm" },
  { label: "Thighs", field: "thighsCm" },
];

const METABOLIC_FIELDS = [
  { label: "BMI", field: "bmi", decimals: 1 },
  { label: "BMR", field: "bmr", suffix: " kcal", decimals: 0 },
  { label: "TDEE", field: "tdee", suffix: " kcal", decimals: 0 },
  { label: "Body fat %", field: "bodyFatPercent", suffix: "%", decimals: 1 },
  { label: "Visceral fat %", field: "visceralFatPercent", suffix: "%", decimals: 1 },
  { label: "Est. visceral fat", field: "estimatedVisceralFat", decimals: 0 },
  { label: "Waist-height ratio", field: "waistHeightRatio", decimals: 2 },
];

function hasNumericValue(value) {
  if (value == null || value === "") return false;
  return Number.isFinite(Number(value));
}

function parseNum(value) {
  if (!hasNumericValue(value) && typeof value !== "string") return null;
  const number = Number.parseFloat(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : null;
}

function formatDelta(current, previous, unitSuffix = "") {
  const currentNumber = parseNum(current);
  const previousNumber = parseNum(previous);
  if (currentNumber == null || previousNumber == null) return "-";
  const diff = Math.round((currentNumber - previousNumber) * 10) / 10;
  const suffix = unitSuffix ? ` ${unitSuffix}` : "";
  return `${diff > 0 ? "+" : ""}${diff}${suffix}`;
}

function deltaTone(diffText) {
  if (diffText === "-" || diffText === "0" || diffText.startsWith("0 ")) return "neutral";
  return diffText.startsWith("+") ? "bad" : "good";
}

function validDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function periodKey(value, mode) {
  const date = validDate(value);
  if (!date) return "";
  if (mode === "monthly") {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
  }
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = copy.getDay() || 7;
  copy.setDate(copy.getDate() - day + 1);
  return `${copy.getFullYear()}-${pad2(copy.getMonth() + 1)}-${pad2(copy.getDate())}`;
}

function previousPeriodKey(key, mode) {
  if (mode === "monthly") {
    const [year, month] = String(key).split("-").map(Number);
    if (!year || !month) return "";
    const date = new Date(year, month - 2, 1);
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
  }
  const date = validDate(`${key}T12:00:00`);
  if (!date) return "";
  date.setDate(date.getDate() - 7);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function getPeriodOptions(bodyAnalytics, mode) {
  const records = [
    ...(bodyAnalytics?.measurements || []),
    ...(bodyAnalytics?.metabolicMetrics || []),
  ];
  return [...new Set(records.map((row) => periodKey(row.recordedAt || row.createdAt, mode)).filter(Boolean))]
    .sort((a, b) => b.localeCompare(a));
}

function currentPeriodKey(mode, now = new Date()) {
  if (mode === "monthly") {
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
  }
  const copy = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = copy.getDay() || 7;
  copy.setDate(copy.getDate() - day + 1);
  return `${copy.getFullYear()}-${pad2(copy.getMonth() + 1)}-${pad2(copy.getDate())}`;
}

export function getHistoryWindow(mode, anchor, count = 3) {
  let current = anchor || currentPeriodKey(mode);
  const keys = [current];
  for (let i = 1; i < count; i += 1) {
    current = previousPeriodKey(current, mode);
    if (!current) break;
    keys.push(current);
  }
  return keys;
}

function formatValue(value, suffix = "", decimals = 1) {
  const number = parseNum(value);
  if (number == null) return "-";
  return `${number.toFixed(decimals)}${suffix}`;
}

function latestMetricValueByPeriod(records, mode, field) {
  const values = {};
  const sorted = [...(records || [])].sort((a, b) =>
    String(b.recordedAt || b.createdAt || "").localeCompare(String(a.recordedAt || a.createdAt || "")),
  );
  for (const row of sorted) {
    const key = periodKey(row.recordedAt || row.createdAt, mode);
    if (key && values[key] == null && hasNumericValue(row[field])) {
      values[key] = row[field];
    }
  }
  return values;
}

export function buildMeasurementRows(records, mode, unit, columns) {
  const unitSuffix = unit === "cm" ? "cm" : "in";
  const divisor = unit === "cm" ? 1 : 2.54;

  return MEASURE_FIELDS.map(({ label, field }) => {
    const history = latestMetricValueByPeriod(records, mode, field);
    const values = columns.map((column) => {
      const raw = history[column];
      return hasNumericValue(raw) ? formatValue(Number(raw) / divisor, "", 1) : "-";
    });
    const latest = values[0];
    const previous = values[1];
    const delta = columns.length >= 2 ? formatDelta(latest, previous, unitSuffix) : "-";
    return { label, values, delta, tone: deltaTone(delta) };
  });
}

export function buildMetabolicRows(records, mode, columns) {
  return METABOLIC_FIELDS.map(({ label, field, suffix = "", decimals = 1 }) => {
    const history = latestMetricValueByPeriod(records, mode, field);
    const values = columns.map((column) => formatValue(history[column], suffix, decimals));
    const latest = values[0];
    const previous = values[1];
    const delta = columns.length >= 2 ? formatDelta(latest, previous) : "-";
    return { label, values, delta, tone: deltaTone(delta) };
  });
}

function parsePeriodDate(mode, key) {
  if (mode === "monthly") {
    const [year, month] = String(key).split("-").map(Number);
    if (!year || !month) return null;
    return new Date(year, month - 1, 1);
  }
  return validDate(`${key}T12:00:00`);
}

export function formatHistoryColumns(mode, columns) {
  return columns.map((key) => {
    const date = parsePeriodDate(mode, key);
    if (!date) return key;
    const month = MONTHS[date.getMonth()];
    if (mode === "monthly") return month;
    return `${date.getDate()} ${month}`;
  });
}

export function formatPeriodOption(mode, key) {
  const date = parsePeriodDate(mode, key);
  if (!date) return key;
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  if (mode === "monthly") return `${month} ${year}`;
  return `${date.getDate()} ${month} ${year}`;
}

export function formatPhotoDate(value) {
  const date = validDate(value);
  if (!date) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function buildPhotosByAngle(photos) {
  return Object.fromEntries(PHOTO_ANGLES.map((angle) => [
    angle.label,
    (photos || [])
      .filter((photo) => photo[angle.urlKey])
      .map((photo) => ({
        id: `${photo.id || photo._id}-${angle.label}`,
        photoId: String(photo.id || photo._id || ""),
        angle: angle.slug,
        date: formatPhotoDate(photo.recordedAt),
        url: photo[angle.urlKey],
      })),
  ]));
}
