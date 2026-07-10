const { toIsoDateOnly } = require("./healthProgressHelpers");

const ACTIVITY_MULTIPLIERS = [
  { key: "sedentary", label: "Sedentary : little or no exercise", multiplier: 1.2 },
  { key: "lightly_active", label: "Exercise 1 - 3 time/week", multiplier: 1.375 },
  { key: "moderately_active", label: "Exercise 4 - 5 time/week", multiplier: 1.55 },
  { key: "highly_active", label: "Daily Exercise", multiplier: 1.725 },
  { key: "very_active", label: "Intense exercise 6 - 7 times/week", multiplier: 1.9 },
  { key: "extra_active", label: "Very intense exercise daily", multiplier: 2.1 },
];

const METRIC_TYPES = new Set(["bmi", "bmr", "body_fat", "visceral_fat"]);
const HISTORY_METRIC_TYPES = new Set([...METRIC_TYPES, "fatty_liver"]);

function normalizeGender(value) {
  const next = String(value || "").toLowerCase().trim();
  if (next === "male" || next === "m" || next === "man") return "male";
  if (next === "female" || next === "f" || next === "woman" || next === "girl") return "female";
  return "male";
}

function isFemaleGender(value) {
  return normalizeGender(value) === "female";
}

function ageFromDob(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age > 0 ? age : null;
}

function getBmiCategory(value) {
  if (value == null) return { label: "Unknown", color: "#94a3b8" };
  if (value < 18.5) return { label: "Underweight", color: "#60a5fa" };
  if (value < 25) return { label: "Healthy Weight", color: "#22c55e" };
  if (value < 30) return { label: "Overweight", color: "#f59e0b" };
  if (value < 35) return { label: "Obese I", color: "#f97316" };
  if (value < 40) return { label: "Obese II", color: "#ef4444" };
  return { label: "Obese III", color: "#b91c1c" };
}

function computeBmi(heightCm, weightKg) {
  const h = Number(heightCm) / 100;
  const w = Number(weightKg);
  if (!h || !w || h <= 0 || w <= 0) return null;
  return Number((w / (h * h)).toFixed(1));
}

function computeBmr({ gender, age, heightCm, weightKg }) {
  const h = Number(heightCm);
  const w = Number(weightKg);
  const a = Number(age);
  if (!h || !w || !a || h <= 0 || w <= 0 || a <= 0) return null;

  let result;
  if (isFemaleGender(gender)) {
    result = 10 * w + 6.25 * h - 5 * a - 161;
  } else {
    result = 10 * w + 6.25 * h - 5 * a + 5;
  }
  return Math.round(result);
}

function computeTdeeByActivity(bmr) {
  if (!bmr) return [];
  return ACTIVITY_MULTIPLIERS.map((item) => ({
    ...item,
    tdee: Math.round(item.multiplier * bmr),
  }));
}

function resolvePrimaryTdee(bmr, activityLevel) {
  const tiers = computeTdeeByActivity(bmr);
  const key = String(activityLevel || "moderately_active").toLowerCase().trim();
  const match = tiers.find((item) => item.key === key) || tiers[2];
  return {
    activityLevel: match.key,
    tdee: match.tdee,
    tiers,
  };
}

function computeBodyFat({ gender, heightCm, neckCm, waistCm, hipCm }) {
  const h = Number(heightCm);
  const n = Number(neckCm);
  const w = Number(waistCm);
  const hp = Number(hipCm);
  if (!h || !n || !w || h <= 0 || n <= 0 || w <= 0) return null;

  let result;
  if (isFemaleGender(gender)) {
    if (!hp || hp <= 0) return null;
    result =
      495 /
        (1.29579 - 0.35004 * Math.log10(w + hp - n) + 0.221 * Math.log10(h)) -
      450;
  } else {
    result =
      495 / (1.0324 - 0.19077 * Math.log10(w - n) + 0.15456 * Math.log10(h)) -
      450;
  }

  if (!Number.isFinite(result) || result < 0) return null;
  const bodyFatPercent = Number(result.toFixed(1));
  const leanMuscleMassPercent = Number((100 - bodyFatPercent).toFixed(1));
  return { bodyFatPercent, leanMuscleMassPercent };
}

function assessVisceralFatRisk(waistHeightRatio) {
  const ratio = Number(waistHeightRatio);
  if (!Number.isFinite(ratio)) return "Unknown";
  if (ratio < 0.45) return "Excellent";
  if (ratio < 0.5) return "Healthy";
  if (ratio < 0.55) return "Early Accumulation";
  if (ratio < 0.6) return "High Visceral Fat";
  return "Very High Metabolic Risk";
}

