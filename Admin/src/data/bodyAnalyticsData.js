export const PHOTO_ANGLES = [
  { label: "Front", urlKey: "frontPicUrl" },
  { label: "Right", urlKey: "rightPicUrl" },
  { label: "Left", urlKey: "leftPicUrl" },
];

export const BODY_ANALYTICS = {
  weeklyHint: "Weekly data is grouped from the client's saved body records. Empty periods are skipped.",
  monthlyHint: "Monthly data uses the latest saved value in each month.",
};

const MEASURE_FIELDS = [
  { label: "Neck", field: "neckCm" },
  { label: "Shoulder", field: "shoulderCm" },
  { label: "Chest", field: "chestCm" },
  { label: "Waist", field: "waistCm" },
  { label: "Hip", field: "hipCm" },
  { label: "Thighs", field: "thighsCm" },
];

const METABOLIC_FIELDS = [
  { label: "BMI", field: "bmi" },
  { label: "BMR", field: "bmr", suffix: " kcal" },
  { label: "TDEE", field: "tdee", suffix: " kcal" },
  { label: "Body fat %", field: "bodyFatPercent", suffix: "%" },
  { label: "Lean muscle %", field: "leanMuscleMassPercent", suffix: "%" },
  { label: "Visceral fat", field: "estimatedVisceralFat" },
  { label: "Fatty liver idx", field: "fli" },
];

function parseNum(value) {
  const number = Number.parseFloat(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : null;
}

function formatDelta(current, previous, unitSuffix = "") {
  const currentNumber = parseNum(current);
  const previousNumber = parseNum(previous);
  if (currentNumber == null || previousNumber == null) return "—";
  const diff = Math.round((currentNumber - previousNumber) * 10) / 10;
  const suffix = unitSuffix ? ` ${unitSuffix}` : "";
  return `${diff > 0 ? "+" : ""}${diff}${suffix}`;
}

function deltaTone(label, diffText) {
  if (diffText === "—" || diffText === "0" || diffText.startsWith("0 ")) return "neutral";
  const isPositive = diffText.startsWith("+");
  const decreaseIsGood = ["Waist", "Hip", "Chest", "Thighs", "Neck", "Body fat %", "Visceral fat", "Fatty liver idx", "BMI"].includes(label);
  const increaseIsGood = ["BMR", "TDEE", "Lean muscle %"].includes(label);
  if (increaseIsGood) return isPositive ? "good" : "bad";
  if (decreaseIsGood) return isPositive ? "bad" : "good";
  return isPositive ? "bad" : "good";
}

function validDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function periodKey(value, mode) {
  const date = validDate(value);
  if (!date) return "";
  if (mode === "monthly") {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

export function getPeriodOptions(bodyAnalytics, mode) {
  const records = [
    ...(bodyAnalytics?.measurements || []),
    ...(bodyAnalytics?.metabolicMetrics || []),
  ];
  return [...new Set(records.map((row) => periodKey(row.recordedAt, mode)).filter(Boolean))]
    .sort((a, b) => b.localeCompare(a));
}

export function getHistoryWindow(options, anchor, count = 3) {
  const index = Math.max(0, options.indexOf(anchor));
  return options.slice(index, index + count);
}

function latestByPeriod(records, mode) {
  const byPeriod = {};
  const sorted = [...(records || [])].sort((a, b) =>
    String(b.recordedAt || "").localeCompare(String(a.recordedAt || "")),
  );
  for (const row of sorted) {
    const key = periodKey(row.recordedAt, mode);
    if (key && !byPeriod[key]) byPeriod[key] = row;
  }
  return byPeriod;
}

function formatValue(value, suffix = "") {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return `${Math.round(number * 10) / 10}${suffix}`;
}

export function buildMeasurementRows(records, mode, unit, columns) {
  const history = latestByPeriod(records, mode);
  const unitSuffix = unit === "cm" ? "cm" : "in";
  const divisor = unit === "cm" ? 1 : 2.54;

  return MEASURE_FIELDS.map(({ label, field }) => {
    const values = columns.map((column) => {
      const raw = history[column]?.[field];
      return Number.isFinite(Number(raw)) ? formatValue(Number(raw) / divisor) : "—";
    });
    const delta = columns.length >= 2 ? formatDelta(values[0], values[1], unitSuffix) : "—";
    return { label, values, delta, tone: deltaTone(label, delta) };
  });
}

function latestMetricValueByPeriod(records, mode, field) {
  const values = {};
  const sorted = [...(records || [])].sort((a, b) =>
    String(b.recordedAt || "").localeCompare(String(a.recordedAt || "")),
  );
  for (const row of sorted) {
    const key = periodKey(row.recordedAt, mode);
    if (key && values[key] == null && Number.isFinite(Number(row[field]))) {
      values[key] = row[field];
    }
  }
  return values;
}

export function buildMetabolicRows(records, mode, columns) {
  return METABOLIC_FIELDS.map(({ label, field, suffix = "" }) => {
    const history = latestMetricValueByPeriod(records, mode, field);
    const values = columns.map((column) => formatValue(history[column], suffix));
    const delta = columns.length >= 2 ? formatDelta(values[0], values[1]) : "—";
    return { label, values, delta, tone: deltaTone(label, delta) };
  });
}

export function formatHistoryColumns(mode, columns) {
  return columns.map((key) => {
    const date = validDate(mode === "monthly" ? `${key}-01T00:00:00.000Z` : `${key}T00:00:00.000Z`);
    if (!date) return key;
    return date.toLocaleDateString("en-GB", mode === "monthly"
      ? { month: "short", year: "numeric", timeZone: "UTC" }
      : { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  });
}

export function formatPhotoDate(value) {
  const date = validDate(value);
  if (!date) return "—";
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
        date: formatPhotoDate(photo.recordedAt),
        url: photo[angle.urlKey],
      })),
  ]));
}
