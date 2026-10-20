const { v4: uuidv4 } = require("uuid");
const { PutCommand, GetCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { queryPartition } = require("../utils/dynamoList");
const { resolvePublicUrl, deleteStoredMedia } = require("../utils/s3");
const {
  toNumberOrNull,
  BP_SYS_MAX,
  BP_DIA_MAX,
  healthProgressDateKey,
  healthProgressDayBounds,
  alignWeightLogDates,
} = require("../utils/healthProgressHelpers");

const TABLE = "HealthProgressBloodPressure";

function buildBloodPressureItem(input, { id, now, createdAt }) {
  return {
    id: id || uuidv4(),
    userId: String(input.userId || "").trim(),
    sys: toNumberOrNull(input.sys),
    dia: toNumberOrNull(input.dia),
    bpPicKey: input.bpPicKey ? String(input.bpPicKey) : null,
    recordedAt: input.recordedAt || now,
    createdAt: createdAt || now,
    updatedAt: now,
  };
}

function assertBloodPressureItem(item) {
  if (!item.userId) throw new Error("userId is required");
  if (item.sys == null) throw new Error("sys is required");
  if (item.dia == null) throw new Error("dia is required");
  if (item.sys <= 0 || item.sys > BP_SYS_MAX) {
    throw new Error("sys must be greater than 0 and at most 300");
  }
  if (item.dia <= 0 || item.dia > BP_DIA_MAX) {
    throw new Error("dia must be greater than 0 and at most 200");
  }
}

function bloodPressureLogRecency(item) {
  const time = new Date(item?.updatedAt || item?.createdAt || item?.recordedAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

async function listBloodPressureLogsForDate(userId, dateOnly) {
  const bounds = healthProgressDayBounds(dateOnly);
  if (!userId || !bounds) return [];
  const result = await queryPartition({
    tableName: TABLE,
    indexName: "UserIdRecordedAtIndex",
    partitionKeyName: "userId",
    partitionKeyValue: String(userId),
    sortKeyName: "recordedAt",
    sortKeyFrom: bounds.start,
    sortKeyTo: bounds.end,
    page: 1,
    limit: 200,
    scanIndexForward: false,
  });
  const key = healthProgressDateKey(dateOnly);
  return (result.items || []).filter((item) => healthProgressDateKey(item.recordedAt) === key);
}

async function removeExtraBloodPressureLog(item, keepPicKey) {
  if (!item?.id) return;
  try {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE,
        Key: { id: item.id },
      })
    );
  } catch {
    return;
  }
  if (item.bpPicKey && item.bpPicKey !== keepPicKey) {
    await deleteStoredMedia(item.bpPicKey);
  }
}

async function createBloodPressureLog(input) {
  const now = new Date().toISOString();
  const dateKey = healthProgressDateKey(input.recordedAt);
  const matches = dateKey ? await listBloodPressureLogsForDate(input.userId, dateKey) : [];
  matches.sort((a, b) => bloodPressureLogRecency(b) - bloodPressureLogRecency(a));
  const existing = matches[0] || null;
  const duplicates = matches.slice(1);

  const keptPhotoKey = matches.find((row) => row?.bpPicKey)?.bpPicKey || null;
  const bpPicKey = input.bpPicKey ? String(input.bpPicKey) : keptPhotoKey;
  const previousPicKey = existing?.bpPicKey || null;

  const item = buildBloodPressureItem(
    { ...input, bpPicKey },
    { id: existing?.id, now, createdAt: existing?.createdAt }
  );
  assertBloodPressureItem(item);

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ...(existing ? {} : { ConditionExpression: "attribute_not_exists(id)" }),
    })
  );

  if (previousPicKey && bpPicKey && previousPicKey !== bpPicKey) {
    await deleteStoredMedia(previousPicKey);
  }

  for (const extra of duplicates) {
    await removeExtraBloodPressureLog(extra, item.bpPicKey);
  }

  return item;
}

async function getBloodPressureLogById(id) {
  if (!id) return null;
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return Item || null;
}

async function consolidateSameDateBloodPressureLogs(items) {
  const groups = new Map();
  const undated = [];
  for (const item of items || []) {
    const key = healthProgressDateKey(item?.recordedAt);
    if (!key) {
      undated.push(item);
      continue;
    }
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }

  const kept = [];
  for (const rows of groups.values()) {
    rows.sort((a, b) => bloodPressureLogRecency(b) - bloodPressureLogRecency(a));
    const latest = rows[0];
    if (rows.length === 1) {
      kept.push(latest);
      continue;
    }

    const photoKey = rows.find((row) => row?.bpPicKey)?.bpPicKey || null;
    let saved = latest;
    if ((latest.bpPicKey || null) !== (photoKey || null)) {
      saved = { ...latest, bpPicKey: photoKey || null };
      await docClient.send(
        new PutCommand({
          TableName: TABLE,
          Item: saved,
        })
      );
    }

    for (const extra of rows.slice(1)) {
      await removeExtraBloodPressureLog(extra, saved.bpPicKey);
    }
    kept.push(saved);
  }

  return [...kept, ...undated];
}

async function listBloodPressureLogsByUser(userId, { page = 1, limit = 50 } = {}) {
  if (!userId) {
    return { items: [], pagination: { page: 1, limit, total: 0, pages: 1 } };
  }
  const result = await queryPartition({
    tableName: TABLE,
    indexName: "UserIdRecordedAtIndex",
    partitionKeyName: "userId",
    partitionKeyValue: String(userId),
    page,
    limit,
    scanIndexForward: false,
  });

  let items = result.items;
  try {
    items = await consolidateSameDateBloodPressureLogs(result.items);
  } catch {
    items = result.items;
  }

  const fetchedAll = result.pagination.page === 1 && result.items.length === result.pagination.total;
  return {
    items,
    pagination: fetchedAll
      ? {
          ...result.pagination,
          total: items.length,
          pages: 1,
        }
      : result.pagination,
  };
}

function toPublicBloodPressureLog(item) {
  if (!item) return null;
  return {
    ...item,
    _id: item.id,
    bpPicUrl: item.bpPicKey ? resolvePublicUrl(item.bpPicKey) : null,
  };
}

function toUserBloodPressureLog(item) {
  const log = toPublicBloodPressureLog(item);
  if (!log) return null;
  return {
    ...log,
    ...alignWeightLogDates(log),
  };
}

module.exports = {
  TABLE,
  buildBloodPressureItem,
  createBloodPressureLog,
  getBloodPressureLogById,
  listBloodPressureLogsByUser,
  toPublicBloodPressureLog,
  toUserBloodPressureLog,
};
