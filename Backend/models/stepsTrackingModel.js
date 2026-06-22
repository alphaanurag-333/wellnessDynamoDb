const { GetCommand, UpdateCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const {
  todayDateOnly,
  listDateRange,
  dayLabel,
  isValidDateOnly,
  addDaysDateOnly,
} = require("../utils/dateOnly");

const TABLE = "StepsTracking";
const SETTINGS_KEY = "settings";
const CONNECTIONS_KEY = "connections";
const DAY_KEY_PREFIX = "day#";

const DEFAULT_GOAL_STEPS = 10000;
const MIN_GOAL_STEPS = 1000;
const MAX_GOAL_STEPS = 50000;
const STEP_LENGTH_METERS = 0.762;
const CALORIES_PER_STEP = 0.04;

const ALLOWED_SOURCES = new Set(["health_connect", "healthkit", "manual", "unknown"]);
const ALLOWED_PLATFORMS = new Set(["android", "ios"]);
const ALLOWED_SYNC_SOURCES = new Set(["health_connect", "healthkit"]);

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

function normalizeGoalSteps(value) {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || n < MIN_GOAL_STEPS || n > MAX_GOAL_STEPS) {
    const err = new Error(`goalSteps must be an integer between ${MIN_GOAL_STEPS} and ${MAX_GOAL_STEPS}`);
    err.name = "ValidationError";
    throw err;
  }
  return n;
}

function normalizeStepCount(value) {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || n < 0 || n > 200000) {
    const err = new Error("stepCount must be an integer between 0 and 200000");
    err.name = "ValidationError";
    throw err;
  }
  return n;
}

function normalizePlatform(value) {
  const next = String(value || "").toLowerCase().trim();
  if (!ALLOWED_PLATFORMS.has(next)) {
    const err = new Error("platform must be android or ios");
    err.name = "ValidationError";
    throw err;
  }
  return next;
}

function normalizeSource(value, { allowManual = false } = {}) {
  const allowed = allowManual ? ALLOWED_SOURCES : ALLOWED_SYNC_SOURCES;
  const next = String(value || "").toLowerCase().trim();
  if (!allowed.has(next)) {
    const err = new Error(`source must be one of: ${[...allowed].join(", ")}`);
    err.name = "ValidationError";
    throw err;
  }
  return next;
}

function computeDistanceMeters(stepCount, distanceMeters) {
  if (distanceMeters != null && distanceMeters !== "") {
    const n = Number(distanceMeters);
    if (Number.isFinite(n) && n >= 0) return Math.round(n);
  }
  return Math.round(Number(stepCount) * STEP_LENGTH_METERS);
}

function computeCaloriesKcal(stepCount, caloriesKcal) {
  if (caloriesKcal != null && caloriesKcal !== "") {
    const n = Number(caloriesKcal);
    if (Number.isFinite(n) && n >= 0) return Math.round(n);
  }
  return Math.round(Number(stepCount) * CALORIES_PER_STEP);
}

function metersToKm(distanceMeters) {
  return Math.round((Number(distanceMeters) / 1000) * 100) / 100;
}

function normalizeExternalIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((id) => String(id || "").trim()).filter(Boolean))];
}

function externalIdsSignature(ids) {
  return [...ids].sort().join("\u0001");
}

function shouldReplaceDay(existing, incoming) {
  if (!existing) return true;

  const existingSynced = String(existing.syncedAt || existing.updatedAt || "");
  const incomingSynced = String(incoming.syncedAt || "");
  if (incomingSynced && incomingSynced > existingSynced) return true;

  const existingIds = normalizeExternalIds(existing.externalIds);
  const incomingIds = normalizeExternalIds(incoming.externalIds);
  return externalIdsSignature(existingIds) !== externalIdsSignature(incomingIds);
}

function formatSettings(item) {
  return {
    goalSteps: Number(item?.goalSteps ?? DEFAULT_GOAL_STEPS),
    updatedAt: item?.updatedAt ?? null,
  };
}

function formatConnections(item) {
  const android = item?.android || {};
  const ios = item?.ios || {};
  const result = {
    android: {
      connected: Boolean(android.connected),
      lastSyncedAt: android.lastSyncedAt ?? null,
    },
    ios: {
      connected: Boolean(ios.connected),
      lastSyncedAt: ios.lastSyncedAt ?? null,
    },
  };
  if (android.provider) result.android.provider = android.provider;
  if (ios.provider) result.ios.provider = ios.provider;
  return result;
}