function computeVisceralFat({ gender, age, heightCm, waistCm }) {
  const h = Number(heightCm);
  const w = Number(waistCm);
  const a = Number(age);
  if (!h || !w || h <= 0 || w <= 0) return null;

  const waistHeightRatio = Number((w / h).toFixed(2));
  let level;
  if (isFemaleGender(gender)) {
    level = Math.round(waistHeightRatio * 100 + a * 0.15 - 28);
  } else {
    level = Math.round(waistHeightRatio * 100 + a * 0.18 - 30);
  }
  if (level < 1) level = 1;
  if (level > 30) level = 30;

  const visceralFatPercent = Number(((level / 30) * 100).toFixed(1));
  return {
    waistHeightRatio,
    estimatedVisceralFat: level,
    visceralFatPercent,
    riskAssessment: assessVisceralFatRisk(waistHeightRatio),
  };
}

function computeFattyLiverIndex({ bmi, waistCm, triglycerides, ggt }) {
  const b = Number(bmi);
  const wc = Number(waistCm);
  const tg = Number(triglycerides);
  const g = Number(ggt);
  if (!b || !wc || !tg || !g || b <= 0 || wc <= 0 || tg <= 0 || g <= 0) return null;

  const L =
    0.953 * Math.log(tg) +
    0.139 * b +
    0.718 * Math.log(g) +
    0.053 * wc -
    15.745;
  const fli = (100 * Math.exp(L)) / (1 + Math.exp(L));
  if (!Number.isFinite(fli)) return null;
  return Number(fli.toFixed(1));
}

function getFliRiskCategory(fli) {
  const value = Number(fli);
  if (!Number.isFinite(value)) return { label: "Unknown", color: "#94a3b8" };
  if (value < 30) return { label: "Low risk", color: "#22c55e" };
  if (value < 60) return { label: "Indeterminate", color: "#f59e0b" };
  return { label: "High risk", color: "#ef4444" };
}

function buildFattyLiverSnapshot({ bmi, waistCm, triglycerides, ggt }) {
  const fli = computeFattyLiverIndex({ bmi, waistCm, triglycerides, ggt });
  if (fli == null) {
    throw new Error("Unable to calculate Fatty Liver Index from provided values");
  }
  const risk = getFliRiskCategory(fli);
  return {
    metricType: "fatty_liver",
    bmi: Number(bmi),
    waistCm: Number(waistCm),
    triglycerides: Number(triglycerides),
    ggt: Number(ggt),
    fli,
    fliRiskLabel: risk.label,
    fliRiskColor: risk.color,
  };
}

function normalizeMetricType(value) {
  const next = String(value || "").toLowerCase().trim().replace(/-/g, "_");
  if (!METRIC_TYPES.has(next)) {
    throw new Error("metricType must be bmi, bmr, body_fat, or visceral_fat");
  }
  return next;
}

function normalizeMetricTypeFilter(value) {
  const next = String(value || "").toLowerCase().trim().replace(/-/g, "_");
  if (!HISTORY_METRIC_TYPES.has(next)) {
    throw new Error(
      "metricType must be bmi, bmr, body_fat, visceral_fat, or fatty_liver"
    );
  }
  return next;
}

