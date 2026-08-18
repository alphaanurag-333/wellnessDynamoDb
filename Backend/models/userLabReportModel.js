const {
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const { resolvePublicUrl, deleteStoredMedia } = require("../utils/s3");

const TABLE = "UserLabReport";

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function normalizeReportDate(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    const err = new Error("reportDate is required");
    err.name = "ValidationError";
    throw err;
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    const err = new Error("reportDate must be a valid date");
    err.name = "ValidationError";
    throw err;
  }
  return d.toISOString().slice(0, 10);
}

function normalizeFileKey(value) {
  const fileKey = String(value || "").trim();
  if (!fileKey) {
    const err = new Error("fileKey is required");
    err.name = "ValidationError";
    throw err;
  }
  return fileKey;
}

function toUserLabReportPublic(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  return {
    id: row.id,
    _id: row._id,
    userId: row.userId,
    reportDate: row.reportDate,
    fileKey: row.fileKey,
    fileUrl: resolvePublicUrl(row.fileKey),
    reviewStatus: row.reviewStatus === "reviewed" ? "reviewed" : "pending",
    reviewedAt: row.reviewedAt || null,
    reviewedById: row.reviewedById || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function createUserLabReport({ userId, reportDate, fileKey }) {
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("userId is required");

  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    userId: uid,
    reportDate: normalizeReportDate(reportDate),
    fileKey: normalizeFileKey(fileKey),
    reviewStatus: "pending",
    reviewedAt: null,
    reviewedById: null,
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

  return toUserLabReportPublic(item);
}

async function getUserLabReportRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function getUserLabReportById(id) {
  const item = await getUserLabReportRecordById(id);
  return item ? toUserLabReportPublic(item) : null;
}

async function queryUserLabReportsByUserId(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return [];

  const items = [];
  let lastKey;

  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: "UserCreatedAtIndex",
        KeyConditionExpression: "#userId = :userId",
        ExpressionAttributeNames: { "#userId": "userId" },
        ExpressionAttributeValues: { ":userId": uid },
        ScanIndexForward: false,
        ExclusiveStartKey: lastKey,
      })
    );

    items.push(...(Items || []));
    lastKey = LastEvaluatedKey;
  } while (lastKey);

  return items;
}

async function listUserLabReportsByUserId(userId) {
  const items = await queryUserLabReportsByUserId(userId);
  return items.map((row) => toUserLabReportPublic(row)).filter(Boolean);
}

async function deleteUserLabReport(id) {
  const record = await getUserLabReportRecordById(id);
  if (!record) {
    const err = new Error("Lab report not found");
    err.name = "NotFoundError";
    throw err;
  }

  if (record.fileKey) {
    await deleteStoredMedia(record.fileKey);
  }

  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );

  return toUserLabReportPublic(record);
}

async function reviewUserLabReport(id, { reviewedById } = {}) {
  const record = await getUserLabReportRecordById(id);
  if (!record) {
    const err = new Error("Lab report not found");
    err.name = "NotFoundError";
    throw err;
  }
  const now = new Date().toISOString();
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id: String(id) },
      UpdateExpression:
        "SET reviewStatus = :reviewStatus, reviewedAt = :reviewedAt, reviewedById = :reviewedById, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":reviewStatus": "reviewed",
        ":reviewedAt": now,
        ":reviewedById": reviewedById ? String(reviewedById) : null,
        ":updatedAt": now,
      },
      ConditionExpression: "attribute_exists(id)",
    })
  );
  return getUserLabReportById(id);
}

module.exports = {
  createUserLabReport,
  getUserLabReportById,
  getUserLabReportRecordById,
  listUserLabReportsByUserId,
  deleteUserLabReport,
  reviewUserLabReport,
  toUserLabReportPublic,
  normalizeReportDate,
};
