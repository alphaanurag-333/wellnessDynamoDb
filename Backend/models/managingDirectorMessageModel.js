const { PutCommand, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { normalizeMediaField, resolveMediaFields } = require("../utils/s3");
const {
  normalizeMediaItemFromStorage,
  legacyFieldsToRemoveOnUpdate,
  normalizeUpdateFieldName,
} = require("../utils/mediaFieldAliases");

const MANAGING_DIRECTOR_MESSAGE_ID = "managing-director-message";
const MEDIA_FIELDS = ["profileImage", "video"];
const TABLE = "ManagingDirectorMessage";
const TYPE = new Set(["link", "video"]);
const STATUS = new Set(["active", "inactive"]);

function normalizeType(value, fallback = "link") {
  const next = String(value || fallback).toLowerCase().trim();
  return TYPE.has(next) ? next : fallback;
}

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUS.has(next) ? next : fallback;
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function toPublicManagingDirectorMessage(item) {
  const row = withLegacyId(normalizeMediaItemFromStorage(item));
  return row ? resolveMediaFields(row, MEDIA_FIELDS) : null;
}

function sanitizeUpdateField(key, value) {
  const field = normalizeUpdateFieldName(key);
  if (field === "type") return normalizeType(value);
  if (field === "status") return normalizeStatus(value);
  if (field === "profileImage" || field === "video") {
    if (value == null || String(value).trim() === "") return "";
    return normalizeMediaField(value, field);
  }
  if (["name", "designation", "message", "ytLink"].includes(field)) return String(value).trim();
  return value;
}

async function createManagingDirectorMessageShell() {
  const now = new Date().toISOString();
  const item = {
    id: MANAGING_DIRECTOR_MESSAGE_ID,
    name: "",
    designation: "Managing Director",
    profileImage: "",
    message: "",
    ytLink: "",
    video: "",
    type: "link",
    status: "active",
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

  return item;
}

async function getManagingDirectorMessageRecord() {
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { id: MANAGING_DIRECTOR_MESSAGE_ID },
    })
  );
  return withLegacyId(normalizeMediaItemFromStorage(Item || null));
}

async function getManagingDirectorMessage() {
  const item = await getManagingDirectorMessageRecord();
  return item ? toPublicManagingDirectorMessage(item) : null;
}

async function updateManagingDirectorMessage(updates) {
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
      Key: { id: MANAGING_DIRECTOR_MESSAGE_ID },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    })
  );

  return toPublicManagingDirectorMessage(Attributes || null);
}

module.exports = {
  MANAGING_DIRECTOR_MESSAGE_ID,
  normalizeType,
  normalizeStatus,
  createManagingDirectorMessageShell,
  getManagingDirectorMessage,
  getManagingDirectorMessageRecord,
  updateManagingDirectorMessage,
  toPublicManagingDirectorMessage,
};