function buildMetricSnapshot(metricType, inputs) {
  const gender = normalizeGender(inputs.gender);
  const age = Number(inputs.age);
  const heightCm = Number(inputs.heightCm);
  const weightKg = inputs.weightKg != null ? Number(inputs.weightKg) : null;
  const neckCm = inputs.neckCm != null ? Number(inputs.neckCm) : null;
  const waistCm = inputs.waistCm != null ? Number(inputs.waistCm) : null;
  const hipCm = inputs.hipCm != null ? Number(inputs.hipCm) : null;
  const activityLevel = inputs.activityLevel || "moderately_active";
  const bodyFatGoal = inputs.bodyFatGoal != null ? Number(inputs.bodyFatGoal) : null;

  const base = {
    metricType,
    gender,
    age,
    heightCm,
    weightKg,
    neckCm,
    waistCm,
    hipCm,
    activityLevel,
    bodyFatGoal,
  };

  if (metricType === "bmi") {
    if (!heightCm || !weightKg) throw new Error("heightCm and weightKg are required for BMI");
    const bmi = computeBmi(heightCm, weightKg);
    if (bmi == null) throw new Error("Unable to calculate BMI from provided values");
    const category = getBmiCategory(bmi);
    return {
      ...base,
      bmi,
      bmiCategory: category.label,
      bmiCategoryColor: category.color,
    };
  }

  if (metricType === "bmr") {
    if (!heightCm || !weightKg || !age) {
      throw new Error("age, heightCm, and weightKg are required for BMR");
    }
    const bmr = computeBmr({ gender, age, heightCm, weightKg });
    if (bmr == null) throw new Error("Unable to calculate BMR from provided values");
    const tdeeInfo = resolvePrimaryTdee(bmr, activityLevel);
    return {
      ...base,
      bmr,
      tdee: tdeeInfo.tdee,
      tdeeTiers: tdeeInfo.tiers,
    };
  }

  if (metricType === "body_fat") {
    if (!heightCm || !neckCm || !waistCm) {
      throw new Error("heightCm, neckCm, and waistCm are required for body fat");
    }
    if (!isFemaleGender(gender) && waistCm <= neckCm) {
      throw new Error("Waist must be greater than neck circumference");
    }
    if (isFemaleGender(gender)) {
      if (!hipCm || hipCm <= 0) {
        throw new Error("hipCm is required for female body fat calculation");
      }
      if (waistCm + hipCm <= neckCm) {
        throw new Error("Waist + hip must be greater than neck circumference");
      }
    }
    const bodyFat = computeBodyFat({ gender, heightCm, neckCm, waistCm, hipCm });
    if (!bodyFat) {
      throw new Error(
        "Unable to calculate body fat from provided values. Verify neck and waist measurements and that values are in centimeters."
      );
    }
    return {
      ...base,
      bodyFatPercent: bodyFat.bodyFatPercent,
      leanMuscleMassPercent: bodyFat.leanMuscleMassPercent,
    };
  }

  if (metricType === "visceral_fat") {
    if (!heightCm || !waistCm || !age) {
      throw new Error("age, heightCm, and waistCm are required for visceral fat");
    }
    const visceral = computeVisceralFat({ gender, age, heightCm, waistCm });
    if (!visceral) throw new Error("Unable to calculate visceral fat from provided values");
    return {
      ...base,
      waistHeightRatio: visceral.waistHeightRatio,
      estimatedVisceralFat: visceral.estimatedVisceralFat,
      visceralFatPercent: visceral.visceralFatPercent,
      visceralFatRisk: visceral.riskAssessment,
    };
  }

  throw new Error("Unsupported metricType");
}

function dedupeMetricLogsByDate(logs) {
  const byDate = new Map();

  for (const log of logs) {
    const dateKey = toIsoDateOnly(log.recordedAt) || log.id;
    const existing = byDate.get(dateKey);
    if (!existing) {
      byDate.set(dateKey, log);
      continue;
    }

    const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
    const itemTime = new Date(log.updatedAt || log.createdAt || 0).getTime();
    if (itemTime >= existingTime) {
      byDate.set(dateKey, log);
    }
  }

  return Array.from(byDate.values()).sort(
    (a, b) => new Date(b.recordedAt || 0) - new Date(a.recordedAt || 0)
  );
}

