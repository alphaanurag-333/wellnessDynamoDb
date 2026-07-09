const AppError = require("../utils/AppError");
const { toNumberOrNull } = require("../utils/healthProgressHelpers");
const {
  buildFattyLiverSnapshot,
} = require("../utils/metabolicMetricsCalculations");
const {
  upsertMetabolicMetricLog,
  listAllMetabolicMetricLogsByUser,
  toPublicMetabolicMetricLog,
} = require("../models/healthProgressMetabolicMetricModel");

function parseRecordedAt(body) {
  const raw = body?.recordedAt ?? body?.recorded_at;
  if (!raw) return new Date().toISOString();
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError("recordedAt must be a valid date", 400);
  }
  return parsed.toISOString();
}

async function resolveFattyLiverInputs(userId, body = {}) {
  const logs = await listAllMetabolicMetricLogsByUser(userId, { limit: 200 });
  const latestBmi = logs.find((log) => log.metricType === "bmi");
  const latestVisceral = logs.find((log) => log.metricType === "visceral_fat");

  const triglycerides = toNumberOrNull(body.triglycerides ?? body.tg);
  const ggt = toNumberOrNull(body.ggt);
  const bmi = toNumberOrNull(body.bmi) ?? latestBmi?.bmi;
  const waistCm =
    toNumberOrNull(body.waistCm ?? body.waist_cm) ?? latestVisceral?.waistCm;

  if (triglycerides == null || ggt == null) {
    throw new AppError("triglycerides and ggt are required", 400);
  }
  if (bmi == null || waistCm == null) {
    throw new AppError(
      "bmi and waistCm are required. Enter them manually or ensure the user has BMI and visceral fat logs.",
      400
    );
  }

  return { bmi, waistCm, triglycerides, ggt };
}

async function createFattyLiverMetricForUser({
  userId,
  body,
  enteredByCoachId,
}) {
  const inputs = await resolveFattyLiverInputs(userId, body);

  let snapshot;
  try {
    snapshot = buildFattyLiverSnapshot(inputs);
  } catch (err) {
    throw new AppError(err.message, 400);
  }

  let log;
  try {
    log = await upsertMetabolicMetricLog({
      userId,
      ...snapshot,
      enteredByCoachId,
      recordedAt: parseRecordedAt(body),
    });
  } catch (err) {
    if (err?.name === "ValidationError") {
      throw new AppError(err.message, 400);
    }
    throw err;
  }

  return toPublicMetabolicMetricLog(log);
}

module.exports = {
  resolveFattyLiverInputs,
  createFattyLiverMetricForUser,
};
