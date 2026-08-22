/**
 * Aggregates client "At a Glance" payload for Admin / staff console.
 * Soft-fails per source so Seek and incomplete Heal profiles still return a usable shell.
 */
const { getUserById } = require("../models/userModel");
const {
  getLatestBodyMeasurementForUser,
} = require("../models/userBodyMeasurementModel");
const {
  listAllMetabolicMetricLogsByUser,
} = require("../models/healthProgressMetabolicMetricModel");
const { buildDashboardFromLogs, ageFromDob } = require("../utils/metabolicMetricsCalculations");
const { formatChartDate } = require("../utils/healthProgressHelpers");
const { getUserWaterHistory } = require("../models/waterTrackingModel");
const { getUserStepsHistory } = require("../models/stepsTrackingModel");
const { getUserMealSummary } = require("../models/mealTrackingModel");
const {
  getSettings: getDrfSettings,
  listDayLogsBetween,
  listCatalogWithSettings,
} = require("../models/dailyReflectionModel");
const {
  getLatestUserPrakrutiAssessmentByUserId,
  enrichAssessmentPublic,
} = require("../models/userPrakrutiAssessmentModel");
const { listUserLaunchAssessmentsByUserId } = require("../models/userLaunchAssessmentModel");
const {
  listUserSupplementDosagesByUserId,
} = require("../models/userSupplementDosageModel");
const {
  listWeightLogsByUser,
  toPublicWeightLog,
} = require("../models/healthProgressWeightModel");
const { todayDateOnly, addDaysDateOnly, isValidDateOnly } = require("../utils/dateOnly");
const { normalizeUserTier } = require("../models/userAssignmentLogic");
const { prakrutiTypeLabel } = require("../utils/prakrutiConstants");

const EMPTY = "—";

function safe(promise) {
  return promise.then((value) => ({ ok: true, value })).catch((error) => ({
    ok: false,
    error: error?.message || String(error),
  }));
}

function formatNumber(value, digits = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return digits > 0 ? Number(n.toFixed(digits)) : Math.round(n);
}

function formatWithCommas(value) {
  const n = formatNumber(value);
  if (n == null) return EMPTY;
  return n.toLocaleString("en-IN");
}

function pctOf(value, goal) {
  const v = Number(value);
  const g = Number(goal);
  if (!Number.isFinite(v) || !Number.isFinite(g) || g <= 0) return 0;
  return Math.round((v / g) * 100);
}

function relativeDayLabel(date, today) {
  if (!date || !today) return date || EMPTY;
  if (date === today) return "Today";
  const yesterday = addDaysDateOnly(today, -1);
  if (date === yesterday) return "Yesterday";
  let days = 0;
  let cursor = date;
  while (cursor < today && days < 14) {
    const next = addDaysDateOnly(cursor, 1);
    if (!next || next === cursor) break;
    cursor = next;
    days += 1;
  }
  if (days === 1) return "Yesterday";
  if (days > 1) return `${days} days ago`;
  return date;
}

