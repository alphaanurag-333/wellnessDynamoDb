const { v4: uuidv4 } = require("uuid");
const { PutCommand, GetCommand, UpdateCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { queryPartition } = require("../utils/dynamoList");
const { resolvePublicUrl, deleteStoredMedia } = require("../utils/s3");
const {
  toNumberOrNull,
  WEIGHT_KG_MAX,
  healthProgressDateKey,
  healthProgressDayBounds,
  alignWeightLogDates,
} = require("../utils/healthProgressHelpers");

const TABLE = "HealthProgressWeight";

function buildWeightItem(input, { id, now, createdAt }) {
  return {
    id: id || uuidv4(),
    userId: String(input.userId || "").trim(),
    weightKg: toNumberOrNull(input.weightKg),
    weightPicKey: input.weightPicKey ? String(input.weightPicKey) : null,
    weightPicReviewStatus: input.weightPicReviewStatus || null,
    weightPicRejectionReason: input.weightPicRejectionReason || null,
    weightPicReviewedAt: input.weightPicReviewedAt || null,
    weightPicReviewedById: input.weightPicReviewedById || null,
    recordedAt: input.recordedAt || now,
    createdAt: createdAt || now,
    updatedAt: now,
  };
}

function assertWeightItem(item) {
  if (!item.userId) throw new Error("userId is required");
  if (item.weightKg == null) throw new Error("weightKg is required");
  if (item.weightKg <= 0 || item.weightKg > WEIGHT_KG_MAX) {
    throw new Error("weightKg must be greater than 0 and at most 500");
  }
}

function weightLogRecency(item) {
  const time = new Date(item?.updatedAt || item?.createdAt || item?.recordedAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

async function listWeightLogsForDate(userId, dateOnly) {
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

async function removeExtraWeightLog(item, keepPicKey) {
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
  if (item.weightPicKey && item.weightPicKey !== keepPicKey) {
    await deleteStoredMedia(item.weightPicKey);
  }
}

async function createWeightLog(input) {
  const now = new Date().toISOString();
  const dateKey = healthProgressDateKey(input.recordedAt);
  const matches = dateKey ? await listWeightLogsForDate(input.userId, dateKey) : [];
  matches.sort((a, b) => weightLogRecency(b) - weightLogRecency(a));
  const existing = matches[0] || null;
  const duplicates = matches.slice(1);

  const keptPhotoKey = matches.find((row) => row?.weightPicKey)?.weightPicKey || null;
  const weightPicKey = input.weightPicKey ? String(input.weightPicKey) : keptPhotoKey;
  const previousPicKey = existing?.weightPicKey || null;
  const samePhoto = Boolean(weightPicKey) && previousPicKey === weightPicKey;
  const weightPicReviewStatus = !weightPicKey
    ? null
    : samePhoto
      ? (existing?.weightPicReviewStatus || "pending")
      : "pending";

  const item = buildWeightItem(
    {
      ...input,
      weightPicKey,
      weightPicReviewStatus,
      weightPicRejectionReason: weightPicReviewStatus === "rejected" ? (existing?.weightPicRejectionReason || null) : null,
      weightPicReviewedAt: samePhoto ? (existing?.weightPicReviewedAt || null) : null,
      weightPicReviewedById: samePhoto ? (existing?.weightPicReviewedById || null) : null,
    },
    { id: existing?.id, now, createdAt: existing?.createdAt }
  );
  assertWeightItem(item);

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ...(existing ? {} : { ConditionExpression: "attribute_not_exists(id)" }),
    })
  );

  if (previousPicKey && weightPicKey && previousPicKey !== weightPicKey) {
    await deleteStoredMedia(previousPicKey);
  }

  for (const extra of duplicates) {
    await removeExtraWeightLog(extra, item.weightPicKey);
  }

  return item;
}

async function getWeightLogById(id) {
  if (!id) return null;
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return Item || null;
}

async function consolidateSameDateWeightLogs(items) {
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
    rows.sort((a, b) => weightLogRecency(b) - weightLogRecency(a));
    const latest = rows[0];
    if (rows.length === 1) {
      kept.push(latest);
      continue;
    }

    const photoKey = rows.find((row) => row?.weightPicKey)?.weightPicKey || null;
    let saved = latest;
    if ((latest.weightPicKey || null) !== (photoKey || null)) {
      saved = { ...latest, weightPicKey: photoKey || null };
      await docClient.send(
        new PutCommand({
          TableName: TABLE,
          Item: saved,
        })
      );
    }

    for (const extra of rows.slice(1)) {
      await removeExtraWeightLog(extra, saved.weightPicKey);
    }
    kept.push(saved);
  }

  return [...kept, ...undated];
}

async function listWeightLogsByUser(userId, { page = 1, limit = 50 } = {}) {
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
    items = await consolidateSameDateWeightLogs(result.items);
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

function toPublicWeightLog(item) {
  if (!item) return null;
  return {
    ...item,
    _id: item.id,
    weightPicUrl: item.weightPicKey ? resolvePublicUrl(item.weightPicKey) : null,
  };
}

function toUserWeightLog(item) {
  const log = toPublicWeightLog(item);
  if (!log) return null;
  return {
    ...log,
    ...alignWeightLogDates(log),
  };
}

async function clearWeightLogPhoto(userId, logId) {
  const item = await getWeightLogById(logId);
  if (!item || String(item.userId) !== String(userId)) {
    const err = new Error("Weight log not found");
    err.name = "NotFoundError";
    throw err;
  }
  if (!item.weightPicKey) {
    const err = new Error("This weight entry has no photo");
    err.name = "ValidationError";
    throw err;
  }

  const picKey = item.weightPicKey;
  const now = new Date().toISOString();
  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id: logId },
      UpdateExpression: "SET weightPicKey = :nullVal, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":nullVal": null,
        ":updatedAt": now,
      },
      ReturnValues: "ALL_NEW",
    })
  );

  await deleteStoredMedia(picKey);
  return Attributes;
}

async function reviewWeightLogPhoto(userId, logId, { status, reviewedById, rejectionReason } = {}) {
  const nextStatus = status === "approved" || status === "rejected" ? status : "";
  if (!nextStatus) {
    const err = new Error("status must be approved or rejected");
    err.name = "ValidationError";
    throw err;
  }

  const item = await getWeightLogById(logId);
  if (!item || String(item.userId) !== String(userId)) {
    const err = new Error("Weight log not found");
    err.name = "NotFoundError";
    throw err;
  }
  if (!item.weightPicKey) {
    const err = new Error("This weight entry has no photo");
    err.name = "ValidationError";
    throw err;
  }

  const now = new Date().toISOString();
  const reason = nextStatus === "rejected"
    ? String(rejectionReason || "").trim().slice(0, 500) || null
    : null;
  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id: logId },
      UpdateExpression: "SET weightPicReviewStatus = :status, weightPicRejectionReason = :reason, weightPicReviewedAt = :reviewedAt, weightPicReviewedById = :reviewedById, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":status": nextStatus,
        ":reason": reason,
        ":reviewedAt": now,
        ":reviewedById": reviewedById ? String(reviewedById) : null,
        ":updatedAt": now,
      },
      ReturnValues: "ALL_NEW",
    })
  );
  return Attributes;
}

module.exports = {
  TABLE,
  buildWeightItem,
  createWeightLog,
  getWeightLogById,
  listWeightLogsByUser,
  clearWeightLogPhoto,
  reviewWeightLogPhoto,
  toPublicWeightLog,
  toUserWeightLog,
};
