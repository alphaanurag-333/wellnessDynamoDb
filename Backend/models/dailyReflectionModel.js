const { GetCommand, PutCommand, UpdateCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { isValidDateOnly } = require("../utils/dateOnly");

const TABLE = "DailyReflection";
const SETTINGS_KEY = "settings";
const DAY_KEY_PREFIX = "day#";

const ACTIVITY_CATALOG = [
  { key: "yogaNamaskar", unit: "cycles", name: "Yoga Namaskar", section: "Physical Activities", defaultGoal: 21 },
  { key: "suryaNamaskar", unit: "cycles", name: "Surya Namaskar", section: "Physical Activities", defaultGoal: 12 },
  { key: "physicalExercise", unit: "mins", name: "Physical Exercise", section: "Physical Activities", defaultGoal: 10 },
  { key: "grounding", unit: "mins", name: "Grounding", section: "Physical Activities", defaultGoal: 10 },
  { key: "blessingsFromSun", unit: "mins", name: "Blessings from Sun", section: "Physical Activities", defaultGoal: 10 },
  { key: "bhramari", unit: "times", name: "Bhramari", section: "Mindfulness & Breath", defaultGoal: 21 },
  { key: "meditation", unit: "times", name: "Meditation", section: "Mindfulness & Breath", defaultGoal: 21 },
  { key: "nadiSuddhi", unit: "times", name: "Nadi Suddhi", section: "Mindfulness & Breath", defaultGoal: 21 },
  { key: "lnb", unit: "times", name: "LNB", section: "Mindfulness & Breath", defaultGoal: 21 },
  { key: "pranayam", unit: "times", name: "Pranayam", section: "Mindfulness & Breath", defaultGoal: 21 },
  { key: "gratitudeJournal", unit: "boolean", name: "Gratitude Journal", section: "Mindfulness & Breath", defaultGoal: 1 },
];

const ACTIVITY_KEYS = new Set(ACTIVITY_CATALOG.map((item) => item.key));
const NUMERIC_ACTIVITY_KEYS = ACTIVITY_CATALOG.filter((item) => item.unit !== "boolean").map(
  (item) => item.key
);

const MIN_GOAL = 0;
const MAX_GOAL = 9999;

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

function defaultActivitySettings() {
  const activities = {};
  for (const item of ACTIVITY_CATALOG) {
    activities[item.key] = { enabled: false, goal: 0 };
  }
  return activities;
}

function normalizeGoal(value) {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || n < MIN_GOAL || n > MAX_GOAL) {
    const err = new Error(`goal must be an integer between ${MIN_GOAL} and ${MAX_GOAL}`);
    err.name = "ValidationError";
    throw err;
  }
  return n;
}

function normalizeActivitySettings(input) {
  const defaults = defaultActivitySettings();
  const source = input && typeof input === "object" ? input : {};

  for (const [key, value] of Object.entries(source)) {
    if (!ACTIVITY_KEYS.has(key)) continue;
    const row = value && typeof value === "object" ? value : {};
    defaults[key] = {
      enabled: Boolean(row.enabled),
      goal: normalizeGoal(row.goal ?? 0),
    };
  }

  return defaults;
}

function normalizeSelectedQuestionIds(value) {
  if (!Array.isArray(value)) return null;
  const seen = new Set();
  const ids = [];
  for (const entry of value) {
    const id = String(entry || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function normalizeBedtime(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(raw);
  if (!match) {
    const err = new Error("bedtime must be HH:MM");
    err.name = "ValidationError";
    throw err;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    const err = new Error("bedtime must be a valid 24-hour time");
    err.name = "ValidationError";
    throw err;
  }
  return `${match[1]}:${match[2]}`;
}

function normalizeDailyReflectionAudioId(value) {
  if (value === null || value === undefined || value === "") return null;
  const id = String(value).trim();
  return id || null;
}

function formatSettings(item) {
  const stored = item?.activities && typeof item.activities === "object" ? item.activities : {};
  return {
    activities: normalizeActivitySettings(stored),
    selectedQuestionIds: normalizeSelectedQuestionIds(item?.selectedQuestionIds),
    bedtime: typeof item?.bedtime === "string" ? item.bedtime : null,
    dailyReflectionAudioId: normalizeDailyReflectionAudioId(item?.dailyReflectionAudioId),
    updatedAt: item?.updatedAt ?? null,
  };
}

function formatDayLog(item) {
  if (!item) return null;
  const date = dateFromRecordKey(item.recordKey) || item.date || "";
  return {
    date,
    activityValues: item.activityValues && typeof item.activityValues === "object" ? item.activityValues : {},
    gratitudeYes: item.gratitudeYes === true,
    honestConfirmed: item.honestConfirmed === true,
    breakdown: item.breakdown && typeof item.breakdown === "object" ? item.breakdown : {},
    score: Number(item.score ?? 0),
    pluggedHeadphones: item.pluggedHeadphones ?? null,
    submittedAt: item.submittedAt ?? null,
    updatedAt: item.updatedAt ?? null,
  };
}

function getCatalogItem(key) {
  return ACTIVITY_CATALOG.find((item) => item.key === key) || null;
}

function serializeCatalogActivity(item, settingsRow = {}) {
  return {
    key: item.key,
    name: item.name,
    section: item.section,
    unit: item.unit,
    defaultGoal: Number(item.defaultGoal || 0),
    enabled: Boolean(settingsRow.enabled),
    goal: Number(settingsRow.goal ?? 0),
  };
}

function listEnabledActivities(settings) {
  const activities = settings?.activities || defaultActivitySettings();
  return ACTIVITY_CATALOG.filter((item) => Boolean(activities[item.key]?.enabled)).map((item) =>
    serializeCatalogActivity(item, activities[item.key])
  );
}

function listCatalogWithSettings(settings) {
  const activities = settings?.activities || defaultActivitySettings();
  return ACTIVITY_CATALOG.map((item) => serializeCatalogActivity(item, activities[item.key]));
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

async function upsertSettings(userId, activities) {
  return upsertSettingsFields(userId, { activities });
}

async function upsertSettingsFields(userId, fields = {}) {
  const now = new Date().toISOString();
  const exprValues = {
    ":updatedAt": now,
    ":createdAt": now,
  };
  let setExpr = "SET updatedAt = :updatedAt, createdAt = if_not_exists(createdAt, :createdAt)";

  if (fields.activities !== undefined) {
    exprValues[":activities"] = normalizeActivitySettings(fields.activities);
    setExpr += ", activities = :activities";
  }
  if (fields.selectedQuestionIds !== undefined) {
    exprValues[":selectedQuestionIds"] = normalizeSelectedQuestionIds(fields.selectedQuestionIds) || [];
    setExpr += ", selectedQuestionIds = :selectedQuestionIds";
  }
  if (fields.bedtime !== undefined) {
    exprValues[":bedtime"] = normalizeBedtime(fields.bedtime) || "22:30";
    setExpr += ", bedtime = :bedtime";
  }
  if (fields.dailyReflectionAudioId !== undefined) {
    exprValues[":dailyReflectionAudioId"] = normalizeDailyReflectionAudioId(
      fields.dailyReflectionAudioId
    );
    setExpr += ", dailyReflectionAudioId = :dailyReflectionAudioId";
  }
  if (Object.keys(exprValues).length <= 2) {
    const err = new Error("No valid settings fields provided");
    err.name = "ValidationError";
    throw err;
  }

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { userId, recordKey: SETTINGS_KEY },
      UpdateExpression: setExpr,
      ExpressionAttributeValues: exprValues,
      ReturnValues: "ALL_NEW",
    })
  );
  return formatSettings(Attributes);
}

async function getDayLog(userId, date) {
  if (!isValidDateOnly(date)) return null;
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { userId, recordKey: dayRecordKey(date) },
    })
  );
  return Item ? formatDayLog(Item) : null;
}

