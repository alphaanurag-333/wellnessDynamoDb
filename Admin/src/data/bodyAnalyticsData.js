export const PHOTO_ANGLES = ["Front", "Side", "Back"];

export const BODY_ANALYTICS = {
  latestPhotoDate: "18 Jul 2026",
  weeklyHint: "Weekly data covers the last 8 weeks — for older history, switch to Monthly. Empty periods are skipped.",
  monthlyHint: "Monthly data shows the last 3 months for each selected anchor month.",
  weeklyOptions: ["15 Jul", "08 Jul", "01 Jul", "24 Jun", "17 Jun", "10 Jun", "03 Jun", "27 May"],
  monthlyOptions: ["Jul", "Jun", "May", "Apr", "Mar", "Feb", "Jan", "Dec"],
  photos: {
    Front: [
      { date: "18 Jul 2026" },
      { date: "18 Jun 2026" },
      { date: "18 May 2026" },
      { date: "18 Apr 2026" },
      { date: "18 Mar 2026" },
      { date: "18 Feb 2026" },
    ],
    Side: [
      { date: "18 Jul 2026" },
      { date: "18 Jun 2026" },
      { date: "18 May 2026" },
      { date: "18 Apr 2026" },
      { date: "18 Mar 2026" },
      { date: "18 Feb 2026" },
    ],
    Back: [
      { date: "18 Jul 2026" },
      { date: "18 Jun 2026" },
      { date: "18 May 2026" },
      { date: "18 Apr 2026" },
      { date: "18 Mar 2026" },
      { date: "18 Feb 2026" },
    ],
  },
};

