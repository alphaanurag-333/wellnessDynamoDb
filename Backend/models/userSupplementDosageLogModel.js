const {
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { PERIODS } = require("./userSupplementDosageModel");

const TABLE = "UserSupplementDosageLog";

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function buildLogId(dosageId, logDate, period) {
  return `${String(dosageId)}#${String(logDate)}#${String(period)}`;
}

function normalizeLogDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return new Date().toISOString().slice(0, 10);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    const err = new Error("logDate must be a valid date");
    err.name = "ValidationError";
    throw err;
  }
  return d.toISOString().slice(0, 10);
}

function normalizePeriod(value) {
  const period = String(value || "").trim().toLowerCase();
  if (!PERIODS.has(period)) {
    const err = new Error("period must be morning, afternoon, or evening");
    err.name = "ValidationError";
    throw err;
  }
  return period;
}

function toUserSupplementDosageLogPublic(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  return {
    id: row.id,
    _id: row._id,
    dosageId: row.dosageId,
    userId: row.userId,
    logDate: row.logDate,
    period: row.period,
    completed: row.completed === true,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function getUserSupplementDosageLogRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function queryLogsByDosageId(dosageId) {
  const did = String(dosageId || "").trim();
  if (!did) return [];

  const items = [];
  let lastKey;

  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: "DosageDateIndex",
        KeyConditionExpression: "#dosageId = :dosageId",
        ExpressionAttributeNames: { "#dosageId": "dosageId" },
        ExpressionAttributeValues: { ":dosageId": did },
        ExclusiveStartKey: lastKey,
      })
    );
    items.push(...(Items || []));
    lastKey = LastEvaluatedKey;
  } while (lastKey);

  return items;
}

async function queryLogsByUserIdAndDate(userId, logDate) {
  const uid = String(userId || "").trim();
  const date = normalizeLogDate(logDate);
  if (!uid) return [];

  const items = [];
  let lastKey;

  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: "UserDateIndex",
        KeyConditionExpression: "#userId = :userId AND #logDate = :logDate",
        ExpressionAttributeNames: {
          "#userId": "userId",
          "#logDate": "logDate",
        },
        ExpressionAttributeValues: {
          ":userId": uid,
          ":logDate": date,
        },
        ExclusiveStartKey: lastKey,
      })
    );
    items.push(...(Items || []));
    lastKey = LastEvaluatedKey;
  } while (lastKey);

  return items;
}

async function queryLogsByUserId(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return [];

  const items = [];
  let lastKey;

  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: "UserDateIndex",
        KeyConditionExpression: "#userId = :userId",
        ExpressionAttributeNames: { "#userId": "userId" },
        ExpressionAttributeValues: { ":userId": uid },
        ExclusiveStartKey: lastKey,
      })
    );
    items.push(...(Items || []));
    lastKey = LastEvaluatedKey;
  } while (lastKey);

  return items;
}

function computeProgressPercent(dosage, logs) {
  const durationDays = Number(dosage?.durationDays) || 0;
  const periods = Array.isArray(dosage?.periods) ? dosage.periods : [];
  if (durationDays <= 0 || periods.length === 0) return 0;

  const periodSet = new Set(periods.map((p) => p.period));
  const byDate = new Map();

  for (const log of logs || []) {
    if (!log?.logDate || !periodSet.has(log.period)) continue;
    if (!byDate.has(log.logDate)) byDate.set(log.logDate, new Set());
    byDate.get(log.logDate).add(log.period);
  }

  let completedDays = 0;
  for (const [, loggedPeriods] of byDate) {
    if (loggedPeriods.size >= periodSet.size) completedDays += 1;
  }

  return Math.min(100, Math.floor((completedDays / durationDays) * 100));
}

function buildTodayCompletionMap(dosage, logs, logDate) {
  const date = normalizeLogDate(logDate);
  const dosageId = String(dosage?.id || dosage?._id || "").trim();
  const map = {};
  for (const row of dosage?.periods || []) {
    map[row.period] = false;
  }
  for (const log of logs || []) {
    if (
      log.logDate === date &&
      log.period &&
      String(log.dosageId || "").trim() === dosageId
    ) {
      map[log.period] = true;
    }
  }
  return map;
}

async function toggleUserSupplementDosageLog({
  dosageId,
  userId,
  period,
  logDate,
}) {
  const did = String(dosageId || "").trim();
  const uid = String(userId || "").trim();
  const normalizedPeriod = normalizePeriod(period);
  const normalizedDate = normalizeLogDate(logDate);
  if (!did) throw new Error("dosageId is required");
  if (!uid) throw new Error("userId is required");

  const id = buildLogId(did, normalizedDate, normalizedPeriod);
  const existing = await getUserSupplementDosageLogRecordById(id);

  if (existing) {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE,
        Key: { id },
        ConditionExpression: "attribute_exists(id)",
      })
    );
    return { completed: false, log: null };
  }

  const now = new Date().toISOString();
  const item = {
    id,
    dosageId: did,
    userId: uid,
    logDate: normalizedDate,
    period: normalizedPeriod,
    completed: true,
    completedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );

  return { completed: true, log: toUserSupplementDosageLogPublic(item) };
}

module.exports = {
  buildLogId,
  toggleUserSupplementDosageLog,
  getUserSupplementDosageLogRecordById,
  queryLogsByDosageId,
  queryLogsByUserIdAndDate,
  queryLogsByUserId,
  computeProgressPercent,
  buildTodayCompletionMap,
  normalizeLogDate,
  normalizePeriod,
  toUserSupplementDosageLogPublic,
};
