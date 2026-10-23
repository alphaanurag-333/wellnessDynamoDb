export const PHOTO_ANGLES = [
  { label: "Front", urlKey: "frontPicUrl", slug: "front" },
  { label: "Right", urlKey: "rightPicUrl", slug: "right" },
  { label: "Left", urlKey: "leftPicUrl", slug: "left" },
  { label: "Weight", urlKey: "weightPicUrl", slug: "weight", source: "measurement", single: true },
];

export const BODY_ANALYTICS = {
  weeklyHint: "Weekly data uses the latest saved value in each week. Empty weeks still appear in the last 3 columns.",
  monthlyHint: "Monthly data uses the latest saved value in each month. Empty months still appear in the last 3 columns. Δ = latest − previous.",
};

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

const CM_PER_INCH = 2.54;
const KG_TO_LB = 2.2046226218;

// Calculator.net activity factors (Mifflin–St Jeor TDEE).
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.465,
  highly_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

const MEASURE_FIELDS = [
  { label: "Height", field: "heightCm" },
  { label: "Weight", field: "weightKg", kind: "weight" },
  { label: "Neck", field: "neckCm" },
  { label: "Shoulder", field: "shoulderCm" },
  { label: "Chest", field: "chestCm" },
  { label: "Waist", field: "waistCm" },
  { label: "Hip", field: "hipCm" },
  { label: "Thighs", field: "thighsCm" },
];

const METABOLIC_FIELDS = [
  { label: "BMI", field: "bmi", metricType: "bmi", decimals: 1 },
  { label: "BMR", field: "bmr", metricType: "bmr", suffix: " kcal", decimals: 0 },
  { label: "TDEE", field: "tdee", metricType: "bmr", fieldKey: "tdee", suffix: " kcal", decimals: 0 },
  { label: "Body fat %", field: "bodyFatPercent", metricType: "body_fat", suffix: "%", decimals: 1 },
  { label: "Visceral fat %", field: "visceralFatPercent", metricType: "visceral_fat", suffix: " cm²", decimals: 2 },
  { label: "Est. visceral fat", field: "estimatedVisceralFat", metricType: "visceral_fat", suffix: " cm²", decimals: 2 },
  { label: "Waist - hip ratio", field: "waistHipRatio", metricType: "visceral_fat", decimals: 2 },
  {
    label: "Fatty liver index (FLI)",
    field: "fli",
    metricType: "fatty_liver",
    decimals: 1,
  },
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

function positiveNumber(value) {
  const number = parseNum(value);
  if (number == null || number <= 0) return null;
  return number;
}

function weightToKg(row) {
  const weight = positiveNumber(row?.weightKg);
  if (weight == null) return null;
  const unit = String(row?.weightUnit || "kg").toLowerCase().trim();
  if (unit === "lb" || unit === "lbs" || unit === "pound" || unit === "pounds") {
    return weight * 0.45359237;
  }
  return weight;
}

function heightToCm(row) {
  const height = positiveNumber(row?.heightCm);
  if (height == null) return null;
  const unit = String(row?.heightUnit || "cm").toLowerCase().trim();
  if (unit === "in" || unit === "inch" || unit === "inches") return height * CM_PER_INCH;
  if (unit === "ft" || unit === "feet" || unit === "foot") return height * 30.48;
  return height;
}

function lengthCm(row, field) {
  if (field === "heightCm") return heightToCm(row);
  return positiveNumber(row?.[field]);
}

function normalizeGender(value) {
  const next = String(value || "").toLowerCase().trim();
  if (next === "male" || next === "m" || next === "man" || next === "boy") return "male";
  if (next === "female" || next === "f" || next === "woman" || next === "girl") return "female";
  return "";
}

function ageYearsAt(dob, at) {
  const birth = validDate(dob);
  const when = validDate(at) || new Date();
  if (!birth) return null;
  let age = when.getFullYear() - birth.getFullYear();
  const monthDiff = when.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && when.getDate() < birth.getDate())) age -= 1;
  if (!Number.isFinite(age) || age <= 0 || age > 120) return null;
  return age;
}

function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round((value + Math.sign(value) * 1e-8) * factor) / factor;
}

function bmiValue(heightCm, weightKg) {
  if (!heightCm || !weightKg) return null;
  const meters = heightCm / 100;
  if (meters <= 0) return null;
  const bmi = weightKg / (meters * meters);
  return Number.isFinite(bmi) && bmi > 0 ? bmi : null;
}

function computeBmi(heightCm, weightKg) {
  const bmi = bmiValue(heightCm, weightKg);
  return bmi == null ? null : roundTo(bmi, 1);
}

function computeBmr({ gender, age, heightCm, weightKg }) {
  if (!gender || !age || !heightCm || !weightKg) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const result = gender === "female" ? base - 161 : base + 5;
  if (!Number.isFinite(result) || result <= 0) return null;
  return Math.round(result);
}

