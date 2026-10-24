const { v4: uuidv4 } = require("uuid");
const { PutCommand, GetCommand, DeleteCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { queryPartition } = require("../utils/dynamoList");
const { resolvePublicUrl, deleteStoredMedia } = require("../utils/s3");
const {
  parseConditionBodyPart,
  toRecordedAtFromDateOnly,
  toIsoDateOnly,
  healthProgressDateKey,
  healthProgressDayBounds,
} = require("../utils/healthProgressHelpers");
const { resolvePicReviewOnSave, applyPhotoReviewUpdate } = require("../utils/healthProgressPicReview");

const TABLE = "HealthProgressCondition";

function buildConditionItem(input, { id, now, createdAt }) {
  const { bodyPart, bodyPartOther } = parseConditionBodyPart(input);

  const dateOnly = toIsoDateOnly(input.recordedAt || input.date);
  const recordedAt = input.recordedAt
    ? input.recordedAt
    : toRecordedAtFromDateOnly(dateOnly);

  return {
    id: id || uuidv4(),
    userId: String(input.userId || "").trim(),
    bodyPart,
    bodyPartOther,
    picKey: input.picKey ? String(input.picKey) : null,
    picReviewStatus: input.picReviewStatus || null,
    picRejectionReason: input.picRejectionReason || null,
    picReviewedAt: input.picReviewedAt || null,
    picReviewedById: input.picReviewedById || null,
    recordedAt,
    createdAt: createdAt || now,
    updatedAt: now,
  };
}

function conditionDayPartKey(item) {
  const date = healthProgressDateKey(item?.recordedAt);
  const part = String(item?.bodyPart || "").toLowerCase();
  if (!date || !part) return "";
  return `${date}:${part}`;
}

function conditionLogRecency(item) {
  const time = new Date(item?.updatedAt || item?.createdAt || item?.recordedAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

async function listConditionLogsForDatePart(userId, dateOnly, bodyPart) {
  const bounds = healthProgressDayBounds(dateOnly);
  if (!userId || !bounds || !bodyPart) return [];
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
  const key = `${healthProgressDateKey(dateOnly)}:${String(bodyPart).toLowerCase()}`;
  return (result.items || []).filter((item) => conditionDayPartKey(item) === key);
}

async function removeExtraConditionLog(item, keepPicKey) {
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
  if (item.picKey && item.picKey !== keepPicKey) {
    await deleteStoredMedia(item.picKey);
  }
}

async function createConditionLog(input) {
  const now = new Date().toISOString();
  const { bodyPart } = parseConditionBodyPart(input);
  const dateKey = healthProgressDateKey(input.recordedAt || input.date);
  const matches = dateKey
    ? await listConditionLogsForDatePart(input.userId, dateKey, bodyPart)
    : [];
  matches.sort((a, b) => conditionLogRecency(b) - conditionLogRecency(a));
  const existing = matches[0] || null;
  const duplicates = matches.slice(1);

  const picKey = input.picKey ? String(input.picKey) : (existing?.picKey || null);
  if (!picKey) throw new Error("picKey is required");
  const previousPicKey = existing?.picKey || null;
  const review = resolvePicReviewOnSave({
    picKey,
    previousPicKey,
    existingReviewStatus: existing?.picReviewStatus,
    existingRejectionReason: existing?.picRejectionReason,
    existingReviewedAt: existing?.picReviewedAt,
    existingReviewedById: existing?.picReviewedById,
  });

  const item = buildConditionItem(
    {
      ...input,
      picKey,
      picReviewStatus: review.reviewStatus,
      picRejectionReason: review.rejectionReason,
      picReviewedAt: review.reviewedAt,
      picReviewedById: review.reviewedById,
    },
    { id: existing?.id, now, createdAt: existing?.createdAt }
  );
  if (!item.userId) throw new Error("userId is required");

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ...(existing ? {} : { ConditionExpression: "attribute_not_exists(id)" }),
    })
  );

  if (previousPicKey && picKey && previousPicKey !== picKey) {
    await deleteStoredMedia(previousPicKey);
  }

  for (const extra of duplicates) {
    await removeExtraConditionLog(extra, item.picKey);
  }

  return item;
}

async function getConditionLogById(id) {
  if (!id) return null;
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return Item || null;
}

async function consolidateSameDateConditionLogs(items) {
  const groups = new Map();
  const undated = [];
  for (const item of items || []) {
    const key = conditionDayPartKey(item);
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
    rows.sort((a, b) => conditionLogRecency(b) - conditionLogRecency(a));
    const latest = rows[0];
    if (rows.length === 1) {
      kept.push(latest);
      continue;
    }

    const photoKey = rows.find((row) => row?.picKey)?.picKey || null;
    let saved = latest;
    if ((latest.picKey || null) !== (photoKey || null)) {
      saved = { ...latest, picKey: photoKey || null };
      await docClient.send(
        new PutCommand({
          TableName: TABLE,
          Item: saved,
        })
      );
    }

    for (const extra of rows.slice(1)) {
      await removeExtraConditionLog(extra, saved.picKey);
    }
    kept.push(saved);
  }

  return [...kept, ...undated];
}

async function listConditionLogsByUser(userId, { page = 1, limit = 50 } = {}) {
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
    items = await consolidateSameDateConditionLogs(result.items);
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

function toPublicConditionLog(item) {
  if (!item) return null;
  return {
    ...item,
    _id: item.id,
    picUrl: item.picKey ? resolvePublicUrl(item.picKey) : null,
  };
}

async function reviewConditionLogPhoto(userId, logId, { status, reviewedById, rejectionReason } = {}) {
  return applyPhotoReviewUpdate({
    getItem: getConditionLogById,
    picKeyField: "picKey",
    reviewFields: {
      status: "picReviewStatus",
      reason: "picRejectionReason",
      reviewedAt: "picReviewedAt",
      reviewedById: "picReviewedById",
    },
    userId,
    logId,
    status,
    reviewedById,
    rejectionReason,
    UpdateCommand,
    docClient,
    tableName: TABLE,
  });
}

module.exports = {
  TABLE,
  buildConditionItem,
  createConditionLog,
  getConditionLogById,
  listConditionLogsByUser,
  reviewConditionLogPhoto,
  toPublicConditionLog,
};