function formatDayLog(item, fallbackGoalSteps) {
  const date = dateFromRecordKey(item?.recordKey) || item?.date || "";
  const stepCount = Number(item?.stepCount ?? 0);
  const hasStoredGoal = item?.goalSteps != null && item?.goalSteps !== "";
  const goalSteps = hasStoredGoal
    ? Number(item.goalSteps)
    : fallbackGoalSteps != null
      ? Number(fallbackGoalSteps)
      : DEFAULT_GOAL_STEPS;
  const distanceMeters = computeDistanceMeters(stepCount, item?.distanceMeters);
  const caloriesKcal = computeCaloriesKcal(stepCount, item?.caloriesKcal);

  return {
    date,
    day: dayLabel(date),
    stepCount,
    goalSteps,
    distanceKm: metersToKm(distanceMeters),
    caloriesKcal,
    source: ALLOWED_SOURCES.has(String(item?.source || "").toLowerCase())
      ? String(item.source).toLowerCase()
      : "unknown",
    updatedAt: item?.updatedAt ?? null,
  };
}

function emptyDayLog(date, { goalSteps = DEFAULT_GOAL_STEPS } = {}) {
  return {
    date,
    day: dayLabel(date),
    stepCount: 0,
    goalSteps,
    distanceKm: 0,
    caloriesKcal: 0,
    source: "unknown",
    updatedAt: null,
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

async function upsertSettings(userId, { goalSteps }) {
  const now = new Date().toISOString();
  const normalizedGoal = normalizeGoalSteps(goalSteps);
  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { userId, recordKey: SETTINGS_KEY },
      UpdateExpression:
        "SET goalSteps = :goalSteps, updatedAt = :updatedAt, createdAt = if_not_exists(createdAt, :createdAt)",
      ExpressionAttributeValues: {
        ":goalSteps": normalizedGoal,
        ":updatedAt": now,
        ":createdAt": now,
      },
      ReturnValues: "ALL_NEW",
    })
  );
  return formatSettings(Attributes);
}

async function getConnections(userId) {
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { userId, recordKey: CONNECTIONS_KEY },
    })
  );
  return formatConnections(Item);
}

async function updateConnection(userId, platform, { provider, lastSyncedAt }) {
  const normalizedPlatform = normalizePlatform(platform);
  const now = new Date().toISOString();
  const platformPatch = {
    connected: true,
    provider: provider ? String(provider).trim() : null,
    lastSyncedAt: lastSyncedAt || now,
  };

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { userId, recordKey: CONNECTIONS_KEY },
      UpdateExpression: `SET #platform = :platformPatch, updatedAt = :updatedAt, createdAt = if_not_exists(createdAt, :createdAt)`,
      ExpressionAttributeNames: { "#platform": normalizedPlatform },
      ExpressionAttributeValues: {
        ":platformPatch": platformPatch,
        ":updatedAt": now,
        ":createdAt": now,
      },
      ReturnValues: "ALL_NEW",
    })
  );
  return formatConnections(Attributes);
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

async function upsertDayLog(userId, date, payload) {
  const now = new Date().toISOString();
  const settings = await getSettings(userId);
  const stepCount = normalizeStepCount(payload.stepCount);
  const distanceMeters = computeDistanceMeters(stepCount, payload.distanceMeters);
  const caloriesKcal = computeCaloriesKcal(stepCount, payload.caloriesKcal);
  const source = payload.source
    ? normalizeSource(payload.source, { allowManual: payload.source === "manual" })
    : "unknown";
  const goalSteps = payload.goalSteps != null ? payload.goalSteps : settings.goalSteps;
  const externalIds = normalizeExternalIds(payload.externalIds);
  const syncedAt = payload.syncedAt ? String(payload.syncedAt) : now;

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { userId, recordKey: dayRecordKey(date) },
      UpdateExpression:
        "SET stepCount = :stepCount, #date = :date, goalSteps = :goalSteps, distanceMeters = :distanceMeters, caloriesKcal = :caloriesKcal, #source = :source, externalIds = :externalIds, syncedAt = :syncedAt, platform = :platform, dataOrigin = :dataOrigin, updatedAt = :updatedAt, createdAt = if_not_exists(createdAt, :createdAt)",
      ExpressionAttributeNames: { "#date": "date", "#source": "source" },
      ExpressionAttributeValues: {
        ":stepCount": stepCount,
        ":date": date,
        ":goalSteps": goalSteps,
        ":distanceMeters": distanceMeters,
        ":caloriesKcal": caloriesKcal,
        ":source": source,
        ":externalIds": externalIds,
        ":syncedAt": syncedAt,
        ":platform": payload.platform || null,
        ":dataOrigin": payload.dataOrigin || null,
        ":updatedAt": now,
        ":createdAt": now,
      },
      ReturnValues: "ALL_NEW",
    })
  );
  return formatDayLog(Attributes);
}

async function setManualDayStepCount(userId, date, stepCount) {
  const settings = await getSettings(userId);
  return upsertDayLog(userId, date, {
    stepCount,
    goalSteps: settings.goalSteps,
    source: "manual",
    syncedAt: new Date().toISOString(),
  });
}

function pickLatestRecordPerDate(records) {
  const byDate = new Map();
  for (const record of records) {
    const date = String(record.date || "").trim();
    if (!isValidDateOnly(date)) continue;
    const existing = byDate.get(date);
    if (!existing) {
      byDate.set(date, record);
      continue;
    }
    const existingSynced = String(existing.syncedAt || "");
    const incomingSynced = String(record.syncedAt || "");
    if (incomingSynced >= existingSynced) {
      byDate.set(date, record);
    }
  }
  return [...byDate.values()];
}

