const {
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const { docClient } = require("../config/db");
const { resolvePublicUrl, deleteStoredMedia } = require("../utils/s3");

const TABLE = "DietPlan";
const CREATED_BY_ROLES = new Set(["wellness_coach", "assistant_wellness_coach"]);
const DEFAULT_TITLE = "Diet Plan";

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function normalizeCreatedByRole(value, fallback = "wellness_coach") {
  const next = String(value || fallback).trim().toLowerCase();
  return CREATED_BY_ROLES.has(next) ? next : fallback;
}

function normalizeTitle(value) {
  const title = String(value || DEFAULT_TITLE).trim();
  if (!title) {
    const err = new Error("title is required");
    err.name = "ValidationError";
    throw err;
  }
  if (title.length > 120) {
    const err = new Error("title cannot exceed 120 characters");
    err.name = "ValidationError";
    throw err;
  }
  return title;
}

function normalizeNote(value) {
  if (value === undefined || value === null) return null;
  const note = String(value).trim();
  if (!note) return null;
  if (note.length > 2000) {
    const err = new Error("note cannot exceed 2000 characters");
    err.name = "ValidationError";
    throw err;
  }
  return note;
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

function toDietPlanPublic(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  return {
    id: row.id,
    _id: row._id,
    userId: row.userId,
    coachId: row.coachId,
    title: row.title,
    note: row.note ?? null,
    fileKey: row.fileKey,
    fileUrl: resolvePublicUrl(row.fileKey),
    createdByRole: normalizeCreatedByRole(row.createdByRole),
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function createDietPlan({
  userId,
  coachId,
  title,
  note,
  fileKey,
  createdByRole = "wellness_coach",
  createdById,
}) {
  const uid = String(userId || "").trim();
  const parentCoachId = String(coachId || "").trim();
  const creatorId = String(createdById || "").trim();
  if (!uid) throw new Error("userId is required");
  if (!parentCoachId) throw new Error("coachId is required");
  if (!creatorId) throw new Error("createdById is required");

  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    userId: uid,
    coachId: parentCoachId,
    title: normalizeTitle(title),
    note: normalizeNote(note),
    fileKey: normalizeFileKey(fileKey),
    createdByRole: normalizeCreatedByRole(createdByRole),
    createdById: creatorId,
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

  return toDietPlanPublic(item);
}

async function getDietPlanRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function getDietPlanById(id) {
  const item = await getDietPlanRecordById(id);
  return item ? toDietPlanPublic(item) : null;
}

async function queryDietPlansByUserId(userId) {
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

async function listDietPlansByUserId(userId) {
  const items = await queryDietPlansByUserId(userId);
  return items.map((row) => toDietPlanPublic(row)).filter(Boolean);
}

async function deleteDietPlan(id) {
  const record = await getDietPlanRecordById(id);
  if (!record) {
    const err = new Error("Diet plan not found");
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

  return toDietPlanPublic(record);
}

module.exports = {
  createDietPlan,
  getDietPlanById,
  getDietPlanRecordById,
  listDietPlansByUserId,
  deleteDietPlan,
  toDietPlanPublic,
  normalizeTitle,
  normalizeNote,
  normalizeCreatedByRole,
};
