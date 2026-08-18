export const PHOTO_ANGLES = [
  { label: "Front", urlKey: "frontPicUrl" },
  { label: "Right", urlKey: "rightPicUrl" },
  { label: "Left", urlKey: "leftPicUrl" },
];

export const BODY_ANALYTICS = {
  weeklyHint: "Weekly data uses the latest saved value in each week. Empty weeks still appear in the last 3 columns.",
  monthlyHint: "Δ = latest month − previous month (JUL − JUN). May is shown for reference only.",
};

const DUMMY_HISTORY_YEAR = 2026;
export const DUMMY_JULY_PERIOD = `${DUMMY_HISTORY_YEAR}-07`;

const DUMMY_MEASUREMENTS_BY_MONTH = {
  "07": { neckCm: 38, shoulderCm: 112, chestCm: 96, waistCm: 82, hipCm: 98, thighsCm: 56 },
  "06": { neckCm: 38.5, shoulderCm: 111.5, chestCm: 98, waistCm: 86, hipCm: 100, thighsCm: 57 },
  "05": { neckCm: 39, shoulderCm: 111, chestCm: 100, waistCm: 90, hipCm: 102, thighsCm: 58 },
};

const DUMMY_METABOLIC_BY_MONTH = {
  "07": { bmi: 27.4, bmr: 1420, tdee: 2050, bodyFatPercent: 31.2 },
  "06": { bmi: 28.1, bmr: 1405, tdee: 2020, bodyFatPercent: 32.8 },
  "05": { bmi: 28.8, bmr: 1390, tdee: 1990, bodyFatPercent: 34.4 },
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
];

function parseNum(value) {
  const number = Number.parseFloat(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : null;
}

function dummyRecordedAt(month) {
  return `${DUMMY_HISTORY_YEAR}-${month}-15T12:00:00.000Z`;
}

function withoutPeriod(records, mode, monthKey) {
  return (records || []).filter((row) => periodKey(row.recordedAt, mode) !== monthKey);
}

function hasPeriod(records, mode, monthKey) {
  return (records || []).some((row) => periodKey(row.recordedAt, mode) === monthKey);
}

export function withDummyJulyHistory(bodyAnalytics) {
  const measurements = [...(bodyAnalytics?.measurements || [])];
  const metabolicMetrics = [...(bodyAnalytics?.metabolicMetrics || [])];

  const julyMeasurements = withoutPeriod(measurements, "monthly", DUMMY_JULY_PERIOD);
  julyMeasurements.unshift({
    id: "dummy-july-measurement",
    recordedAt: dummyRecordedAt("07"),
    ...DUMMY_MEASUREMENTS_BY_MONTH["07"],
  });

  const julyMetabolic = withoutPeriod(metabolicMetrics, "monthly", DUMMY_JULY_PERIOD);
  julyMetabolic.unshift({
    id: "dummy-july-metabolic",
    recordedAt: dummyRecordedAt("07"),
    ...DUMMY_METABOLIC_BY_MONTH["07"],
  });

  if (!hasPeriod(julyMeasurements, "monthly", `${DUMMY_HISTORY_YEAR}-06`)) {
    julyMeasurements.push({
      id: "dummy-june-measurement",
      recordedAt: dummyRecordedAt("06"),
      ...DUMMY_MEASUREMENTS_BY_MONTH["06"],
    });
  }
  if (!hasPeriod(julyMetabolic, "monthly", `${DUMMY_HISTORY_YEAR}-06`)) {
    julyMetabolic.push({
      id: "dummy-june-metabolic",
      recordedAt: dummyRecordedAt("06"),
      ...DUMMY_METABOLIC_BY_MONTH["06"],
    });
  }
  if (!hasPeriod(julyMeasurements, "monthly", `${DUMMY_HISTORY_YEAR}-05`)) {
    julyMeasurements.push({
      id: "dummy-may-measurement",
      recordedAt: dummyRecordedAt("05"),
      ...DUMMY_MEASUREMENTS_BY_MONTH["05"],
    });
  }
  if (!hasPeriod(julyMetabolic, "monthly", `${DUMMY_HISTORY_YEAR}-05`)) {
    julyMetabolic.push({
      id: "dummy-may-metabolic",
      recordedAt: dummyRecordedAt("05"),
      ...DUMMY_METABOLIC_BY_MONTH["05"],
    });
  }

  return {
    ...bodyAnalytics,
    measurements: julyMeasurements,
    metabolicMetrics: julyMetabolic,
  };
}

function formatDelta(current, previous, unitSuffix = "") {
  const currentNumber = parseNum(current);
  const previousNumber = parseNum(previous);
  if (currentNumber == null || previousNumber == null) return "—";
  const diff = Math.round((currentNumber - previousNumber) * 10) / 10;
  const suffix = unitSuffix ? ` ${unitSuffix}` : "";
  return `${diff > 0 ? "+" : ""}${diff}${suffix}`;
}

function deltaTone(diffText) {
  if (diffText === "—" || diffText === "0" || diffText.startsWith("0 ")) return "neutral";
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
  return [...new Set(records.map((row) => periodKey(row.recordedAt, mode)).filter(Boolean))]
    .sort((a, b) => b.localeCompare(a));
}

export function getHistoryWindow(mode, anchor, count = 3) {
  if (!anchor) return [];
  const keys = [anchor];
  let current = anchor;
  for (let i = 1; i < count; i += 1) {
    current = previousPeriodKey(current, mode);
    if (!current) break;
    keys.push(current);
  }
  return keys;
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

function formatValue(value, suffix = "", decimals = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return `${number.toFixed(decimals)}${suffix}`;
}

export function buildMeasurementRows(records, mode, unit, columns) {
  const history = latestByPeriod(records, mode);
  const unitSuffix = unit === "cm" ? "cm" : "in";
  const divisor = unit === "cm" ? 1 : 2.54;

  return MEASURE_FIELDS.map(({ label, field }) => {
    const values = columns.map((column) => {
      const raw = history[column]?.[field];
      return Number.isFinite(Number(raw)) ? formatValue(Number(raw) / divisor, "", 1) : "—";
    });
    const latest = values[0];
    const previous = values[1];
    const delta = columns.length >= 2 ? formatDelta(latest, previous, unitSuffix) : "—";
    return { label, values, delta, tone: deltaTone(delta) };
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
  return METABOLIC_FIELDS.map(({ label, field, suffix = "", decimals = 1 }) => {
    const history = latestMetricValueByPeriod(records, mode, field);
    const values = columns.map((column) => formatValue(history[column], suffix, decimals));
    const latest = values[0];
    const previous = values[1];
    const delta = columns.length >= 2 ? formatDelta(latest, previous) : "—";
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
