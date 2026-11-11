const { v4: uuidv4 } = require("uuid");
const { PutCommand, GetCommand, DeleteCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { queryPartition } = require("../utils/dynamoList");
const { resolvePublicUrl, deleteStoredMedia } = require("../utils/s3");
const {
  toNumberOrNull,
  normalizeGlucoseType,
  GLUCOSE_VALUE_MAX,
  healthProgressDateKey,
  healthProgressDayBounds,
  alignWeightLogDates,
} = require("../utils/healthProgressHelpers");
const { resolvePicReviewOnSave, applyPhotoReviewUpdate } = require("../utils/healthProgressPicReview");

const TABLE = "HealthProgressGlucose";

function buildGlucoseItem(input, { id, now, createdAt }) {
  return {
    id: id || uuidv4(),
    userId: String(input.userId || "").trim(),
    type: normalizeGlucoseType(input.type),
    value: toNumberOrNull(input.value),
    glucosePicKey: input.glucosePicKey ? String(input.glucosePicKey) : null,
    glucosePicReviewStatus: input.glucosePicReviewStatus || null,
    glucosePicRejectionReason: input.glucosePicRejectionReason || null,
    glucosePicReviewedAt: input.glucosePicReviewedAt || null,
    glucosePicReviewedById: input.glucosePicReviewedById || null,
    recordedAt: input.recordedAt || now,
    createdAt: createdAt || now,
    updatedAt: now,
  };
}

function assertGlucoseItem(item) {
  if (!item.userId) throw new Error("userId is required");
  if (item.value == null) throw new Error("value is required");
  if (item.value <= 0 || item.value > GLUCOSE_VALUE_MAX) {
    throw new Error("value must be greater than 0 and at most 600");
  }
}

function glucoseLogRecency(item) {
  const time = new Date(item?.updatedAt || item?.createdAt || item?.recordedAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function glucoseDayTypeKey(item) {
  const date = healthProgressDateKey(item?.recordedAt);
  const type = String(item?.type || "").toLowerCase();
  if (!date || !type) return "";
  return `${date}:${type}`;
}

async function listGlucoseLogsForDate(userId, dateOnly, type) {
  const bounds = healthProgressDayBounds(dateOnly);
  if (!userId || !bounds || !type) return [];
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
  const key = `${healthProgressDateKey(dateOnly)}:${String(type).toLowerCase()}`;
  return (result.items || []).filter((item) => glucoseDayTypeKey(item) === key);
}

async function removeExtraGlucoseLog(item, keepPicKey) {
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
  if (item.glucosePicKey && item.glucosePicKey !== keepPicKey) {
    await deleteStoredMedia(item.glucosePicKey);
  }
}

async function createGlucoseLog(input) {
  const now = new Date().toISOString();
  const type = normalizeGlucoseType(input.type);
  const dateKey = healthProgressDateKey(input.recordedAt);
  const matches = dateKey
    ? await listGlucoseLogsForDate(input.userId, dateKey, type)
    : [];
  matches.sort((a, b) => glucoseLogRecency(b) - glucoseLogRecency(a));
  const existing = matches[0] || null;
  const duplicates = matches.slice(1);

  const keptPhotoKey = matches.find((row) => row?.glucosePicKey)?.glucosePicKey || null;
  const glucosePicKey = input.glucosePicKey ? String(input.glucosePicKey) : keptPhotoKey;
  const previousPicKey = existing?.glucosePicKey || null;
  const review = resolvePicReviewOnSave({
    picKey: glucosePicKey,
    previousPicKey,
    existingReviewStatus: existing?.glucosePicReviewStatus,
    existingRejectionReason: existing?.glucosePicRejectionReason,
    existingReviewedAt: existing?.glucosePicReviewedAt,
    existingReviewedById: existing?.glucosePicReviewedById,
  });

  const item = buildGlucoseItem(
    {
      ...input,
      type,
      glucosePicKey,
      glucosePicReviewStatus: review.reviewStatus,
      glucosePicRejectionReason: review.rejectionReason,
      glucosePicReviewedAt: review.reviewedAt,
      glucosePicReviewedById: review.reviewedById,
    },
    { id: existing?.id, now, createdAt: existing?.createdAt }
  );
  assertGlucoseItem(item);

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ...(existing ? {} : { ConditionExpression: "attribute_not_exists(id)" }),
    })
  );

  if (previousPicKey && glucosePicKey && previousPicKey !== glucosePicKey) {
    await deleteStoredMedia(previousPicKey);
  }

  for (const extra of duplicates) {
    await removeExtraGlucoseLog(extra, item.glucosePicKey);
  }

  return item;
}

