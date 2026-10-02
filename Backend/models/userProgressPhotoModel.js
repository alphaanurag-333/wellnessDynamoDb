const { v4: uuidv4 } = require("uuid");
const { PutCommand, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { queryPartition } = require("../utils/dynamoList");
const { resolvePublicUrl } = require("../utils/s3");

const TABLE = "UserProgressPhoto";
const PROGRESS_PHOTO_ANGLES = ["front", "right", "left"];
const REVIEW_STATUSES = new Set(["pending", "approved", "rejected"]);

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeReviewStatus(value) {
  const next = String(value || "pending").trim().toLowerCase();
  return REVIEW_STATUSES.has(next) ? next : "pending";
}

function angleReviewFields(item, angle) {
  const hasPic = Boolean(item?.[`${angle}PicKey`]);
  return {
    [`${angle}ReviewStatus`]: hasPic ? normalizeReviewStatus(item[`${angle}ReviewStatus`]) : null,
    [`${angle}ReviewedAt`]: item?.[`${angle}ReviewedAt`] || null,
    [`${angle}ReviewedById`]: item?.[`${angle}ReviewedById`] || null,
    [`${angle}RejectionReason`]: item?.[`${angle}RejectionReason`] || null,
  };
}

function buildProgressPhotoItem(input, { id, now }) {
  return {
    id: id || uuidv4(),
    userId: String(input.userId || "").trim(),
    frontPicKey: input.frontPicKey ? String(input.frontPicKey) : null,
    rightPicKey: input.rightPicKey ? String(input.rightPicKey) : null,
    leftPicKey: input.leftPicKey ? String(input.leftPicKey) : null,
    heightCm: toNumberOrNull(input.heightCm),
    weightKg: toNumberOrNull(input.weightKg),
    frontReviewStatus: "pending",
    rightReviewStatus: "pending",
    leftReviewStatus: "pending",
    recordedAt: input.recordedAt || now,
    createdAt: now,
    updatedAt: now,
  };
}

async function createProgressPhoto(input) {
  const now = new Date().toISOString();
  const item = buildProgressPhotoItem(input, { now });
  if (!item.userId) throw new Error("userId is required");
  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );
  return item;
}

async function getProgressPhotoById(id) {
  if (!id) return null;
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return Item || null;
}

async function listProgressPhotosByUser(userId, { page = 1, limit = 20 } = {}) {
  if (!userId) {
    return { items: [], pagination: { page: 1, limit, total: 0, pages: 1 } };
  }
  return queryPartition({
    tableName: TABLE,
    indexName: "UserIdRecordedAtIndex",
    partitionKeyName: "userId",
    partitionKeyValue: String(userId),
    page,
    limit,
    scanIndexForward: false,
  });
}

async function reviewProgressPhotoAngle(id, angle, { status, reviewedById, rejectionReason } = {}) {
  if (!PROGRESS_PHOTO_ANGLES.includes(angle)) {
    throw new Error("angle must be front, right, or left");
  }
  const nextStatus = normalizeReviewStatus(status);
  if (nextStatus === "pending") throw new Error("status must be approved or rejected");

  const now = new Date().toISOString();
  const reason = nextStatus === "rejected"
    ? String(rejectionReason || "").trim() || null
    : null;

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression:
        "SET #status = :status, #reviewedAt = :reviewedAt, #reviewedById = :reviewedById, #reason = :reason, updatedAt = :updatedAt",
      ConditionExpression: "attribute_exists(id)",
      ExpressionAttributeNames: {
        "#status": `${angle}ReviewStatus`,
        "#reviewedAt": `${angle}ReviewedAt`,
        "#reviewedById": `${angle}ReviewedById`,
        "#reason": `${angle}RejectionReason`,
      },
      ExpressionAttributeValues: {
        ":status": nextStatus,
        ":reviewedAt": now,
        ":reviewedById": reviewedById || null,
        ":reason": reason,
        ":updatedAt": now,
      },
      ReturnValues: "ALL_NEW",
    })
  );
  return Attributes;
}

function toPublicProgressPhoto(item) {
  if (!item) return null;
  return {
    ...item,
    _id: item.id,
    frontPicUrl: item.frontPicKey ? resolvePublicUrl(item.frontPicKey) : null,
    rightPicUrl: item.rightPicKey ? resolvePublicUrl(item.rightPicKey) : null,
    leftPicUrl: item.leftPicKey ? resolvePublicUrl(item.leftPicKey) : null,
    ...angleReviewFields(item, "front"),
    ...angleReviewFields(item, "right"),
    ...angleReviewFields(item, "left"),
  };
}

module.exports = {
  TABLE,
  PROGRESS_PHOTO_ANGLES,
  normalizeReviewStatus,
  buildProgressPhotoItem,
  createProgressPhoto,
  getProgressPhotoById,
  listProgressPhotosByUser,
  reviewProgressPhotoAngle,
  toPublicProgressPhoto,
};