function buildDashboardFromLogs(logs, { formatChartDate }) {
  const byType = {
    bmi: [],
    bmr: [],
    body_fat: [],
    visceral_fat: [],
    fatty_liver: [],
  };

  for (const log of logs) {
    const type = log.metricType;
    if (byType[type]) byType[type].push(log);
  }

  const latest = (type) => dedupeMetricLogsByDate(byType[type])[0] || null;

  const mapBmiHistory = (items) =>
    items.map((log) => ({
      id: log.id,
      value: log.bmi,
      category: log.bmiCategory,
      recordedAt: log.recordedAt,
      chartDate: formatChartDate(log.recordedAt),
    }));

  const mapBmrHistory = (items) =>
    items.map((log) => ({
      id: log.id,
      bmr: log.bmr,
      tdee: log.tdee,
      recordedAt: log.recordedAt,
      chartDate: formatChartDate(log.recordedAt),
    }));

  const mapBodyFatHistory = (items) =>
    items.map((log) => ({
      id: log.id,
      bodyFatPercent: log.bodyFatPercent,
      leanMuscleMassPercent: log.leanMuscleMassPercent,
      bodyFatGoal: log.bodyFatGoal,
      recordedAt: log.recordedAt,
      chartDate: formatChartDate(log.recordedAt),
    }));

  const mapVisceralHistory = (items) =>
    items.map((log) => ({
      id: log.id,
      waistHeightRatio: log.waistHeightRatio,
      estimatedVisceralFat: log.estimatedVisceralFat,
      visceralFatPercent: log.visceralFatPercent,
      visceralFatRisk: log.visceralFatRisk,
      recordedAt: log.recordedAt,
      chartDate: formatChartDate(log.recordedAt),
    }));

  const mapFattyLiverHistory = (items) =>
    items.map((log) => ({
      id: log.id,
      value: log.fli,
      fli: log.fli,
      triglycerides: log.triglycerides,
      ggt: log.ggt,
      bmi: log.bmi,
      waistCm: log.waistCm,
      riskLabel: log.fliRiskLabel,
      riskColor: log.fliRiskColor,
      recordedAt: log.recordedAt,
      chartDate: formatChartDate(log.recordedAt),
    }));

  const bmiLatest = latest("bmi");
  const bmrLatest = latest("bmr");
  const bodyFatLatest = latest("body_fat");
  const visceralLatest = latest("visceral_fat");
  const fattyLiverLatest = latest("fatty_liver");

  return {
    bmi: {
      current: bmiLatest
        ? {
            value: bmiLatest.bmi,
            category: bmiLatest.bmiCategory,
            categoryColor: bmiLatest.bmiCategoryColor,
            recordedAt: bmiLatest.recordedAt,
          }
        : null,
      history: mapBmiHistory(dedupeMetricLogsByDate(byType.bmi)),
    },
    bmr: {
      current: bmrLatest
        ? {
            value: bmrLatest.bmr,
            tdeeTiers: bmrLatest.tdeeTiers || [],
            recordedAt: bmrLatest.recordedAt,
          }
        : null,
      history: mapBmrHistory(dedupeMetricLogsByDate(byType.bmr)),
    },
    tdee: {
      current: bmrLatest
        ? {
            value: bmrLatest.tdee,
            activityLevel: bmrLatest.activityLevel,
            recordedAt: bmrLatest.recordedAt,
          }
        : null,
      history: mapBmrHistory(dedupeMetricLogsByDate(byType.bmr)).map((item) => ({
        id: item.id,
        value: item.tdee,
        recordedAt: item.recordedAt,
        chartDate: item.chartDate,
      })),
    },
    bodyFat: {
      current: bodyFatLatest
        ? {
            bodyFatPercent: bodyFatLatest.bodyFatPercent,
            leanMuscleMassPercent: bodyFatLatest.leanMuscleMassPercent,
            goal: bodyFatLatest.bodyFatGoal,
            recordedAt: bodyFatLatest.recordedAt,
          }
        : null,
      history: mapBodyFatHistory(dedupeMetricLogsByDate(byType.body_fat)),
    },
    visceralFat: {
      current: visceralLatest
        ? {
            waistHeightRatio: visceralLatest.waistHeightRatio,
            estimatedVisceralFat: visceralLatest.estimatedVisceralFat,
            visceralFatPercent: visceralLatest.visceralFatPercent,
            riskAssessment: visceralLatest.visceralFatRisk,
            recordedAt: visceralLatest.recordedAt,
          }
        : null,
      history: mapVisceralHistory(dedupeMetricLogsByDate(byType.visceral_fat)),
    },
    fattyLiver: {
      current: fattyLiverLatest
        ? {
            value: fattyLiverLatest.fli,
            fli: fattyLiverLatest.fli,
            triglycerides: fattyLiverLatest.triglycerides,
            ggt: fattyLiverLatest.ggt,
            bmi: fattyLiverLatest.bmi,
            waistCm: fattyLiverLatest.waistCm,
            riskLabel: fattyLiverLatest.fliRiskLabel,
            riskColor: fattyLiverLatest.fliRiskColor,
            recordedAt: fattyLiverLatest.recordedAt,
          }
        : null,
      history: mapFattyLiverHistory(dedupeMetricLogsByDate(byType.fatty_liver)),
    },
  };
}

module.exports = {
  METRIC_TYPES,
  ACTIVITY_MULTIPLIERS,
  normalizeGender,
  isFemaleGender,
  ageFromDob,
  getBmiCategory,
  computeBmi,
  computeBmr,
  computeTdeeByActivity,
  resolvePrimaryTdee,
  computeBodyFat,
  assessVisceralFatRisk,
  computeVisceralFat,
  computeFattyLiverIndex,
  getFliRiskCategory,
  buildFattyLiverSnapshot,
  normalizeMetricType,
  normalizeMetricTypeFilter,
  buildMetricSnapshot,
  dedupeMetricLogsByDate,
  buildDashboardFromLogs,
};
