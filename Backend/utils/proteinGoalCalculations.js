const PROTEIN_GOAL_ACTIVITY_MULTIPLIERS = {
  sedentary: 1,
  lightly_active: 1.2,
  moderately_active: 1.5,
  highly_active: 2,
  very_active: 2,
  extra_active: 2,
};

const PROTEIN_GOAL_DEFAULT_ACTIVITY = "moderately_active";

function normalizeActivityLevelKey(value) {
  if (value == null || value === "") return PROTEIN_GOAL_DEFAULT_ACTIVITY;
  const key = String(value).toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (Object.prototype.hasOwnProperty.call(PROTEIN_GOAL_ACTIVITY_MULTIPLIERS, key)) {
    return key;
  }
  return PROTEIN_GOAL_DEFAULT_ACTIVITY;
}

function resolveProteinGoalGm(weightKg, activityLevel) {
  const w = Number(weightKg);
  if (!Number.isFinite(w) || w <= 0) return null;
  const key = normalizeActivityLevelKey(activityLevel);
  const mult = PROTEIN_GOAL_ACTIVITY_MULTIPLIERS[key];
  return Number((w * mult).toFixed(1));
}

function resolveProteinGoalInputs(bodyMeasurement, metabolicLogs, latestLogWithField) {
  let weightKg = null;
  let activityLevel = null;

  if (bodyMeasurement) {
    const w = Number(bodyMeasurement.weightKg);
    if (Number.isFinite(w) && w > 0) weightKg = w;
    if (bodyMeasurement.activityLevel != null && String(bodyMeasurement.activityLevel).trim() !== "") {
      activityLevel = bodyMeasurement.activityLevel;
    }
  }

  if (weightKg == null && typeof latestLogWithField === "function") {
    weightKg = latestLogWithField(metabolicLogs, "weightKg");
  }

  return {
    weightKg,
    activityLevel,
    proteinGoalGm: resolveProteinGoalGm(weightKg, activityLevel),
  };
}

module.exports = {
  PROTEIN_GOAL_ACTIVITY_MULTIPLIERS,
  PROTEIN_GOAL_DEFAULT_ACTIVITY,
  normalizeActivityLevelKey,
  resolveProteinGoalGm,
  resolveProteinGoalInputs,
};
