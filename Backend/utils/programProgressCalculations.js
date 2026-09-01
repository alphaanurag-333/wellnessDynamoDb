const {
  PAID_ONBOARDING_STATUS_KEYS,
  normalizePaidOnboardingStepStatus,
  getNextIncompleteStep,
  countCompletedSteps,
  computePaidOnboardingCompleted,
} = require("./paidOnboardingHelpers");
const { normalizeUserTier } = require("../models/userAssignmentLogic");

const ONBOARDING_STEP_LABELS = {
  personalDetails: "Personal details",
  bodyAnalytics: "Body analytics",
  internalParameter: "Internal parameters",
  launch: "LAUNCH",
  rca: "RCA",
  reportsBriefing: "Reports briefing",
  hap: "HAP",
  protocolSettings: "Protocol settings",
  commitmentLetter: "Commitment letter",
  programInitiation: "Program initiation",
};

const FAT_DOWN_MIN_KG = 6;
const FAT_DOWN_MAX_KG = 10;
const FAT_NEAR_TARGET_KG = 2;
const DEFAULT_FAT_LOSS_GOAL_KG = 10;
const TARGET_BMI = 22.5;
const HBA1C_DROP_POINTS = 2;
const HBA1C_BELOW = 6.5;
const HBA1C_MIN = 4;
const HBA1C_MAX = 15;

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toKg(weight, unit) {
  const n = toNumberOrNull(weight);
  if (n == null) return null;
  const next = String(unit || "kg").toLowerCase().trim();
  if (next === "lb" || next === "lbs" || next === "pound" || next === "pounds") {
    return Math.round(n * 0.453592 * 10) / 10;
  }
  return Math.round(n * 10) / 10;
}

function stampOf(row) {
  return String(row?.recordedAt || row?.createdAt || row?.updatedAt || "");
}

function sortByStampAsc(rows) {
  return [...(rows || [])].sort((a, b) => stampOf(a).localeCompare(stampOf(b)));
}