async function syncStepRecords(userId, { platform, source, records }) {
  const normalizedPlatform = normalizePlatform(platform);
  normalizeSource(source);

  if (!Array.isArray(records) || records.length === 0) {
    const err = new Error("records must be a non-empty array");
    err.name = "ValidationError";
    throw err;
  }

  const settings = await getSettings(userId);
  const mergedRecords = pickLatestRecordPerDate(records);
  let synced = 0;
  let latestProvider = null;
  let latestSyncedAt = null;

  for (const record of mergedRecords) {
    const date = String(record.date || "").trim();
    if (!isValidDateOnly(date)) {
      const err = new Error(`Invalid date in records: ${record.date}`);
      err.name = "ValidationError";
      throw err;
    }

    if (String(record.platform || "").toLowerCase() !== normalizedPlatform) {
      const err = new Error("Each record.platform must match request platform");
      err.name = "ValidationError";
      throw err;
    }

    if (String(record.source || "").toLowerCase() !== String(source).toLowerCase()) {
      const err = new Error("Each record.source must match request source");
      err.name = "ValidationError";
      throw err;
    }

    const incoming = {
      stepCount: record.stepCount,
      distanceMeters: record.distanceMeters,
      caloriesKcal: record.caloriesKcal,
      source: record.source,
      platform: normalizedPlatform,
      dataOrigin: record.dataOrigin,
      syncedAt: record.syncedAt,
      externalIds: record.externalIds,
      goalSteps: settings.goalSteps,
    };

    const existing = await getDayLog(userId, date);
    if (!shouldReplaceDay(existing, incoming)) continue;

    await upsertDayLog(userId, date, incoming);
    synced += 1;

    const recordSyncedAt = String(record.syncedAt || "");
    if (!latestSyncedAt || recordSyncedAt >= latestSyncedAt) {
      latestSyncedAt = recordSyncedAt || new Date().toISOString();
      latestProvider = record.dataOrigin ? String(record.dataOrigin).trim() : latestProvider;
    }
  }

  if (synced > 0) {
    await updateConnection(userId, normalizedPlatform, {
      provider: latestProvider,
      lastSyncedAt: latestSyncedAt,
    });
  }

  const anchorDate = todayDateOnly();
  const todayItem = await getDayLog(userId, anchorDate);
  const today = todayItem
    ? formatDayLog(todayItem)
    : {
        ...emptyDayLog(anchorDate, { goalSteps: settings.goalSteps }),
      };

  return { synced, today };
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

async function getUserStepsSummary(userId, { date, days = 7 } = {}) {
  const targetDate = isValidDateOnly(date) ? date : todayDateOnly();
  const settings = await getSettings(userId);
  const connections = await getConnections(userId);
  const rangeDates = listDateRange(targetDate, days);
  const startDate = rangeDates[0];
  const endDate = rangeDates[rangeDates.length - 1];
  const logsByDate = await listDayLogsBetween(userId, startDate, endDate);

  const history = rangeDates.map((d) => {
    const item = logsByDate.get(d);
    if (item) return formatDayLog(item);
    return emptyDayLog(d, { goalSteps: settings.goalSteps });
  });

  const todayItem = logsByDate.get(targetDate);
  const today = todayItem
    ? formatDayLog(todayItem)
    : {
        ...emptyDayLog(targetDate, { goalSteps: settings.goalSteps }),
      };

  return {
    settings,
    today,
    history,
    range: { startDate, endDate, days: rangeDates.length },
    connections,
  };
}

async function getUserStepsHistory(userId, { fromDate, toDate, days = 30 } = {}) {
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
  const connections = await getConnections(userId);
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
    return emptyDayLog(d, { goalSteps: settings.goalSteps });
  });

  const todayItem = logsByDate.get(end);
  const today = todayItem
    ? formatDayLog(todayItem)
    : {
        ...emptyDayLog(end, { goalSteps: settings.goalSteps }),
      };

  return {
    settings,
    today,
    history,
    range: { startDate: start, endDate: end, days: history.length },
    connections,
  };
}

module.exports = {
  TABLE,
  DEFAULT_GOAL_STEPS,
  MIN_GOAL_STEPS,
  MAX_GOAL_STEPS,
  STEP_LENGTH_METERS,
  CALORIES_PER_STEP,
  normalizeGoalSteps,
  normalizeStepCount,
  normalizePlatform,
  normalizeSource,
  computeDistanceMeters,
  computeCaloriesKcal,
  shouldReplaceDay,
  externalIdsSignature,
  formatDayLog,
  formatSettings,
  formatConnections,
  getSettings,
  upsertSettings,
  getConnections,
  updateConnection,
  getDayLog,
  upsertDayLog,
  setManualDayStepCount,
  syncStepRecords,
  getUserStepsSummary,
  getUserStepsHistory,
};
