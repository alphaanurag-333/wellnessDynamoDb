const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const { normalizeStoredMedia, resolvePublicUrl } = require("../utils/s3");
const {
  normalizeMediaItemFromStorage,
  legacyFieldsToRemoveOnUpdate,
  normalizeUpdateFieldName,
} = require("../utils/mediaFieldAliases");
const {
  listByPartitionKey,
  buildContainsFilter,
  sortByCreatedAtDesc,
} = require("../utils/dynamoList");

const TABLE = "LeadershipNotes";
const STATUS = new Set(["active", "inactive"]);
const DEFAULT_BADGE = "A NOTE FROM LEADERSHIP";

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUS.has(next) ? next : fallback;
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function normalizeProfileImageField(value) {
  if (value == null || String(value).trim() === "") return "";
  const objectKey = normalizeStoredMedia(String(value).trim());
  if (!objectKey) {
    throw new Error("profileImage must be a valid S3 object key (e.g. leadership-notes/photo.jpg)");
  }
  return objectKey;
}

function toPublicLeadershipNote(item) {
  const row = withLegacyId(normalizeMediaItemFromStorage(item));
  if (!row) return null;
  if (row.profileImage) row.profileImage = resolvePublicUrl(row.profileImage);
  return row;
}

function sanitizeUpdateField(key, value) {
  const field = normalizeUpdateFieldName(key);
  if (field === "profileImage") return normalizeProfileImageField(value);
  if (["name", "designation", "title", "badge", "message"].includes(field)) {
    return String(value ?? "").trim();
  }
  if (field === "status") return normalizeStatus(value);
  return value;
}

async function createLeadershipNote({
  name,
  designation,
  title,
  badge,
  message,
  profileImage,
  profile_image,
  status = "active",
}) {
  const now = new Date().toISOString();
  const imageKey = normalizeProfileImageField(profileImage ?? profile_image);
  const designationText = String(designation || "").trim();
  const item = {
    id: uuidv4(),
    name: String(name || "").trim(),
    designation: designationText,
    title: String(title || "").trim() || designationText,
    badge: String(badge || "").trim() || DEFAULT_BADGE,
    message: String(message || "").trim(),
    profileImage: imageKey,
    status: normalizeStatus(status),
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
  return toPublicLeadershipNote(item);
}

async function getLeadershipNoteRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { id },
    })
  );
  return withLegacyId(normalizeMediaItemFromStorage(Item || null));
}

async function getLeadershipNoteById(id) {
  const item = await getLeadershipNoteRecordById(id);
  return item ? toPublicLeadershipNote(item) : null;
}

async function updateLeadershipNote(id, updates) {
  const blockedFields = new Set(["id", "_id", "createdAt"]);
  const entries = Object.entries(updates || {})
    .filter(([k, v]) => !blockedFields.has(k) && v !== undefined)
    .map(([k, v]) => [normalizeUpdateFieldName(k), sanitizeUpdateField(k, v)]);

  if (entries.length === 0) throw new Error("No valid fields provided for update");

  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let setExpr = "SET updatedAt = :updatedAt";

  for (const [k, v] of entries) {
    exprNames[`#${k}`] = k;
    exprValues[`:${k}`] = v;
    setExpr += `, #${k} = :${k}`;
  }

  const removeFields = legacyFieldsToRemoveOnUpdate(Object.fromEntries(entries));
  let updateExpression = setExpr;
  if (removeFields.length > 0) {
    updateExpression += ` REMOVE ${removeFields.join(", ")}`;
  }

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    })
  );
  return toPublicLeadershipNote(Attributes || null);
}

async function deleteLeadershipNote(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

async function listLeadershipNotes({ page = 1, limit = 10, status, search } = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const searchFilter = buildContainsFilter(["name", "designation", "title", "message"], search);
  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: normalizedStatus || undefined,
    filterExpression: searchFilter.filterExpression,
    exprNames: searchFilter.exprNames,
    exprValues: searchFilter.exprValues,
    search: searchFilter.search,
    searchFields: searchFilter.searchFields,
    scanIndexForward: false,
    page,
    limit,
    maxLimit: 200,
    sortFn: sortByCreatedAtDesc,
  });

  return {
    leadershipNotes: items.map((row) => toPublicLeadershipNote(row)),
    pagination,
  };
}

module.exports = {
  TABLE,
  DEFAULT_BADGE,
  normalizeStatus,
  createLeadershipNote,
  getLeadershipNoteById,
  getLeadershipNoteRecordById,
  updateLeadershipNote,
  deleteLeadershipNote,
  listLeadershipNotes,
};
