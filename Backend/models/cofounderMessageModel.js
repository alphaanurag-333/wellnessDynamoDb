const { PutCommand, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { normalizeMediaField, resolveMediaFields } = require("../utils/s3");
const {
  normalizeMediaItemFromStorage,
  legacyFieldsToRemoveOnUpdate,
  normalizeUpdateFieldName,
} = require("../utils/mediaFieldAliases");

const COFOUNDER_MESSAGE_ID = "cofounder-message";
const MEDIA_FIELDS = ["profileImage", "video"];
const TABLE = "CofounderMessage";
const STATUS = new Set(["active", "inactive"]);
const VIDEO_TYPE = new Set(["none", "link", "video"]);

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUS.has(next) ? next : fallback;
}

function normalizeVideoType(value, fallback = "none") {
  const next = String(value || fallback).toLowerCase().trim();
  return VIDEO_TYPE.has(next) ? next : fallback;
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function toPublicCofounderMessage(item) {
  const row = withLegacyId(normalizeMediaItemFromStorage(item));
  return row ? resolveMediaFields(row, MEDIA_FIELDS) : null;
}

function sanitizeUpdateField(key, value) {
  const field = normalizeUpdateFieldName(key);
  if (field === "status") return normalizeStatus(value);
  if (field === "type") return normalizeVideoType(value);
  if (field === "profileImage" || field === "video") {
    if (value == null || String(value).trim() === "") return "";
    return normalizeMediaField(value, field);
  }
  if (["name", "message", "ytLink"].includes(field)) return String(value).trim();
  return value;
}

async function createCofounderMessageShell() {
  const now = new Date().toISOString();
  const item = {
    id: COFOUNDER_MESSAGE_ID,
    name: "",
    profileImage: "",
    message: "",
    type: "none",
    ytLink: "",
    video: "",
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

async function getCofounderMessageRecord() {
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { id: COFOUNDER_MESSAGE_ID },
    })
  );
  return withLegacyId(normalizeMediaItemFromStorage(Item || null));
}

async function getCofounderMessage() {
  const item = await getCofounderMessageRecord();
  return item ? toPublicCofounderMessage(item) : null;
}

async function updateCofounderMessage(updates) {
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
      Key: { id: COFOUNDER_MESSAGE_ID },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    })
  );

  return toPublicCofounderMessage(Attributes || null);
}

module.exports = {
  COFOUNDER_MESSAGE_ID,
  normalizeStatus,
  createCofounderMessageShell,
  getCofounderMessage,
  getCofounderMessageRecord,
  updateCofounderMessage,
  toPublicCofounderMessage,
};