const MEASURE_HISTORY = {
  weekly: {
    cm: {
      Neck: { "15 Jul": "38.0", "08 Jul": "38.1", "01 Jul": "38.3", "24 Jun": "38.4", "17 Jun": "38.5", "10 Jun": "38.6", "03 Jun": "38.8", "27 May": "39.0" },
      Shoulder: { "15 Jul": "112.0", "08 Jul": "111.9", "01 Jul": "111.8", "24 Jun": "111.7", "17 Jun": "111.6", "10 Jun": "111.5", "03 Jun": "111.3", "27 May": "111.0" },
      Chest: { "15 Jul": "96.0", "08 Jul": "96.5", "01 Jul": "97.0", "24 Jun": "97.5", "17 Jun": "98.0", "10 Jun": "98.5", "03 Jun": "99.0", "27 May": "99.5" },
      Waist: { "15 Jul": "82.0", "08 Jul": "83.0", "01 Jul": "84.0", "24 Jun": "85.0", "17 Jun": "86.0", "10 Jun": "87.0", "03 Jun": "88.0", "27 May": "89.0" },
      Hip: { "15 Jul": "98.0", "08 Jul": "98.5", "01 Jul": "99.0", "24 Jun": "99.5", "17 Jun": "100.0", "10 Jun": "100.5", "03 Jun": "101.0", "27 May": "101.5" },
      Thighs: { "15 Jul": "56.0", "08 Jul": "56.3", "01 Jul": "56.5", "24 Jun": "56.8", "17 Jun": "57.0", "10 Jun": "57.2", "03 Jun": "57.5", "27 May": "57.8" },
    },
    inch: {
      Neck: { "15 Jul": "15.0", "08 Jul": "15.0", "01 Jul": "15.1", "24 Jun": "15.1", "17 Jun": "15.2", "10 Jun": "15.2", "03 Jun": "15.3", "27 May": "15.4" },
      Shoulder: { "15 Jul": "44.1", "08 Jul": "44.1", "01 Jul": "44.0", "24 Jun": "44.0", "17 Jun": "43.9", "10 Jun": "43.9", "03 Jun": "43.8", "27 May": "43.7" },
      Chest: { "15 Jul": "37.8", "08 Jul": "38.0", "01 Jul": "38.2", "24 Jun": "38.4", "17 Jun": "38.6", "10 Jun": "38.8", "03 Jun": "39.0", "27 May": "39.2" },
      Waist: { "15 Jul": "32.3", "08 Jul": "32.7", "01 Jul": "33.1", "24 Jun": "33.5", "17 Jun": "33.9", "10 Jun": "34.3", "03 Jun": "34.6", "27 May": "35.0" },
      Hip: { "15 Jul": "38.6", "08 Jul": "38.8", "01 Jul": "39.0", "24 Jun": "39.2", "17 Jun": "39.4", "10 Jun": "39.6", "03 Jun": "39.8", "27 May": "40.0" },
      Thighs: { "15 Jul": "22.0", "08 Jul": "22.2", "01 Jul": "22.2", "24 Jun": "22.4", "17 Jun": "22.4", "10 Jun": "22.5", "03 Jun": "22.6", "27 May": "22.8" },
    },
  },
  monthly: {
    cm: {
      Neck: { Jul: "38.0", Jun: "38.5", May: "39.0", Apr: "39.5", Mar: "40.0", Feb: "40.5", Jan: "41.0", Dec: "41.5" },
      Shoulder: { Jul: "112.0", Jun: "111.5", May: "111.0", Apr: "110.5", Mar: "110.0", Feb: "109.5", Jan: "109.0", Dec: "108.5" },
      Chest: { Jul: "96.0", Jun: "98.0", May: "100.0", Apr: "101.0", Mar: "102.0", Feb: "103.0", Jan: "104.0", Dec: "105.0" },
      Waist: { Jul: "82.0", Jun: "86.0", May: "90.0", Apr: "92.0", Mar: "94.0", Feb: "96.0", Jan: "98.0", Dec: "100.0" },
      Hip: { Jul: "98.0", Jun: "100.0", May: "102.0", Apr: "103.0", Mar: "104.0", Feb: "105.0", Jan: "106.0", Dec: "107.0" },
      Thighs: { Jul: "56.0", Jun: "57.0", May: "58.0", Apr: "58.5", Mar: "59.0", Feb: "59.5", Jan: "60.0", Dec: "60.5" },
    },
    inch: {
      Neck: { Jul: "15.0", Jun: "15.2", May: "15.4", Apr: "15.6", Mar: "15.7", Feb: "15.9", Jan: "16.1", Dec: "16.3" },
      Shoulder: { Jul: "44.1", Jun: "43.9", May: "43.7", Apr: "43.5", Mar: "43.3", Feb: "43.1", Jan: "42.9", Dec: "42.7" },
      Chest: { Jul: "37.8", Jun: "38.6", May: "39.4", Apr: "39.8", Mar: "40.2", Feb: "40.6", Jan: "40.9", Dec: "41.3" },
      Waist: { Jul: "32.3", Jun: "33.9", May: "35.4", Apr: "36.2", Mar: "37.0", Feb: "37.8", Jan: "38.6", Dec: "39.4" },
      Hip: { Jul: "38.6", Jun: "39.4", May: "40.2", Apr: "40.6", Mar: "40.9", Feb: "41.3", Jan: "41.7", Dec: "42.1" },
      Thighs: { Jul: "22.0", Jun: "22.4", May: "22.8", Apr: "23.0", Mar: "23.2", Feb: "23.4", Jan: "23.6", Dec: "23.8" },
    },
  },
};

