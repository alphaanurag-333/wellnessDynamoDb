/** Mirrors Backend/utils/proteinGoalCalculations.js — keep formulas in sync. */

const PROTEIN_GOAL_ACTIVITY_MULTIPLIERS = {
  sedentary: 1,
  lightly_active: 1.2,
  moderately_active: 1.5,
  highly_active: 2,
  very_active: 2,
  extra_active: 2,
};

const PROTEIN_GOAL_DEFAULT_ACTIVITY = "moderately_active";

export function normalizeActivityLevelKey(value) {
  if (value == null || value === "") return PROTEIN_GOAL_DEFAULT_ACTIVITY;
  const key = String(value).toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (Object.prototype.hasOwnProperty.call(PROTEIN_GOAL_ACTIVITY_MULTIPLIERS, key)) {
    return key;
  }
  return PROTEIN_GOAL_DEFAULT_ACTIVITY;
}

export function resolveProteinGoalGm(weightKg, activityLevel) {
  const w = Number(weightKg);
  if (!Number.isFinite(w) || w <= 0) return null;
  const key = normalizeActivityLevelKey(activityLevel);
  const mult = PROTEIN_GOAL_ACTIVITY_MULTIPLIERS[key];
  return Number((w * mult).toFixed(1));
}

export function latestLogWithField(logs, field) {
  const sorted = [...(logs || [])].sort((a, b) =>
    String(b.recordedAt || b.updatedAt || b.createdAt || "").localeCompare(
      String(a.recordedAt || a.updatedAt || a.createdAt || ""),
    ),
  );
  for (const log of sorted) {
    if (log?.[field] != null && Number.isFinite(Number(log[field]))) {
      return Number(log[field]);
    }
  }
  return null;
}

export function latestBodyMeasurement(measurements = []) {
  const sorted = [...(measurements || [])].filter(Boolean).sort((a, b) =>
    String(b.recordedAt || b.updatedAt || b.createdAt || "").localeCompare(
      String(a.recordedAt || a.updatedAt || a.createdAt || ""),
    ),
  );
  return sorted[0] || null;
}

export function resolveProteinGoalInputs(bodyMeasurement, metabolicLogs, latestFieldFn = latestLogWithField) {
  let weightKg = null;
  let activityLevel = null;

  if (bodyMeasurement) {
    const w = Number(bodyMeasurement.weightKg);
    if (Number.isFinite(w) && w > 0) weightKg = w;
    if (bodyMeasurement.activityLevel != null && String(bodyMeasurement.activityLevel).trim() !== "") {
      activityLevel = bodyMeasurement.activityLevel;
    }
  }

  if (weightKg == null && typeof latestFieldFn === "function") {
    weightKg = latestFieldFn(metabolicLogs, "weightKg");
  }

  return {
    weightKg,
    activityLevel,
    proteinGoalGm: resolveProteinGoalGm(weightKg, activityLevel),
  };
}

export function proteinGoalFromBodyAnalytics(bodyAnalytics) {
  const measurement = latestBodyMeasurement(bodyAnalytics?.measurements);
  const { proteinGoalGm } = resolveProteinGoalInputs(
    measurement,
    bodyAnalytics?.metabolicMetrics,
  );
  return proteinGoalGm;
}
