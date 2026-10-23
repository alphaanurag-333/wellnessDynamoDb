const { toNumberOrNull } = require("../../utils/healthProgressHelpers");
const { buildFattyLiverSnapshot } = require("../../utils/metabolicMetricsCalculations");
const { extractFattyLiverLabsFromAnalysis } = require("../../utils/fattyLiverLabMarkers");
const { upsertMetabolicMetricLog } = require("../../models/healthProgressMetabolicMetricModel");
const { listUserLabReportsByUserId } = require("../../models/userLabReportModel");

function reportSortTime(report) {
  const date = new Date(report?.reportDate || report?.aiAnalysedAt || report?.createdAt || 0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function latestAnalysedLabReport(reports) {
  return (reports || [])
    .filter((report) => report?.aiStatus === "analysed" && report?.aiAnalysis?.panels?.length)
    .sort((a, b) => reportSortTime(b) - reportSortTime(a))[0] || null;
}

function measurementTimestamp(row) {
  const parsed = new Date(row?.recordedAt || row?.createdAt || 0);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function bmiFromMeasurement(row) {
  const heightCm = toNumberOrNull(row?.heightCm);
  const weightKg = toNumberOrNull(row?.weightKg);
  if (!heightCm || !weightKg) return null;
  return Number((weightKg / (heightCm / 100) ** 2).toFixed(1));
}

function resolveBmiAndWaist({ metabolicLogs, measurements, referenceDate } = {}) {
  const refTime = referenceDate ? new Date(referenceDate).getTime() : Date.now();
  const refValid = Number.isFinite(refTime) && refTime > 0;

  const sortedMeasurements = [...(measurements || [])].sort(
    (a, b) => measurementTimestamp(b) - measurementTimestamp(a)
  );

  let bestRow = null;
  let bestDistance = Infinity;
  for (const row of sortedMeasurements) {
    const waist = toNumberOrNull(row?.waistCm);
    const bmi = bmiFromMeasurement(row);
    if (waist == null && bmi == null) continue;
    const distance = refValid
      ? Math.abs(measurementTimestamp(row) - refTime)
      : -measurementTimestamp(row);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestRow = row;
    }
  }

  if (bestRow) {
    return {
      bmi: bmiFromMeasurement(bestRow),
      waistCm: toNumberOrNull(bestRow?.waistCm),
    };
  }

  const logs = metabolicLogs || [];
  const latestBmi = logs.find((log) => log.metricType === "bmi" && log.bmi != null);
  const latestVisceral = logs.find((log) => log.metricType === "visceral_fat" && log.waistCm != null);
  return {
    bmi: latestBmi?.bmi ?? null,
    waistCm: latestVisceral?.waistCm ?? null,
  };
}

function fattyLiverRecordedAtForReport(report) {
  const raw = report?.reportDate || report?.aiAnalysedAt || report?.createdAt;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

function latestFattyLiverLog(logs) {
  return (logs || []).find((log) => log.metricType === "fatty_liver") || null;
}

function shouldRefreshFattyLiver({ latestLog, snapshot }) {
  if (!snapshot) return false;
  if (!latestLog) return true;
  const storedFli = Number(latestLog.fli);
  if (!Number.isFinite(storedFli) || Math.abs(storedFli - snapshot.fli) > 0.05) {
    return true;
  }
  const fields = ["bmi", "waistCm", "triglycerides", "ggt"];
  return fields.some((key) => Number(latestLog[key]) !== Number(snapshot[key]));
}

/**
 * Upserts Fatty Liver Index when the latest analysed lab report has TG + GGT
 * and BMI + waist are available from body measurements or metabolic logs.
 */
async function syncFattyLiverMetricFromLatestLabReport(userId, { metabolicLogs, measurements } = {}) {
  if (!userId) return null;

  const reports = await listUserLabReportsByUserId(userId);
  const report = latestAnalysedLabReport(reports);
  if (!report) return null;

  const existing = latestFattyLiverLog(metabolicLogs);

  const { triglycerides, ggt } = extractFattyLiverLabsFromAnalysis(report.aiAnalysis);
  if (triglycerides == null || ggt == null) return existing || null;

  const referenceDate = report.reportDate || report.aiAnalysedAt || report.createdAt;
  const { bmi, waistCm } = resolveBmiAndWaist({ metabolicLogs, measurements, referenceDate });
  if (bmi == null || waistCm == null) return existing || null;

  let snapshot;
  try {
    snapshot = buildFattyLiverSnapshot({ bmi, waistCm, triglycerides, ggt });
  } catch {
    return existing || null;
  }

  if (!shouldRefreshFattyLiver({ latestLog: existing, snapshot })) {
    return existing;
  }

  try {
    return await upsertMetabolicMetricLog({
      userId,
      ...snapshot,
      recordedAt: fattyLiverRecordedAtForReport(report),
    });
  } catch (err) {
    console.error("Fatty liver auto-sync failed:", err?.message || err);
    return existing || null;
  }
}

module.exports = {
  syncFattyLiverMetricFromLatestLabReport,
  extractFattyLiverLabsFromAnalysis,
  resolveBmiAndWaist,
};