async function upsertDayLog(userId, date, payload) {
  if (!isValidDateOnly(date)) {
    const err = new Error("date must be YYYY-MM-DD");
    err.name = "ValidationError";
    throw err;
  }

  const now = new Date().toISOString();
  const activityValues = {};
  const sourceValues =
    payload?.activityValues && typeof payload.activityValues === "object"
      ? payload.activityValues
      : {};

  for (const key of NUMERIC_ACTIVITY_KEYS) {
    if (sourceValues[key] == null || sourceValues[key] === "") continue;
    const n = Number.parseInt(String(sourceValues[key]), 10);
    if (!Number.isFinite(n) || n < 0 || n > MAX_GOAL) {
      const err = new Error(`Invalid value for ${key}`);
      err.name = "ValidationError";
      throw err;
    }
    activityValues[key] = n;
  }

  const item = {
    userId,
    recordKey: dayRecordKey(date),
    date,
    activityValues,
    gratitudeYes: payload?.gratitudeYes === true,
    honestConfirmed: payload?.honestConfirmed === true,
    breakdown: payload?.breakdown && typeof payload.breakdown === "object" ? payload.breakdown : {},
    score: Number(payload?.score ?? 0),
    pluggedHeadphones:
      payload?.pluggedHeadphones === true || payload?.pluggedHeadphones === false
        ? payload.pluggedHeadphones
        : null,
    submittedAt: payload?.submittedAt || now,
    updatedAt: now,
    createdAt: now,
  };

  const { Item: existingItem } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { userId, recordKey: dayRecordKey(date) },
    })
  );
  if (existingItem?.createdAt) {
    item.createdAt = existingItem.createdAt;
  }

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
    })
  );

  return formatDayLog(item);
}

function monthDateRange(monthYear) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(monthYear || "").trim());
  if (!match) return null;
  const [, yearStr, monthStr] = match;
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;

  const startDate = `${yearStr}-${monthStr}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const endDate = `${yearStr}-${monthStr}-${String(lastDay).padStart(2, "0")}`;
  return { startDate, endDate };
}

async function listDayLogsForMonth(userId, monthYear) {
  const range = monthDateRange(monthYear);
  if (!range) return [];
  return listDayLogsBetween(userId, range.startDate, range.endDate);
}

async function listDayLogsBetween(userId, startDate, endDate) {
  if (!isValidDateOnly(startDate) || !isValidDateOnly(endDate) || startDate > endDate) {
    return [];
  }

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

  return Items.filter((item) => isDayRecordKey(item.recordKey) && item.submittedAt)
    .map(formatDayLog)
    .filter(Boolean);
}

module.exports = {
  TABLE,
  ACTIVITY_CATALOG,
  ACTIVITY_KEYS,
  NUMERIC_ACTIVITY_KEYS,
  defaultActivitySettings,
  normalizeActivitySettings,
  getCatalogItem,
  serializeCatalogActivity,
  listEnabledActivities,
  listCatalogWithSettings,
  getSettings,
  upsertSettings,
  upsertSettingsFields,
  getDayLog,
  upsertDayLog,
  listDayLogsBetween,
  listDayLogsForMonth,
  monthDateRange,
  formatDayLog,
  formatSettings,
  normalizeDailyReflectionAudioId,
};