function computeBodyFatPercent({ gender, heightCm, neckCm, waistCm, hipCm }) {
  if (!gender || !heightCm || !neckCm || !waistCm) return null;
  let density;
  if (gender === "female") {
    if (!hipCm || waistCm + hipCm <= neckCm) return null;
    density = 1.29579 - 0.35004 * Math.log10(waistCm + hipCm - neckCm) + 0.221 * Math.log10(heightCm);
  } else if (waistCm <= neckCm) {
    return null;
  } else {
    density = 1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm);
  }
  if (!Number.isFinite(density) || density <= 0) return null;
  const percent = 495 / density - 450;
  if (!Number.isFinite(percent) || percent <= 0 || percent >= 100) return null;
  return roundTo(percent, 1);
}

function computeVisceralFatCm2({ gender, age, heightCm, weightKg, waistCm, thighCm }) {
  if (!gender || !age || !waistCm || !thighCm) return null;
  let vat;
  if (gender === "female") {
    const bmi = bmiValue(heightCm, weightKg);
    if (bmi == null) return null;
    vat = 2.15 * waistCm - 3.63 * thighCm + 1.46 * age + 6.22 * bmi - 92.713;
  } else {
    vat = 6 * waistCm - 4.41 * thighCm + 1.19 * age - 213.65;
  }
  if (!Number.isFinite(vat) || vat <= 0) return null;
  return roundTo(vat, 2);
}

function computeWaistHipRatio(waistCm, hipCm) {
  if (!waistCm || !hipCm) return null;
  return roundTo(waistCm / hipCm, 2);
}

function deriveMetabolicSnapshot(row, profile) {
  const recordedAt = row?.recordedAt || row?.createdAt || "";
  const gender = normalizeGender(profile?.gender);
  const age = ageYearsAt(profile?.dob, recordedAt);
  const heightCm = heightToCm(row);
  const weightKg = weightToKg(row);
  const neckCm = positiveNumber(row?.neckCm);
  const waistCm = positiveNumber(row?.waistCm);
  const hipCm = positiveNumber(row?.hipCm);
  const thighCm = positiveNumber(row?.thighsCm);
  const activityKey = String(row?.activityLevel || "moderately_active").toLowerCase().trim();
  const multiplier = ACTIVITY_MULTIPLIERS[activityKey] || ACTIVITY_MULTIPLIERS.moderately_active;
  const bmr = computeBmr({ gender, age, heightCm, weightKg });
  const visceralFatCm2 = computeVisceralFatCm2({ gender, age, heightCm, weightKg, waistCm, thighCm });

  return {
    recordedAt,
    bmi: computeBmi(heightCm, weightKg),
    bmr,
    tdee: bmr != null ? Math.round(bmr * multiplier) : null,
    bodyFatPercent: computeBodyFatPercent({ gender, heightCm, neckCm, waistCm, hipCm }),
    visceralFatPercent: visceralFatCm2,
    estimatedVisceralFat: visceralFatCm2,
    waistHipRatio: computeWaistHipRatio(waistCm, hipCm),
  };
}

function latestMetricValueByPeriod(records, mode, field, readValue = (row) => row?.[field]) {
  const values = {};
  const sorted = [...(records || [])].sort((a, b) =>
    String(b.recordedAt || b.createdAt || "").localeCompare(String(a.recordedAt || a.createdAt || "")),
  );
  for (const row of sorted) {
    const key = periodKey(row.recordedAt || row.createdAt, mode);
    const value = readValue(row);
    if (key && values[key] == null && hasNumericValue(value)) {
      values[key] = value;
    }
  }
  return values;
}

export function buildMeasurementRows(records, mode, unit, columns) {
  const lengthSuffix = unit === "cm" ? "cm" : "in";
  const weightSuffix = unit === "cm" ? "kg" : "lb";

  return MEASURE_FIELDS.map((spec) => {
    const history = latestMetricValueByPeriod(records, mode, spec.field, (row) => (
      spec.kind === "weight" ? weightToKg(row) : lengthCm(row, spec.field)
    ));
    const values = columns.map((column) => {
      const raw = history[column];
      if (!hasNumericValue(raw)) return "-";
      if (spec.kind === "weight") {
        const shown = unit === "cm" ? Number(raw) : Number(raw) * KG_TO_LB;
        return formatValue(shown, ` ${weightSuffix}`, 1);
      }
      const shown = unit === "cm" ? Number(raw) : Number(raw) / CM_PER_INCH;
      return formatValue(shown, "", 1);
    });
    const latest = values[0];
    const previous = values[1];
    const deltaSuffix = spec.kind === "weight" ? weightSuffix : lengthSuffix;
    const delta = columns.length >= 2 ? formatDelta(latest, previous, deltaSuffix) : "-";
    return { label: spec.label, values, delta, tone: deltaTone(delta) };
  });
}

