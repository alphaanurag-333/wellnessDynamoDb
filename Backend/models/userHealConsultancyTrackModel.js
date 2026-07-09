const { v4: uuidv4 } = require("uuid");
const { PutCommand, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { queryPartition } = require("../utils/dynamoList");

const TABLE = "UserHealConsultancyTrack";

const TRACK_STATUSES = new Set([
  "requested",
  "scheduled",
  "completed",
  "follow_up_needed",
  "cancelled",
]);

const MAX_CONCERN_LENGTH = 500;
const MAX_NOTES_LENGTH = 1000;

function normalizeTrackStatus(value, fallback = "requested") {
  const next = String(value || fallback).toLowerCase().trim();
  return TRACK_STATUSES.has(next) ? next : null;
}

function normalizeOptionalText(value, maxLen) {
  if (value == null || value === "") return null;
  const text = String(value).trim();
  if (!text) return null;
  if (text.length > maxLen) {
    const err = new Error(`Text must be at most ${maxLen} characters`);
    err.name = "ValidationError";
    throw err;
  }
  return text;
}

function normalizeScheduledAt(value) {
  if (value == null || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const err = new Error("scheduledAt must be a valid date");
    err.name = "ValidationError";
    throw err;
  }
  return date.toISOString();
}

function toPublicHealConsultancyTrack(item) {
  if (!item) return null;
  return {
    ...item,
    _id: item.id,
  };
}

function buildHealConsultancyTrackItem(input, { id, now }) {
  const status = normalizeTrackStatus(input.status, "requested");
  if (!status) {
    const err = new Error("Invalid consultancy track status");
    err.name = "ValidationError";
    throw err;
  }

  return {
    id: id || uuidv4(),
    userId: String(input.userId || "").trim(),
    parentCoachId: input.parentCoachId ? String(input.parentCoachId) : null,
    assignedCoachId: input.assignedCoachId ? String(input.assignedCoachId) : null,
    assignedCoachType: input.assignedCoachType ? String(input.assignedCoachType) : null,
    status,
    concern: normalizeOptionalText(input.concern, MAX_CONCERN_LENGTH),
    scheduledAt: normalizeScheduledAt(input.scheduledAt),
    meetingLink: normalizeOptionalText(input.meetingLink, 500),
    coachNotes: normalizeOptionalText(input.coachNotes, MAX_NOTES_LENGTH),
    statusUpdatedByRole: input.statusUpdatedByRole ? String(input.statusUpdatedByRole) : null,
    statusUpdatedById: input.statusUpdatedById ? String(input.statusUpdatedById) : null,
    createdAt: now,
    updatedAt: now,
  };
}

async function createHealConsultancyTrack(input) {
  const now = new Date().toISOString();
  const item = buildHealConsultancyTrackItem(input, { now });
  if (!item.userId) throw new Error("userId is required");
  if (!item.parentCoachId) throw new Error("parentCoachId is required");

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );

  return item;
}

async function getHealConsultancyTrackById(id) {
  if (!id) return null;
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id: String(id) } })
  );
  return Item || null;
}

async function listHealConsultancyTracksByUserId(userId, { page = 1, limit = 20, status } = {}) {
  if (!userId) {
    return { items: [], pagination: { page: 1, limit, total: 0, pages: 1 } };
  }

  const filterParts = [];
  const extraNames = {};
  const extraValues = {};

  if (status) {
    filterParts.push("#status = :status");
    extraNames["#status"] = "status";
    extraValues[":status"] = normalizeTrackStatus(status);
  }

  return queryPartition({
    tableName: TABLE,
    indexName: "UserIdCreatedAtIndex",
    partitionKeyName: "userId",
    partitionKeyValue: String(userId),
    filterExpression: filterParts.length ? filterParts.join(" AND ") : undefined,
    exprNames: extraNames,
    exprValues: extraValues,
    page,
    limit,
    scanIndexForward: false,
  });
}

async function updateHealConsultancyTrack(id, updates) {
  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  const setEntries = [];

  for (const [key, val] of Object.entries(updates)) {
    if (val === undefined) continue;
    setEntries.push([key, val]);
  }

  if (!setEntries.length) {
    const err = new Error("No valid fields provided for update");
    err.name = "ValidationError";
    throw err;
  }

  let updateExpr = "SET updatedAt = :updatedAt";
  for (const [key, val] of setEntries) {
    exprNames[`#${key}`] = key;
    exprValues[`:${key}`] = val;
    updateExpr += `, #${key} = :${key}`;
  }

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id: String(id) },
      UpdateExpression: updateExpr,
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    })
  );

  return Attributes;
}

module.exports = {
  TABLE,
  TRACK_STATUSES,
  MAX_CONCERN_LENGTH,
  MAX_NOTES_LENGTH,
  normalizeTrackStatus,
  toPublicHealConsultancyTrack,
  createHealConsultancyTrack,
  getHealConsultancyTrackById,
  listHealConsultancyTracksByUserId,
  updateHealConsultancyTrack,
};