async function getGlucoseLogById(id) {
  if (!id) return null;
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return Item || null;
}

async function consolidateSameDateGlucoseLogs(items) {
  const groups = new Map();
  const undated = [];
  for (const item of items || []) {
    const key = glucoseDayTypeKey(item);
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
    rows.sort((a, b) => glucoseLogRecency(b) - glucoseLogRecency(a));
    const latest = rows[0];
    if (rows.length === 1) {
      kept.push(latest);
      continue;
    }

    const photoKey = rows.find((row) => row?.glucosePicKey)?.glucosePicKey || null;
    let saved = latest;
    if ((latest.glucosePicKey || null) !== (photoKey || null)) {
      saved = { ...latest, glucosePicKey: photoKey || null };
      await docClient.send(
        new PutCommand({
          TableName: TABLE,
          Item: saved,
        })
      );
    }

    for (const extra of rows.slice(1)) {
      await removeExtraGlucoseLog(extra, saved.glucosePicKey);
    }
    kept.push(saved);
  }

  return [...kept, ...undated];
}

async function listGlucoseLogsByUser(userId, { page = 1, limit = 50 } = {}) {
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
    items = await consolidateSameDateGlucoseLogs(result.items);
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

function isGlucoseLogVisibleToUser(item) {
  return String(item?.glucosePicReviewStatus || "").toLowerCase() !== "rejected";
}

function toPublicGlucoseLog(item) {
  if (!item) return null;
  return {
    ...item,
    _id: item.id,
    glucosePicUrl: item.glucosePicKey ? resolvePublicUrl(item.glucosePicKey) : null,
  };
}

function toUserGlucoseLog(item) {
  if (!isGlucoseLogVisibleToUser(item)) return null;
  const log = toPublicGlucoseLog(item);
  if (!log) return null;
  return {
    ...log,
    ...alignWeightLogDates(log),
  };
}

async function listGlucoseLogsForUserView(userId, { page = 1, limit = 50 } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);

  let dbPage = 1;
  const dbLimit = 200;
  let allItems = [];
  let dbTotal = 0;
  let dbPages = 1;

  do {
    const result = await listGlucoseLogsByUser(userId, { page: dbPage, limit: dbLimit });
    allItems = allItems.concat(result.items || []);
    dbTotal = result.pagination?.total ?? allItems.length;
    dbPages = result.pagination?.pages ?? 1;
    if (allItems.length >= dbTotal) break;
    dbPage += 1;
  } while (dbPage <= dbPages);

  const visible = allItems.filter(isGlucoseLogVisibleToUser);
  const start = (safePage - 1) * safeLimit;
  const pageItems = visible.slice(start, start + safeLimit);

  return {
    items: pageItems,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: visible.length,
      pages: Math.max(1, Math.ceil(visible.length / safeLimit)),
    },
  };
}

async function reviewGlucoseLogPhoto(userId, logId, { status, reviewedById, rejectionReason } = {}) {
  return applyPhotoReviewUpdate({
    getItem: getGlucoseLogById,
    picKeyField: "glucosePicKey",
    reviewFields: {
      status: "glucosePicReviewStatus",
      reason: "glucosePicRejectionReason",
      reviewedAt: "glucosePicReviewedAt",
      reviewedById: "glucosePicReviewedById",
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
  buildGlucoseItem,
  createGlucoseLog,
  getGlucoseLogById,
  listGlucoseLogsByUser,
  listGlucoseLogsForUserView,
  isGlucoseLogVisibleToUser,
  reviewGlucoseLogPhoto,
  toPublicGlucoseLog,
  toUserGlucoseLog,
};