export function buildMetabolicRows(measurementRecords, mode, columns, profile = {}, metabolicLogs = []) {
  const derived = (Array.isArray(measurementRecords) ? measurementRecords : []).map((row) => (
    deriveMetabolicSnapshot(row, profile)
  ));
  const logs = Array.isArray(metabolicLogs) ? metabolicLogs : [];

  return METABOLIC_FIELDS.map((spec) => {
    const {
      label,
      field,
      fieldKey,
      metricType,
      suffix = "",
      decimals = 1,
    } = spec;
    const readField = fieldKey || field;
    const typeLogs = metricType
      ? logs.filter((log) => String(log.metricType || "").toLowerCase() === metricType)
      : [];

    const derivedHistory = latestMetricValueByPeriod(derived, mode, field);
    const logHistory = typeLogs.length
      ? latestMetricValueByPeriod(typeLogs, mode, readField, (row) => row?.[readField])
      : null;
    const history = logHistory
      ? Object.fromEntries(
        columns.map((column) => [
          column,
          hasNumericValue(logHistory[column]) ? logHistory[column] : derivedHistory[column],
        ]),
      )
      : derivedHistory;

    const values = columns.map((column) => {
      const raw = history[column];
      if (!hasNumericValue(raw)) return "-";
      return formatValue(raw, suffix, decimals);
    });
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
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function normalizePhotoReviewStatus(value) {
  const next = String(value || "pending").trim().toLowerCase();
  if (next === "approved" || next === "rejected") return next;
  return "pending";
}

export function photoReviewMeta(status) {
  const value = normalizePhotoReviewStatus(status);
  if (value === "approved") return { label: "Accepted", tone: "approved" };
  if (value === "rejected") return { label: "Rejected", tone: "rejected" };
  return { label: "Pending", tone: "pending" };
}

export function photoReviewSummary(photos) {
  const list = photos || [];
  if (!list.length) return null;
  const pending = list.filter((photo) => normalizePhotoReviewStatus(photo.reviewStatus) === "pending").length;
  const rejected = list.filter((photo) => normalizePhotoReviewStatus(photo.reviewStatus) === "rejected").length;
  const approved = list.length - pending - rejected;
  if (pending === list.length) return { label: "Pending", tone: "pending" };
  if (pending > 0) return { label: `${pending} pending`, tone: "pending" };
  if (rejected && approved) return { label: "Reviewed", tone: "mixed" };
  if (rejected) return { label: "Rejected", tone: "rejected" };
  return { label: "Accepted", tone: "approved" };
}

function mapPhotoRows(records, angle) {
  return (records || [])
    .filter((row) => row[angle.urlKey])
    .map((row) => ({
      id: `${row.id || row._id}-${angle.label}`,
      photoId: String(row.id || row._id || ""),
      angle: angle.slug,
      stamp: row.recordedAt || row.createdAt || "",
      date: formatPhotoDate(row.recordedAt || row.createdAt),
      url: row[angle.urlKey],
      reviewStatus: normalizePhotoReviewStatus(row[`${angle.slug}ReviewStatus`]),
      rejectionReason: String(row[`${angle.slug}RejectionReason`] || "").trim(),
    }));
}

export function buildPhotosByAngle(photos, measurements = []) {
  return Object.fromEntries(PHOTO_ANGLES.map((angle) => {
    const records = angle.source === "measurement" ? measurements : photos;
    const mapped = mapPhotoRows(records, angle);
    const list = angle.single
      ? mapped
          .slice()
          .sort((a, b) => String(b.stamp).localeCompare(String(a.stamp)))
          .slice(0, 1)
      : mapped;
    return [angle.label, list];
  }));
}

/** Newest photo for an angle card. Photos keep `stamp` from `buildPhotosByAngle`. */
export function latestAnglePhoto(photos) {
  const list = (photos || []).filter((photo) => photo?.url);
  if (!list.length) return null;
  return list.reduce((latest, photo) => {
    const latestKey = String(latest?.stamp || "");
    const photoKey = String(photo?.stamp || "");
    if (!photoKey) return latest;
    if (!latestKey || photoKey > latestKey) return photo;
    return latest;
  });
}

export function latestPhotoStamp(photos, measurements = []) {
  const onboardingWeight = (measurements || [])
    .filter((row) => row.weightPicUrl)
    .slice()
    .sort((a, b) =>
      String(b.recordedAt || b.createdAt || "").localeCompare(String(a.recordedAt || a.createdAt || "")),
    )[0];
  const stamps = [
    ...(photos || []).map((row) => row.recordedAt || row.createdAt),
    onboardingWeight?.recordedAt || onboardingWeight?.createdAt,
  ].filter(Boolean);
  if (!stamps.length) return null;
  return stamps.sort((a, b) => String(b).localeCompare(String(a)))[0];
}