function daysAgo(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function formatKg(value) {
  if (value == null) return "—";
  const n = round1(value);
  return `${Number.isInteger(n) ? n.toFixed(0) : n.toFixed(1)} kg`;
}

function formatA1c(value) {
  if (value == null) return "—";
  return String(round1(value));
}

function formatChangeKg(lost) {
  const n = round1(lost);
  const abs = Math.abs(n);
  const body = Number.isInteger(abs) ? abs.toFixed(0) : abs.toFixed(1);
  return n > 0 ? `−${body} kg` : n < 0 ? `+${body} kg` : "0 kg";
}

function formatChangePts(drop) {
  const n = round1(drop);
  const abs = Math.abs(n);
  const body = Number.isInteger(abs) ? abs.toFixed(0) : abs.toFixed(1);
  return n > 0 ? `−${body} pts` : n < 0 ? `+${body} pts` : "0 pts";
}

function isHealClient(user) {
  return normalizeUserTier(user?.userTier) === "heal";
}

function onboardingState(user) {
  const days = daysAgo(user?.lastActiveAt || user?.updatedAt || user?.healPaidAt || user?.createdAt);
  if (days == null) return { state: "In progress", stateTone: "good" };
  if (days <= 0) return { state: "today", stateTone: "good" };
  if (days === 1) return { state: "1 day idle", stateTone: "warn" };
  if (days >= 4) return { state: `${days} days idle`, stateTone: "danger" };
  return { state: `${days} days idle`, stateTone: "warn" };
}

function buildOnboardingRow(user, coachName = "Not assigned") {
  const status = normalizePaidOnboardingStepStatus(user?.paidOnboardingStepStatus);
  const completed = Boolean(user?.paidOnboardingCompleted) || computePaidOnboardingCompleted(status);
  const done = countCompletedSteps(status);
  const nextKey = getNextIncompleteStep(status);
  const total = PAID_ONBOARDING_STATUS_KEYS.length;
  const nextLabel = nextKey ? ONBOARDING_STEP_LABELS[nextKey] || nextKey : "Complete";
  const stepN = nextKey ? PAID_ONBOARDING_STATUS_KEYS.indexOf(nextKey) + 1 : total;
  const readyToLaunch = nextKey === "programInitiation";
  const idle = onboardingState(user);

  return {
    userId: String(user?.id || user?._id || "").trim() || null,
    name: String(user?.name || "Client").trim() || "Client",
    coach: coachName || "Not assigned",
    step: `Step ${stepN} of ${total} · ${nextLabel}`,
    state: readyToLaunch ? "Ready to launch" : idle.state,
    stateTone: readyToLaunch ? "good" : idle.stateTone,
    done,
    total,
    completed,
  };
}

function isHealClientInOnboarding(user) {
  if (!isHealClient(user)) return false;
  const status = normalizePaidOnboardingStepStatus(user?.paidOnboardingStepStatus);
  if (Boolean(user?.paidOnboardingCompleted) || computePaidOnboardingCompleted(status)) return false;
  return true;
}

function idealWeightKg(heightCm) {
  const height = toNumberOrNull(heightCm);
  if (!height || height < 100 || height > 250) return null;
  const meters = height / 100;
  return round1(TARGET_BMI * meters * meters);
}

function resolveGoalWeightKg(startKg, heightCm) {
  const defaultGoal = round1(startKg - DEFAULT_FAT_LOSS_GOAL_KG);
  const ideal = idealWeightKg(heightCm);
  // Dashboard buckets are based on a ~10 kg program target. Use BMI-ideal only when
  // it is a *smaller* loss so we do not under-count people already near a healthy weight.
  if (ideal != null && ideal > defaultGoal && startKg - ideal >= 3) {
    return round1(ideal);
  }
  return defaultGoal;
}

function classifyFatLoss({ startKg, currentKg, heightCm }) {
  const start = toNumberOrNull(startKg);
  const current = toNumberOrNull(currentKg);
  if (start == null || current == null) {
    return { down610: false, halfway: false, neartarget: false, lost: null, goalKg: null };
  }
  const lost = round1(start - current);
  const goalKg = resolveGoalWeightKg(start, heightCm);
  const toGo = round1(current - goalKg);
  const targetDrop = Math.max(0.1, start - goalKg);
  return {
    down610: lost >= FAT_DOWN_MIN_KG && lost <= FAT_DOWN_MAX_KG,
    halfway: lost >= targetDrop * 0.5 && toGo > FAT_NEAR_TARGET_KG,
    neartarget: lost > 0 && toGo <= FAT_NEAR_TARGET_KG,
    lost,
    goalKg,
  };
}

function looksLikeA1cSeries(values) {
  const nums = (values || []).map(toNumberOrNull).filter((n) => n != null);
  if (!nums.length) return false;
  return nums.every((n) => n >= HBA1C_MIN && n <= HBA1C_MAX);
}

function classifyHba1c({ start, current }) {
  const first = toNumberOrNull(start);
  const last = toNumberOrNull(current);
  if (first == null || last == null) {
    return { down2: false, under65: false, drop: null };
  }
  if (!looksLikeA1cSeries([first, last])) {
    return { down2: false, under65: false, drop: null };
  }
  const drop = round1(first - last);
  return {
    down2: drop >= HBA1C_DROP_POINTS,
    under65: last < HBA1C_BELOW,
    drop,
  };
}

function firstAndLastNumeric(rows, readValue) {
  const sorted = sortByStampAsc(rows).filter((row) => readValue(row) != null);
  if (!sorted.length) return { start: null, current: null, startRow: null, currentRow: null };
  const startRow = sorted[0];
  const currentRow = sorted[sorted.length - 1];
  return {
    start: readValue(startRow),
    current: readValue(currentRow),
    startRow,
    currentRow,
  };
}

function metricRow({ user, coachName, start, current, change }) {
  return {
    userId: String(user?.id || user?._id || "").trim() || null,
    name: String(user?.name || "Client").trim() || "Client",
    coach: coachName || "Not assigned",
    start,
    current,
    change,
  };
}

function normalizeMarkerName(name) {
  return String(name || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function isHba1cMarker(name) {
  const normalized = normalizeMarkerName(name);
  return (
    normalized === "hba1c"
    || normalized.includes("hba1c")
    || normalized.includes("glycated hemoglobin")
    || normalized.includes("glycated haemoglobin")
    || /\ba1c\b/.test(normalized)
  );
}

function parseMarkerNumericValue(raw) {
  if (raw == null || raw === "" || raw === "—") return null;
  const match = String(raw).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  return toNumberOrNull(match[0]);
}

function extractHba1cFromLabReport(report) {
  if (!report || normalizeAiStatus(report.aiStatus) !== "analysed") return null;
  const panels = report?.aiAnalysis?.panels;
  if (!Array.isArray(panels) || !panels.length) return null;

  for (const panel of panels) {
    for (const row of panel?.rows || []) {
      if (!isHba1cMarker(row?.name)) continue;
      const value = parseMarkerNumericValue(row?.value);
      if (value == null || !looksLikeA1cSeries([value])) continue;
      const recordedAt = String(
        report.reportDate || report.aiAnalysedAt || report.createdAt || "",
      ).trim();
      if (!recordedAt) continue;
      return { value, recordedAt };
    }
  }
  return null;
}

function normalizeAiStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  return status === "analysed" ? "analysed" : status;
}

function labReportsToHba1cReadings(reports) {
  const readings = [];
  for (const report of reports || []) {
    const reading = extractHba1cFromLabReport(report);
    if (reading) readings.push(reading);
  }
  return readings.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
}

function glucoseLogsToHba1cReadings(logs) {
  const values = (logs || []).map((row) => toNumberOrNull(row.value)).filter((n) => n != null);
  if (!looksLikeA1cSeries(values)) return [];
  return sortByStampAsc(logs)
    .map((row) => ({
      value: toNumberOrNull(row.value),
      recordedAt: stampOf(row),
    }))
    .filter((row) => row.value != null && row.recordedAt);
}

function mergeHba1cReadings(glucoseLogs, labReports) {
  return [...glucoseLogsToHba1cReadings(glucoseLogs), ...labReportsToHba1cReadings(labReports)].sort(
    (a, b) => a.recordedAt.localeCompare(b.recordedAt),
  );
}

module.exports = {
  ONBOARDING_STEP_LABELS,
  FAT_DOWN_MIN_KG,
  FAT_DOWN_MAX_KG,
  FAT_NEAR_TARGET_KG,
  DEFAULT_FAT_LOSS_GOAL_KG,
  HBA1C_DROP_POINTS,
  HBA1C_BELOW,
  toNumberOrNull,
  toKg,
  stampOf,
  sortByStampAsc,
  daysAgo,
  formatKg,
  formatA1c,
  formatChangeKg,
  formatChangePts,
  isHealClient,
  isHealClientInOnboarding,
  buildOnboardingRow,
  idealWeightKg,
  resolveGoalWeightKg,
  classifyFatLoss,
  looksLikeA1cSeries,
  classifyHba1c,
  firstAndLastNumeric,
  metricRow,
  isHba1cMarker,
  parseMarkerNumericValue,
  extractHba1cFromLabReport,
  labReportsToHba1cReadings,
  glucoseLogsToHba1cReadings,
  mergeHba1cReadings,
};