function shortDateLabel(isoDate) {
  if (!isValidDateOnly(isoDate)) return EMPTY;
  const [y, m, d] = isoDate.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${months[m - 1]}`;
}

function daysBetween(start, end) {
  if (!isValidDateOnly(start) || !isValidDateOnly(end)) return null;
  const a = new Date(`${start}T00:00:00.000Z`).getTime();
  const b = new Date(`${end}T00:00:00.000Z`).getTime();
  return Math.round((b - a) / 86400000);
}

function buildMetricBars(historyValues, count = 5) {
  const values = (historyValues || []).slice(-count);
  while (values.length < count) values.unshift(0);
  const max = Math.max(...values, 1);
  return values.map((v) => Math.max(0, Math.round((Number(v) || 0) / max * 100)));
}

function buildMetricRecords(history, today, valueFormatter) {
  return (history || []).slice(-5).map((row) => {
    const when = relativeDayLabel(row.date, today);
    return {
      when,
      value: valueFormatter(row.value),
      today: row.date === today,
    };
  });
}

function latestLogWithField(logs, field) {
  const sorted = [...(logs || [])].sort((a, b) =>
    String(b.recordedAt || "").localeCompare(String(a.recordedAt || ""))
  );
  for (const log of sorted) {
    if (log?.[field] != null && Number.isFinite(Number(log[field]))) {
      return Number(log[field]);
    }
  }
  return null;
}

function buildMetabolicSnapshot({ user, bodyMeasurement, dashboard, metabolicLogs }) {
  const age = ageFromDob(user?.dob);
  const heightResolved =
    bodyMeasurement?.heightCm ??
    latestLogWithField(metabolicLogs, "heightCm");
  const weightResolved =
    bodyMeasurement?.weightKg ??
    latestLogWithField(metabolicLogs, "weightKg");

  const bmr = dashboard?.bmr?.current?.value ?? null;
  const tdee = dashboard?.tdee?.current?.value ?? null;
  const bodyFat = dashboard?.bodyFat?.current?.bodyFatPercent ?? null;
  const leanMass = dashboard?.bodyFat?.current?.leanMuscleMassPercent ?? null;
  const visceral = dashboard?.visceralFat?.current?.visceralFatPercent ?? null;

  return [
    {
      label: "Age",
      value: age != null ? `${age} yrs` : EMPTY,
      tone: "default",
    },
    {
      label: "Height",
      value: heightResolved != null ? `${formatNumber(heightResolved)} cm` : EMPTY,
      tone: "default",
    },
    {
      label: "Weight",
      value: weightResolved != null ? `${formatNumber(weightResolved, 1)} kg` : EMPTY,
      tone: "default",
    },
    {
      label: "BMR",
      value: bmr != null ? formatWithCommas(bmr) : EMPTY,
      tone: "blue",
    },
    {
      label: "TDEE",
      value: tdee != null ? formatWithCommas(tdee) : EMPTY,
      tone: "green",
    },
    {
      label: "Body fat",
      value: bodyFat != null ? `${formatNumber(bodyFat, 1)}%` : EMPTY,
      tone: "gold",
    },
    {
      label: "Lean mass",
      value: leanMass != null ? `${formatNumber(leanMass, 1)}%` : EMPTY,
      tone: "green",
    },
    {
      label: "Visceral",
      value: visceral != null ? `${formatNumber(visceral, 1)}%` : EMPTY,
      tone: "default",
    },
  ];
}

function buildLifestyleScore(launchAssessments) {
  if (!Array.isArray(launchAssessments) || launchAssessments.length === 0) {
    return { lifestyleScore: null, lifestylePoints: null, lifestyleMax: 100 };
  }
  const sorted = [...launchAssessments].sort((a, b) =>
    String(b.assessmentDate || "").localeCompare(String(a.assessmentDate || ""))
  );
  const latest = sorted[0];
  const points = Number(latest?.totalScore);
  if (!Number.isFinite(points)) {
    return { lifestyleScore: null, lifestylePoints: null, lifestyleMax: 100 };
  }
  // UI shows Lifestyle as `/10`.
  //
  // In the current LAUNCH implementation, `totalScore` is stored as `0–100`
  // (frontend `computeLaunchAssessment()` returns `maxOverall: 100` and saves
  // `totalScore: Math.round(totals.overall)`).
  //
  // Some legacy data may store `totalScore` as `0–750`. To avoid mismatches,
  // we infer the scale and convert accordingly.
  const usesLegacyScale = points > 100;
  const lifestyleMax = usesLegacyScale ? 750 : 100;
  const outOf10 = usesLegacyScale ? points / 75 : points / 10;
  const scoreOutOf10 = Math.min(10, Math.max(0, Number(outOf10.toFixed(1))));
  return { lifestyleScore: scoreOutOf10, lifestylePoints: points, lifestyleMax };
}

function buildDailyReflectionScores(logs, today) {
  const submitted = (logs || []).filter((row) => row?.submittedAt);
  const todayLog = submitted.find((row) => row.date === today) || null;
  const monthScore = submitted.reduce((sum, row) => sum + (Number(row.score) || 0), 0);
  return {
    dailyScore: todayLog ? Number(todayLog.score) || 0 : null,
    monthlyScore: submitted.length ? monthScore : null,
    todayReflection: todayLog,
  };
}

function buildDailyMetrics({
  today,
  mealSummary,
  waterHistory,
  stepsHistory,
  drfSettings,
  drfLogs,
}) {
  const mealHistory = (mealSummary?.macroSummary || []).slice(-5).map((row) => ({
    date: row.date,
    value: Number(row.proteinGm) || 0,
  }));
  const mealByDate = new Map(mealHistory.map((row) => [row.date, row]));
  const todayProtein = Number(mealByDate.get(today)?.value) || 0;
  const proteinGoal = null;
  const hasMealActivity = (mealSummary?.logs || []).length > 0 || mealHistory.some((r) => r.value > 0);

  const waterDays = (waterHistory?.history || []).slice(-5);
  const todayWater = waterDays.find((d) => d.date === today) || waterDays[waterDays.length - 1];
  const waterValue = Number(todayWater?.glassCount) || 0;
  const waterGoal = Number(todayWater?.goalGlasses ?? waterHistory?.settings?.goalGlasses) || 0;
  const hasWaterActivity = waterDays.some(
    (d) => d.updatedAt || Number(d.glassCount) > 0
  );

  const stepDays = (stepsHistory?.history || []).slice(-5);
  const todaySteps = stepDays.find((d) => d.date === today) || stepDays[stepDays.length - 1];
  const stepsValue = Number(todaySteps?.stepCount) || 0;
  const stepsGoal = Number(todaySteps?.goalSteps ?? stepsHistory?.settings?.goalSteps) || 0;
  const hasStepsActivity = stepDays.some(
    (d) => d.updatedAt || d.syncedAt || Number(d.stepCount) > 0
  );

  const settingsMap = {};
  (listCatalogWithSettings(drfSettings) || []).forEach((item) => {
    settingsMap[item.key] = item;
  });
  const drfByDate = new Map((drfLogs || []).map((row) => [row.date, row]));
  const last5Dates = [];
  for (let i = 4; i >= 0; i -= 1) {
    const d = addDaysDateOnly(today, -i);
    if (d) last5Dates.push(d);
  }

  function drfMetric(key, label, icon, tone, unitLabel) {
    const cfg = settingsMap[key] || { enabled: false, goal: 0 };
    const values = last5Dates.map((date) => {
      const log = drfByDate.get(date);
      return {
        date,
        value: Number(log?.activityValues?.[key]) || 0,
      };
    });
    const todayValue = values.find((r) => r.date === today)?.value || 0;
    const goal = Number(cfg.goal) || 0;
    const pct = pctOf(todayValue, goal);
    return {
      id: key === "physicalExercise" ? "exercise" : key,
      label,
      icon,
      value: cfg.enabled || todayValue > 0 ? `${todayValue} ${unitLabel}` : EMPTY,
      goal: goal > 0 ? `${goal} ${unitLabel}` : EMPTY,
      pct,
      bars: buildMetricBars(values.map((v) => v.value)),
      tone,
      modal: {
        footerLabel: "Open Body, Mind & Soul · full history ›",
        footerSection: "bms",
        records: buildMetricRecords(values, today, (v) => `${v} ${unitLabel}`),
      },
    };
  }

  return [
    {
      id: "protein",
      label: "Protein",
      icon: "🥄",
      value: hasMealActivity ? `${formatNumber(todayProtein, 1)} g` : EMPTY,
      goal: proteinGoal != null ? `${proteinGoal} g` : EMPTY,
      pct: hasMealActivity ? pctOf(todayProtein, proteinGoal) : 0,
      bars: buildMetricBars(mealHistory.map((r) => r.value)),
      tone: "blue",
      modal: {
        footerLabel: "Open Food & Water · full history ›",
        footerSection: "food",
        records: buildMetricRecords(
          mealHistory.length
            ? mealHistory
            : last5Dates.map((date) => ({ date, value: 0 })),
          today,
          (v) => `${formatNumber(v, 1)} g`
        ),
      },
    },
    {
      id: "water",
      label: "Water",
      icon: "💧",
      value: hasWaterActivity ? `${waterValue} gl` : EMPTY,
      goal: hasWaterActivity && waterGoal > 0 ? `${waterGoal} gl` : EMPTY,
      pct: hasWaterActivity ? pctOf(waterValue, waterGoal) : 0,
      bars: buildMetricBars(waterDays.map((d) => Number(d.glassCount) || 0)),
      tone: "blue",
      modal: {
        footerLabel: "Open Water tracking · full history ›",
        footerSection: "food",
        records: buildMetricRecords(
          waterDays.map((d) => ({ date: d.date, value: Number(d.glassCount) || 0 })),
          today,
          (v) => `${v} gl`
        ),
      },
    },
    {
      id: "steps",
      label: "Steps",
      icon: "👟",
      value: hasStepsActivity ? formatWithCommas(stepsValue) : EMPTY,
      goal: hasStepsActivity && stepsGoal > 0 ? formatWithCommas(stepsGoal) : EMPTY,
      pct: hasStepsActivity ? pctOf(stepsValue, stepsGoal) : 0,
      bars: buildMetricBars(stepDays.map((d) => Number(d.stepCount) || 0)),
      tone: "teal",
      modal: {
        footerLabel: "Open BMS · steps history ›",
        footerSection: "bms",
        records: buildMetricRecords(
          stepDays.map((d) => ({ date: d.date, value: Number(d.stepCount) || 0 })),
          today,
          (v) => formatWithCommas(v)
        ),
      },
    },
    drfMetric("meditation", "Meditation", "🧘", "gold", "min"),
    drfMetric("pranayam", "Pranayam", "🌬️", "sky", "min"),
    drfMetric("physicalExercise", "Exercise", "🏃", "orange", "min"),
  ];
}

const PERIOD_TONE = {
  morning: "morning",
  afternoon: "noon",
  evening: "evening",
  night: "night",
};

const PERIOD_LABEL = {
  morning: "Morning",
  afternoon: "Noon",
  evening: "Evening",
  night: "Night",
};

function buildSupplements(dosages, today) {
  const active = (dosages || []).filter(
    (row) => String(row.status || "").toLowerCase() === "active"
  );
  const items = active.slice(0, 5).map((row) => {
    const endDate = row.endDate || null;
    const daysLeft = endDate != null ? daysBetween(today, endDate) : null;
    const periods = Array.isArray(row.periods) ? row.periods : [];
    const first = periods[0];
    const noteParts = [];
    if (first?.mealRelation) {
      noteParts.push(first.mealRelation === "before" ? "Before meal" : "After meal");
    }
    if (PERIOD_LABEL[first?.period]) noteParts.push(PERIOD_LABEL[first.period]);
    return {
      name: row.name || "Supplement",
      note: noteParts.join(" · ") || row.unit || "",
      dosages: periods.map((p) => ({
        label: `${PERIOD_LABEL[p.period] || p.period} · ${p.quantity}`,
        tone: PERIOD_TONE[p.period] || "morning",
      })),
      date: endDate ? shortDateLabel(endDate) : EMPTY,
      daysLeft: daysLeft != null ? daysLeft : null,
      urgent: daysLeft != null && daysLeft <= 3,
    };
  });
  return {
    activeCount: active.length,
    items,
  };
}

function shouldSplitWeightTitle(goalLabel) {
  const label = String(goalLabel || "").trim();
  return label.length > 0 && !/^weight$/i.test(label);
}

function buildHealthProgress(weightLogs, goalLabel) {
  const logs = (weightLogs || []).map(toPublicWeightLog).filter(Boolean);
  if (!logs.length) return null;
  const sorted = [...logs].sort((a, b) =>
    String(b.recordedAt || "").localeCompare(String(a.recordedAt || ""))
  );
  const current = sorted[0];
  const previous = sorted[1] || null;
  const currentKg = Number(current.weightKg);
  const previousKg = previous ? Number(previous.weightKg) : null;
  let delta = null;
  let deltaTone = "muted";
  let deltaLabel = "";
  if (Number.isFinite(currentKg) && Number.isFinite(previousKg)) {
    delta = Number((currentKg - previousKg).toFixed(1));
    if (delta < 0) {
      deltaTone = "green";
      deltaLabel = `▼ ${Math.abs(delta)} kg · trending down`;
    } else if (delta > 0) {
      deltaTone = "red";
      deltaLabel = `▲ ${delta} kg · trending up`;
    } else {
      deltaLabel = "No change";
    }
  }
  const splitTitle = shouldSplitWeightTitle(goalLabel);
  return {
    id: "weight",
    name: splitTitle ? String(goalLabel).trim() : "Weight",
    metric: splitTitle ? "WEIGHT" : "",
    icon: "🔥",
    iconClass: "pgi-fatloss",
    iconBg: "#fff4ef",
    accent: "#ec7a45",
    soft: "#fff8f5",
    titleSplit: splitTitle,
    current: Number.isFinite(currentKg) ? `${formatNumber(currentKg, 1)} kg` : EMPTY,
    val: "",
    delta: deltaLabel,
    deltaTone,
    layout: "default",
    insights: [
      { label: "Current", val: Number.isFinite(currentKg) ? `${formatNumber(currentKg, 1)} kg` : EMPTY },
      {
        label: "Previous",
        val: Number.isFinite(previousKg) ? `${formatNumber(previousKg, 1)} kg` : EMPTY,
      },
      { label: "Change", val: delta != null ? `${delta > 0 ? "+" : ""}${delta} kg` : EMPTY, tone: deltaTone },
    ],
  };
}

async function buildAtAGlanceForUser(userId) {
  const user = await getUserById(userId);
  if (!user) return null;

  const today = todayDateOnly();
  const monthStart = `${today.slice(0, 7)}-01`;
  const historyStart = addDaysDateOnly(today, -4) || today;

  const [
    bodyMeasurementRes,
    metabolicRes,
    waterRes,
    stepsRes,
    mealsRes,
    drfSettingsRes,
    drfLogsRes,
    prakrutiRes,
    launchRes,
    dosagesRes,
    weightRes,
  ] = await Promise.all([
    safe(getLatestBodyMeasurementForUser(userId)),
    safe(listAllMetabolicMetricLogsByUser(userId, { limit: 80 })),
    safe(getUserWaterHistory(userId, { days: 5 })),
    safe(getUserStepsHistory(userId, { days: 5 })),
    safe(getUserMealSummary(userId, { days: 5 })),
    safe(getDrfSettings(userId)),
    safe(listDayLogsBetween(userId, monthStart, today)),
    safe(
      getLatestUserPrakrutiAssessmentByUserId(userId).then((row) =>
        row ? enrichAssessmentPublic(row) : null
      )
    ),
    safe(listUserLaunchAssessmentsByUserId(userId)),
    safe(listUserSupplementDosagesByUserId(userId, { includeStopped: false })),
    safe(listWeightLogsByUser(userId, { page: 1, limit: 20 })),
  ]);

  const bodyMeasurement = bodyMeasurementRes.ok ? bodyMeasurementRes.value : null;
  const metabolicLogs = metabolicRes.ok ? metabolicRes.value || [] : [];
  const dashboard = buildDashboardFromLogs(metabolicLogs, { formatChartDate });
  const waterHistory = waterRes.ok ? waterRes.value : null;
  const stepsHistory = stepsRes.ok ? stepsRes.value : null;
  const mealSummary = mealsRes.ok ? mealsRes.value : null;
  const drfSettings = drfSettingsRes.ok ? drfSettingsRes.value : null;
  const drfLogs = drfLogsRes.ok ? drfLogsRes.value || [] : [];
  const prakruti = prakrutiRes.ok ? prakrutiRes.value : null;
  const launchAssessments = launchRes.ok ? launchRes.value || [] : [];
  const dosages = dosagesRes.ok ? dosagesRes.value || [] : [];
  const weightLogs = weightRes.ok ? weightRes.value?.items || [] : [];

  const lifestyle = buildLifestyleScore(launchAssessments);
  const reflectionScores = buildDailyReflectionScores(drfLogs, today);
  const goalLabel =
    user?.primaryHealthConcern && typeof user.primaryHealthConcern === "object"
      ? String(user.primaryHealthConcern.title || "").trim()
      : "";

  const sources = {
    bodyMeasurement: bodyMeasurementRes.ok,
    metabolic: metabolicRes.ok,
    water: waterRes.ok,
    steps: stepsRes.ok,
    meals: mealsRes.ok,
    dailyReflection: drfSettingsRes.ok && drfLogsRes.ok,
    prakruti: prakrutiRes.ok,
    launch: launchRes.ok,
    supplements: dosagesRes.ok,
    weight: weightRes.ok,
  };

  return {
    userId: user.id,
    userTier: normalizeUserTier(user.userTier),
    metabolicSnapshot: buildMetabolicSnapshot({
      user,
      bodyMeasurement,
      dashboard,
      metabolicLogs,
    }),
    lifestyleScore: lifestyle.lifestyleScore,
    lifestylePoints: lifestyle.lifestylePoints,
    prakriti: prakruti?.prakrutiTypeLabel || prakrutiTypeLabel(prakruti?.prakrutiType) || null,
    dailyScore: reflectionScores.dailyScore,
    monthlyScore: reflectionScores.monthlyScore,
    monthlyRank: null,
    dailyMetrics: buildDailyMetrics({
      today,
      mealSummary,
      waterHistory,
      stepsHistory,
      drfSettings,
      drfLogs: drfLogs.filter((row) => row.date >= historyStart),
    }),
    supplements: buildSupplements(dosages, today),
    healthProgressPrograms: (() => {
      const card = buildHealthProgress(weightLogs, goalLabel);
      return card ? [card] : [];
    })(),
    sources,
  };
}

module.exports = {
  buildAtAGlanceForUser,
};
