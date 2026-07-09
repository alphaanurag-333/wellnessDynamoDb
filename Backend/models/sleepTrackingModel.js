const { GetCommand, UpdateCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const {
  todayDateOnly,
  listDateRange,
  dayLabel,
  isValidDateOnly,
} = require("../utils/dateOnly");

const TABLE = "SleepTracking";
const CONNECTIONS_KEY = "connections";
const DAY_KEY_PREFIX = "day#";

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

function normalizeDurationMinutes(value) {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || n < 0 || n > 24 * 60) {
    const err = new Error("durationMinutes must be an integer between 0 and 1440");
    err.name = "ValidationError";
    throw err;
  }
  return n;
}

function normalizeIsoTime(value, fieldName) {
  const next = String(value || "").trim();
  const date = new Date(next);
  if (!next || Number.isNaN(date.getTime())) {
    const err = new Error(`${fieldName} must be a valid ISO timestamp`);
    err.name = "ValidationError";
    throw err;
  }
  return date.toISOString();
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

function formatDayLog(item) {
  const date = dateFromRecordKey(item?.recordKey) || item?.date || "";
  return {
    date,
    day: dayLabel(date),
    bedTime: item?.bedTime ?? null,
    wakeTime: item?.wakeTime ?? null,
    durationMinutes: Number(item?.durationMinutes ?? 0),
    source: ALLOWED_SOURCES.has(String(item?.source || "").toLowerCase())
      ? String(item.source).toLowerCase()
      : "unknown",
    updatedAt: item?.updatedAt ?? null,
  };
}

function emptyDayLog(date) {
  return {
    date,
    day: dayLabel(date),
    bedTime: null,
    wakeTime: null,
    durationMinutes: 0,
    source: "unknown",
    updatedAt: null,
  };
}

async function getConnections(userId) {
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { userId, recordKey: CONNECTIONS_KEY },
    }),
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
      UpdateExpression:
        "SET #platform = :platformPatch, updatedAt = :updatedAt, createdAt = if_not_exists(createdAt, :createdAt)",
      ExpressionAttributeNames: { "#platform": normalizedPlatform },
      ExpressionAttributeValues: {
        ":platformPatch": platformPatch,
        ":updatedAt": now,
        ":createdAt": now,
      },
      ReturnValues: "ALL_NEW",
    }),
  );
  return formatConnections(Attributes);
}

async function getDayLog(userId, date) {
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { userId, recordKey: dayRecordKey(date) },
    }),
  );
  return Item || null;
}

async function upsertDayLog(userId, date, payload) {
  const now = new Date().toISOString();
  const bedTime = normalizeIsoTime(payload.bedTime, "bedTime");
  const wakeTime = normalizeIsoTime(payload.wakeTime, "wakeTime");
  const durationMinutes = normalizeDurationMinutes(payload.durationMinutes);
  const source = payload.source
    ? normalizeSource(payload.source, { allowManual: payload.source === "manual" })
    : "unknown";
  const externalIds = normalizeExternalIds(payload.externalIds);
  const syncedAt = payload.syncedAt ? String(payload.syncedAt) : now;

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { userId, recordKey: dayRecordKey(date) },
      UpdateExpression:
        "SET bedTime = :bedTime, wakeTime = :wakeTime, durationMinutes = :durationMinutes, #date = :date, #source = :source, externalIds = :externalIds, syncedAt = :syncedAt, platform = :platform, dataOrigin = :dataOrigin, updatedAt = :updatedAt, createdAt = if_not_exists(createdAt, :createdAt)",
      ExpressionAttributeNames: { "#date": "date", "#source": "source" },
      ExpressionAttributeValues: {
        ":bedTime": bedTime,
        ":wakeTime": wakeTime,
        ":durationMinutes": durationMinutes,
        ":date": date,
        ":source": source,
        ":externalIds": externalIds,
        ":syncedAt": syncedAt,
        ":platform": payload.platform || null,
        ":dataOrigin": payload.dataOrigin || null,
        ":updatedAt": now,
        ":createdAt": now,
      },
      ReturnValues: "ALL_NEW",
    }),
  );
  return formatDayLog(Attributes);
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

async function syncSleepRecords(userId, { platform, source, records }) {
  const normalizedPlatform = normalizePlatform(platform);
  normalizeSource(source);

  if (!Array.isArray(records) || records.length === 0) {
    const err = new Error("records must be a non-empty array");
    err.name = "ValidationError";
    throw err;
  }

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
      bedTime: record.bedTime,
      wakeTime: record.wakeTime,
      durationMinutes: record.durationMinutes,
      source: record.source,
      platform: normalizedPlatform,
      dataOrigin: record.dataOrigin,
      syncedAt: record.syncedAt,
      externalIds: record.externalIds,
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
    : emptyDayLog(anchorDate);

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
    }),
  );
  const byDate = new Map();
  for (const item of Items) {
    const date = dateFromRecordKey(item.recordKey);
    if (date) byDate.set(date, item);
  }
  return byDate;
}

async function getUserSleepSummary(userId, { date, days = 7 } = {}) {
  const targetDate = isValidDateOnly(date) ? date : todayDateOnly();
  const connections = await getConnections(userId);
  const rangeDates = listDateRange(targetDate, days);
  const startDate = rangeDates[0];
  const endDate = rangeDates[rangeDates.length - 1];
  const logsByDate = await listDayLogsBetween(userId, startDate, endDate);

  const history = rangeDates.map((d) => {
    const item = logsByDate.get(d);
    if (item) return formatDayLog(item);
    return emptyDayLog(d);
  });

  const todayItem = logsByDate.get(targetDate);
  const today = todayItem ? formatDayLog(todayItem) : emptyDayLog(targetDate);

  return {
    today,
    history,
    range: { startDate, endDate, days: rangeDates.length },
    connections,
  };
}

module.exports = {
  TABLE,
  normalizePlatform,
  normalizeSource,
  shouldReplaceDay,
  externalIdsSignature,
  formatDayLog,
  formatConnections,
  getConnections,
  updateConnection,
  getDayLog,
  upsertDayLog,
  syncSleepRecords,
  getUserSleepSummary,
};