const METABOLIC_HISTORY = {
  weekly: {
    BMI: { "15 Jul": "27.4", "08 Jul": "27.6", "01 Jul": "27.8", "24 Jun": "28.0", "17 Jun": "28.1", "10 Jun": "28.2", "03 Jun": "28.4", "27 May": "28.6" },
    BMR: { "15 Jul": "1420 kcal", "08 Jul": "1416 kcal", "01 Jul": "1412 kcal", "24 Jun": "1408 kcal", "17 Jun": "1405 kcal", "10 Jun": "1402 kcal", "03 Jun": "1398 kcal", "27 May": "1394 kcal" },
    TDEE: { "15 Jul": "2050 kcal", "08 Jul": "2042 kcal", "01 Jul": "2035 kcal", "24 Jun": "2028 kcal", "17 Jun": "2020 kcal", "10 Jun": "2014 kcal", "03 Jun": "2008 kcal", "27 May": "2000 kcal" },
    "Body fat %": { "15 Jul": "31.2%", "08 Jul": "31.6%", "01 Jul": "32.0%", "24 Jun": "32.2%", "17 Jun": "32.4%", "10 Jun": "32.6%", "03 Jun": "32.8%", "27 May": "33.0%" },
    "Lean muscle %": { "15 Jul": "27.8%", "08 Jul": "27.6%", "01 Jul": "27.4%", "24 Jun": "27.2%", "17 Jun": "27.0%", "10 Jun": "26.8%", "03 Jun": "26.6%", "27 May": "26.4%" },
    "Visceral fat": { "15 Jul": "9", "08 Jul": "9", "01 Jul": "10", "24 Jun": "10", "17 Jun": "10", "10 Jun": "11", "03 Jun": "11", "27 May": "11" },
    "Fatty liver idx": { "15 Jul": "1.8", "08 Jul": "1.9", "01 Jul": "1.9", "24 Jun": "2.0", "17 Jun": "2.0", "10 Jun": "2.1", "03 Jun": "2.1", "27 May": "2.2" },
  },
  monthly: {
    BMI: { Jul: "27.4", Jun: "28.1", May: "28.8", Apr: "29.1", Mar: "29.4", Feb: "29.7", Jan: "30.0", Dec: "30.2" },
    BMR: { Jul: "1420 kcal", Jun: "1405 kcal", May: "1390 kcal", Apr: "1382 kcal", Mar: "1374 kcal", Feb: "1366 kcal", Jan: "1358 kcal", Dec: "1350 kcal" },
    TDEE: { Jul: "2050 kcal", Jun: "2020 kcal", May: "1990 kcal", Apr: "1975 kcal", Mar: "1960 kcal", Feb: "1945 kcal", Jan: "1930 kcal", Dec: "1915 kcal" },
    "Body fat %": { Jul: "31.2%", Jun: "32.8%", May: "34.4%", Apr: "35.0%", Mar: "35.6%", Feb: "36.2%", Jan: "36.8%", Dec: "37.4%" },
    "Lean muscle %": { Jul: "27.8%", Jun: "26.9%", May: "26.1%", Apr: "25.8%", Mar: "25.5%", Feb: "25.2%", Jan: "24.9%", Dec: "24.6%" },
    "Visceral fat": { Jul: "9", Jun: "10", May: "11", Apr: "11", Mar: "12", Feb: "12", Jan: "13", Dec: "13" },
    "Fatty liver idx": { Jul: "1.8", Jun: "2.1", May: "2.4", Apr: "2.5", Mar: "2.6", Feb: "2.7", Jan: "2.8", Dec: "2.9" },
  },
};

const MEASURE_LABELS = ["Neck", "Shoulder", "Chest", "Waist", "Hip", "Thighs"];
const METABOLIC_LABELS = ["BMI", "BMR", "TDEE", "Body fat %", "Lean muscle %", "Visceral fat", "Fatty liver idx"];

function parseNum(val) {
  const n = Number.parseFloat(String(val).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function formatDelta(current, previous, unitSuffix = "") {
  const a = parseNum(current);
  const b = parseNum(previous);
  if (a == null || b == null) return "—";
  const diff = Math.round((a - b) * 10) / 10;
  if (diff === 0) return unitSuffix ? `0 ${unitSuffix}` : "0";
  const sign = diff > 0 ? "+" : "";
  const suffix = unitSuffix ? ` ${unitSuffix}` : "";
  return `${sign}${diff}${suffix}`;
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

export function getHistoryWindow(mode, anchor, count = 3) {
  const options = mode === "weekly" ? BODY_ANALYTICS.weeklyOptions : BODY_ANALYTICS.monthlyOptions;
  const idx = Math.max(0, options.indexOf(anchor));
  return options.slice(idx, idx + count);
}

export function buildMeasurementRows(mode, unit, anchor) {
  const columns = getHistoryWindow(mode, anchor);
  const history = MEASURE_HISTORY[mode][unit];
  const unitSuffix = unit === "cm" ? "cm" : "in";

  return MEASURE_LABELS.map((label) => {
    const values = columns.map((col) => history[label][col] ?? "—");
    const delta = columns.length >= 2 ? formatDelta(values[0], values[1], unitSuffix) : "—";
    return { label, values, delta, tone: deltaTone(label, delta) };
  });
}

export function buildMetabolicRows(mode, anchor) {
  const columns = getHistoryWindow(mode, anchor);
  const history = METABOLIC_HISTORY[mode];

  return METABOLIC_LABELS.map((label) => {
    const values = columns.map((col) => history[label][col] ?? "—");
    const delta = columns.length >= 2 ? formatDelta(values[0], values[1]) : "—";
    return { label, values, delta, tone: deltaTone(label, delta) };
  });
}

export function formatHistoryColumns(mode, columns) {
  if (mode === "monthly") return columns.map((c) => c.toUpperCase());
  return columns;
}
