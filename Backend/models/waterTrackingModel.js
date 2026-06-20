const { GetCommand, PutCommand, UpdateCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const {
  todayDateOnly,
  listDateRange,
  dayLabel,
  isValidDateOnly,
  addDaysDateOnly,
} = require("../utils/dateOnly");

const TABLE = "WaterTracking";
const SETTINGS_KEY = "settings";
const DAY_KEY_PREFIX = "day#";

const DEFAULT_GOAL_GLASSES = 17;
const DEFAULT_GLASS_SIZE_ML = 250;
const MIN_GOAL_GLASSES = 1;
const MAX_GOAL_GLASSES = 99;

function dayRecordKey(date) {
  return `${DAY_KEY_PREFIX}${date}`;
}

function isDayRecordKey(recordKey) {
  return String(recordKey || "").startsWith(DAY_KEY_PREFIX);
}

function dateFromRecordKey(recordKey) {
  if (!isDayRecordKey(recordKey)) return null;
  return String(recordKey).slice(DAY_KEY_PREFIX.length);
}

function normalizeGoalGlasses(value) {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || n < MIN_GOAL_GLASSES || n > MAX_GOAL_GLASSES) {
    const err = new Error(
      `goalGlasses must be an integer between ${MIN_GOAL_GLASSES} and ${MAX_GOAL_GLASSES}`
    );
    err.name = "ValidationError";
    throw err;
  }
  return n;
}

function normalizeGlassCount(value) {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || n < 0 || n > 999) {
    const err = new Error("glassCount must be an integer between 0 and 999");
    err.name = "ValidationError";
    throw err;
  }
  return n;
}

function formatSettings(item) {
  return {
    goalGlasses: Number(item?.goalGlasses ?? DEFAULT_GOAL_GLASSES),
    glassSizeMl: Number(item?.glassSizeMl ?? DEFAULT_GLASS_SIZE_ML),
    updatedAt: item?.updatedAt ?? null,
  };
}

function formatDayLog(item, fallbackGoalGlasses) {
  const date = dateFromRecordKey(item?.recordKey) || item?.date || "";
  const glassCount = Number(item?.glassCount ?? 0);
  const hasStoredGoal = item?.goalGlasses != null && item?.goalGlasses !== "";
  const goal = hasStoredGoal
    ? Number(item.goalGlasses)
    : fallbackGoalGlasses != null
      ? Number(fallbackGoalGlasses)
      : null;
  const glassSizeMl = Number(item?.glassSizeMl ?? DEFAULT_GLASS_SIZE_ML);
  return {
    date,
    day: dayLabel(date),
    glassCount,
    goalGlasses: goal,
    glassSizeMl,
    totalMl: glassCount * glassSizeMl,
    goalMl: goal != null ? goal * glassSizeMl : null,
    updatedAt: item?.updatedAt ?? null,
  };
}

async function getSettings(userId) {
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { userId, recordKey: SETTINGS_KEY },
    })
  );
  return formatSettings(Item);
}

async function upsertSettings(userId, { goalGlasses }) {
  const now = new Date().toISOString();
  const normalizedGoal = normalizeGoalGlasses(goalGlasses);
  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { userId, recordKey: SETTINGS_KEY },
      UpdateExpression:
        "SET goalGlasses = :goalGlasses, glassSizeMl = if_not_exists(glassSizeMl, :glassSizeMl), updatedAt = :updatedAt, createdAt = if_not_exists(createdAt, :createdAt)",
      ExpressionAttributeValues: {
        ":goalGlasses": normalizedGoal,
        ":glassSizeMl": DEFAULT_GLASS_SIZE_ML,
        ":updatedAt": now,
        ":createdAt": now,
      },
      ReturnValues: "ALL_NEW",
    })
  );
  return formatSettings(Attributes);
}

/** Set goal for a specific date; preserves glass count. Updates global default only for today. */
async function setDayGoal(userId, date, goalGlasses) {
  const normalizedGoal = normalizeGoalGlasses(goalGlasses);
  const existing = await getDayLog(userId, date);
  const glassCount = Number(existing?.glassCount ?? 0);
  const settings = await getSettings(userId);
  const dayLog = await setDayGlassCount(userId, date, glassCount, {
    goalGlasses: normalizedGoal,
    glassSizeMl: settings.glassSizeMl,
    explicitGoal: true,
  });
  if (date === todayDateOnly()) {
    await upsertSettings(userId, { goalGlasses: normalizedGoal });
  }
  return { settings: await getSettings(userId), day: dayLog };
}

async function getDayLog(userId, date) {
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { userId, recordKey: dayRecordKey(date) },
    })
  );
  return Item || null;
}

