const { todayDateOnly } = require("../utils/dateOnly");
const { getSettings, listEnabledActivities } = require("../models/dailyReflectionModel");
const { getSettings: getStepsSettings, getDayLog: getStepsDayLog, formatDayLog: formatStepsDayLog } = require("../models/stepsTrackingModel");
const { getSettings: getWaterSettings, getDayLog: getWaterDayLog, formatDayLog: formatWaterDayLog } = require("../models/waterTrackingModel");
const { listUserSupplementDosagesByUserId } = require("../models/userSupplementDosageModel");
const {
  queryLogsByUserIdAndDate,
  buildTodayCompletionMap,
  normalizeLogDate,
} = require("../models/userSupplementDosageLogModel");
const { queryMealLogsByUserAndDateRange } = require("../models/mealTrackingModel");

const MEAL_DAILY_GOAL = 3;

function clampPercent(value) {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function ratioPercent(current, goal) {
  const g = Number(goal);
  const c = Number(current);
  if (!Number.isFinite(g) || g <= 0) return null;
  if (!Number.isFinite(c) || c < 0) return 0;
  return clampPercent((c / g) * 100);
}

function averagePercents(values) {
  const applicable = values.filter((value) => value != null && Number.isFinite(value));
  if (applicable.length === 0) return 0;
  const sum = applicable.reduce((acc, value) => acc + value, 0);
  return clampPercent(sum / applicable.length) || 0;
}

function isDosageActiveOnDate(dosage, logDate) {
  if (String(dosage.status || "").toLowerCase() === "stopped") return false;
  const date = normalizeLogDate(logDate);
  return date >= dosage.startDate && date <= dosage.endDate;
}

async function computeStepsTracking(userId, date) {
  const settings = await getStepsSettings(userId);
  const item = await getStepsDayLog(userId, date);
  const day = item ? formatStepsDayLog(item, settings.goalSteps) : {
    stepCount: 0,
    goalSteps: settings.goalSteps,
  };
  const percent = ratioPercent(day.stepCount, day.goalSteps);
  return {
    current: Number(day.stepCount ?? 0),
    goal: Number(day.goalSteps ?? 0),
    percent,
  };
}

async function computeWaterTracking(userId, date) {
  const settings = await getWaterSettings(userId);
  const item = await getWaterDayLog(userId, date);
  const day = item
    ? formatWaterDayLog(item, settings.goalGlasses)
    : {
        glassCount: 0,
        goalGlasses: settings.goalGlasses,
      };
  const percent = ratioPercent(day.glassCount, day.goalGlasses);
  return {
    current: Number(day.glassCount ?? 0),
    goal: Number(day.goalGlasses ?? 0),
    percent,
  };
}

async function computeNutritionTracking(userId, date) {
  const logDate = normalizeLogDate(date);
  const todayLogs = await queryLogsByUserIdAndDate(userId, logDate);
  const dosages = await listUserSupplementDosagesByUserId(userId, { includeStopped: false });
  const activeDosages = dosages.filter((row) => isDosageActiveOnDate(row, logDate));

  let scheduled = 0;
  let completed = 0;

  for (const dosage of activeDosages) {
    const periods = Array.isArray(dosage.periods) ? dosage.periods : [];
    if (periods.length === 0) continue;
    const todayCompletion = buildTodayCompletionMap(dosage, todayLogs, logDate);
    for (const row of periods) {
      scheduled += 1;
      if (todayCompletion[row.period] === true) completed += 1;
    }
  }

  if (scheduled === 0) {
    return { current: 0, goal: 0, percent: null };
  }

  return {
    current: completed,
    goal: scheduled,
    percent: clampPercent((completed / scheduled) * 100),
  };
}

async function computeMealTracking(userId, date) {
  const logs = await queryMealLogsByUserAndDateRange(userId, date, date);
  const approvedCount = logs.filter(
    (log) => String(log.status || "approved").toLowerCase() === "approved"
  ).length;

  return {
    current: approvedCount,
    goal: MEAL_DAILY_GOAL,
    percent: clampPercent((approvedCount / MEAL_DAILY_GOAL) * 100),
  };
}

function computeActivityPercents(enabledActivities, activityValues, gratitudeYes) {
  const activityPercents = {};
  const scoreInputs = [];

  for (const activity of enabledActivities) {
    if (activity.key === "gratitudeJournal") {
      const percent = gratitudeYes === true ? 100 : 0;
      activityPercents.gratitudeJournal = percent;
      scoreInputs.push(percent);
      continue;
    }

    const value = Number(activityValues?.[activity.key] ?? 0);
    const percent = ratioPercent(value, activity.goal);
    if (percent != null) {
      activityPercents[activity.key] = percent;
      scoreInputs.push(percent);
    }
  }

  return { activityPercents, scoreInputs };
}

async function buildDailyReflectionSnapshot(userId, date = todayDateOnly()) {
  const settings = await getSettings(userId);
  const enabledActivities = listEnabledActivities(settings);

  const [steps, water, nutrition, meal] = await Promise.all([
    computeStepsTracking(userId, date),
    computeWaterTracking(userId, date),
    computeNutritionTracking(userId, date),
    computeMealTracking(userId, date),
  ]);

  return {
    date,
    settings,
    enabledActivities,
    tracking: {
      steps,
      water,
      nutrition,
      meal,
    },
  };
}

async function computeDailyReflectionScore(userId, date, { activityValues = {}, gratitudeYes = false } = {}) {
  const snapshot = await buildDailyReflectionSnapshot(userId, date);
  const { activityPercents, scoreInputs: activityScoreInputs } = computeActivityPercents(
    snapshot.enabledActivities,
    activityValues,
    gratitudeYes
  );

  const breakdown = {
    stepsPercent: snapshot.tracking.steps.percent,
    waterPercent: snapshot.tracking.water.percent,
    nutritionPercent: snapshot.tracking.nutrition.percent,
    mealPercent: snapshot.tracking.meal.percent,
    activityPercents,
  };

  const score = averagePercents([
    snapshot.tracking.steps.percent,
    snapshot.tracking.water.percent,
    snapshot.tracking.nutrition.percent,
    snapshot.tracking.meal.percent,
    ...activityScoreInputs,
  ]);

  return {
    score,
    breakdown,
    snapshot,
  };
}

module.exports = {
  MEAL_DAILY_GOAL,
  buildDailyReflectionSnapshot,
  computeDailyReflectionScore,
  computeStepsTracking,
  computeWaterTracking,
  computeNutritionTracking,
  computeMealTracking,
};