async function setDayGlassCount(userId, date, glassCount, options = {}) {
  const now = new Date().toISOString();
  const normalizedCount = normalizeGlassCount(glassCount);
  const existing = await getDayLog(userId, date);
  const globalSettings = options.goalGlasses != null && options.explicitGoal
    ? null
    : await getSettings(userId);
  const goalGlasses =
    options.explicitGoal && options.goalGlasses != null
      ? options.goalGlasses
      : existing?.goalGlasses ?? globalSettings?.goalGlasses ?? DEFAULT_GOAL_GLASSES;
  const glassSizeMl = existing?.glassSizeMl ?? options.glassSizeMl ?? globalSettings?.glassSizeMl ?? DEFAULT_GLASS_SIZE_ML;

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { userId, recordKey: dayRecordKey(date) },
      UpdateExpression:
        "SET glassCount = :glassCount, #date = :date, goalGlasses = :goalGlasses, glassSizeMl = :glassSizeMl, updatedAt = :updatedAt, createdAt = if_not_exists(createdAt, :createdAt)",
      ExpressionAttributeNames: { "#date": "date" },
      ExpressionAttributeValues: {
        ":glassCount": normalizedCount,
        ":date": date,
        ":goalGlasses": goalGlasses,
        ":glassSizeMl": glassSizeMl,
        ":updatedAt": now,
        ":createdAt": now,
      },
      ReturnValues: "ALL_NEW",
    })
  );
  return formatDayLog(Attributes);
}

async function adjustDayGlassCount(userId, date, delta, settings) {
  const existing = await getDayLog(userId, date);
  const current = Number(existing?.glassCount ?? 0);
  const next = Math.max(0, current + delta);
  return setDayGlassCount(userId, date, next, settings || {});
}

function emptyDayLog(date, { glassSizeMl = DEFAULT_GLASS_SIZE_ML } = {}) {
  return {
    date,
    day: dayLabel(date),
    glassCount: 0,
    goalGlasses: null,
    glassSizeMl,
    totalMl: 0,
    goalMl: null,
    updatedAt: null,
  };
}

async function listDayLogsBetween(userId, startDate, endDate) {
  const { Items = [] } = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "userId = :userId AND recordKey BETWEEN :startKey AND :endKey",
      ExpressionAttributeValues: {
        ":userId": userId,
        ":startKey": dayRecordKey(startDate),
        ":endKey": dayRecordKey(endDate),
      },
    })
  );
  const byDate = new Map();
  for (const item of Items) {
    const date = dateFromRecordKey(item.recordKey);
    if (date) byDate.set(date, item);
  }
  return byDate;
}

async function getUserWaterSummary(userId, { date, days = 7 } = {}) {
  const targetDate = isValidDateOnly(date) ? date : todayDateOnly();
  const settings = await getSettings(userId);
  const rangeDates = listDateRange(targetDate, days);
  const startDate = rangeDates[0];
  const endDate = rangeDates[rangeDates.length - 1];
  const logsByDate = await listDayLogsBetween(userId, startDate, endDate);

  const history = rangeDates.map((d) => {
    const item = logsByDate.get(d);
    if (item) return formatDayLog(item);
    return emptyDayLog(d, { glassSizeMl: settings.glassSizeMl });
  });

  const todayItem = logsByDate.get(targetDate);
  const todayLog = todayItem
    ? formatDayLog(todayItem)
    : {
        ...emptyDayLog(targetDate, { glassSizeMl: settings.glassSizeMl }),
        goalGlasses: settings.goalGlasses,
        goalMl: settings.goalGlasses * settings.glassSizeMl,
      };

  return {
    settings,
    today: todayLog,
    history,
    range: { startDate, endDate, days: rangeDates.length },
  };
}

async function getUserWaterHistory(userId, { fromDate, toDate, days = 30 } = {}) {
  const end = isValidDateOnly(toDate) ? toDate : todayDateOnly();
  const start = isValidDateOnly(fromDate)
    ? fromDate
    : addDaysDateOnly(end, -Math.max(1, Math.min(Number(days) || 30, 366)) + 1);

  if (!start || !isValidDateOnly(end) || start > end) {
    const err = new Error("Invalid date range");
    err.name = "ValidationError";
    throw err;
  }

  const settings = await getSettings(userId);
  const rangeDates = [];
  let cursor = start;
  while (cursor <= end) {
    rangeDates.push(cursor);
    const next = addDaysDateOnly(cursor, 1);
    if (!next || next === cursor) break;
    cursor = next;
  }

  const logsByDate = await listDayLogsBetween(userId, start, end);
  const history = rangeDates.map((d) => {
    const item = logsByDate.get(d);
    if (item) return formatDayLog(item);
    return emptyDayLog(d, { glassSizeMl: settings.glassSizeMl });
  });

  return {
    settings,
    history,
    range: { startDate: start, endDate: end, days: history.length },
  };
}

module.exports = {
  TABLE,
  DEFAULT_GOAL_GLASSES,
  DEFAULT_GLASS_SIZE_ML,
  normalizeGoalGlasses,
  normalizeGlassCount,
  getSettings,
  upsertSettings,
  setDayGoal,
  getDayLog,
  setDayGlassCount,
  adjustDayGlassCount,
  getUserWaterSummary,
  getUserWaterHistory,
  formatDayLog,
  formatSettings,
};
