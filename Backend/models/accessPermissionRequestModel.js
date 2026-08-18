const { PutCommand, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const { listByPartitionKey } = require("../utils/dynamoList");

const TABLE = "AccessPermissionRequest";
const STATUSES = new Set(["pending", "approved", "rejected", "superseded"]);
const KINDS = new Set(["permission", "role"]);

function normalizeStatus(value, fallback = "pending") {
  const next = String(value || fallback).trim().toLowerCase();
  return STATUSES.has(next) ? next : fallback;
}

function normalizeKind(value, fallback = "permission") {
  const next = String(value || fallback).trim().toLowerCase();
  return KINDS.has(next) ? next : fallback;
}

function formatRequestDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function toPublicAccessRequest(item) {
  if (!item) return null;
  const requesterName = item.requesterName || "Wellness Coach";
  const when = formatRequestDate(item.createdAt);
  return {
    id: item.id,
    kind: item.kind === "role" ? "Role" : "Permission",
    kindKey: normalizeKind(item.kind),
    status: normalizeStatus(item.status),
    title: item.title,
    meta: when ? `Requested by ${requesterName} · ${when}` : `Requested by ${requesterName}`,
    requesterAccountId: item.requesterAccountId || null,
    requesterName,
    targetAccountId: item.targetAccountId,
    targetName: item.targetName || null,
    reset: Boolean(item.reset),
    featureId: item.featureId || null,
    action: item.action || null,
    changeType: item.changeType || null,
    currentGrants: item.currentGrants !== undefined ? item.currentGrants : undefined,
    proposedGrants: item.proposedGrants !== undefined ? item.proposedGrants : undefined,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    reviewedAt: item.reviewedAt || null,
    reviewedByAccountId: item.reviewedByAccountId || null,
    reviewedByName: item.reviewedByName || null,
  };
}

async function createAccessPermissionRequest({
  kind = "permission",
  requesterAccountId,
  requesterName,
  targetAccountId,
  targetName,
  title,
  reset = false,
  featureId = null,
  action = null,
  changeType = null,
  currentGrants,
  proposedGrants,
}) {
  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    status: "pending",
    kind: normalizeKind(kind),
    requesterAccountId: String(requesterAccountId || "").trim(),
    requesterName: String(requesterName || "Wellness Coach").trim() || "Wellness Coach",
    targetAccountId: String(targetAccountId || "").trim(),
    targetName: String(targetName || "").trim() || null,
    title: String(title || "").trim(),
    reset: Boolean(reset),
    createdAt: now,
    updatedAt: now,
  };

  if (!item.requesterAccountId) throw new Error("requesterAccountId is required");
  if (!item.targetAccountId) throw new Error("targetAccountId is required");
  if (!item.title) throw new Error("title is required");

  if (featureId) item.featureId = String(featureId).trim();
  if (action) item.action = String(action).trim();
  if (changeType) item.changeType = String(changeType).trim();
  if (currentGrants !== undefined) item.currentGrants = currentGrants;
  if (proposedGrants !== undefined) item.proposedGrants = proposedGrants;

  await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
  return item;
}

async function getAccessPermissionRequestById(id) {
  const requestId = String(id || "").trim();
  if (!requestId) return null;
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { id: requestId },
    })
  );
  return Item || null;
}

async function listAccessPermissionRequests({
  status = "pending",
  page = 1,
  limit = 50,
} = {}) {
  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyName: "status",
    partitionKeyValue: normalizeStatus(status),
    page,
    limit,
    maxLimit: 200,
  });
  return { items, pagination };
}

async function listRequestsForTarget(targetAccountId, { page = 1, limit = 20 } = {}) {
  const id = String(targetAccountId || "").trim();
  if (!id) return { items: [], pagination: { page: 1, limit, total: 0, pages: 1 } };
  return listByPartitionKey({
    tableName: TABLE,
    indexName: "TargetAccountIdIndex",
    partitionKeyName: "targetAccountId",
    partitionKeyValue: id,
    page,
    limit,
    maxLimit: 100,
  });
}

async function getPendingRequestForTarget(targetAccountId) {
  const pending = await listPendingForTarget(targetAccountId);
  return pending[0] || null;
}

async function listPendingForTarget(targetAccountId) {
  const { items } = await listRequestsForTarget(targetAccountId, { page: 1, limit: 100 });
  return (items || [])
    .filter((row) => row.status === "pending")
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

async function supersedeAllPendingForTarget(targetAccountId) {
  const pending = await listPendingForTarget(targetAccountId);
  for (const row of pending) {
    await updateAccessPermissionRequest(row.id, { status: "superseded" });
  }
  return pending.length;
}

async function supersedePendingForTarget(targetAccountId) {
  return supersedeAllPendingForTarget(targetAccountId);
}

async function updateAccessPermissionRequest(id, updates = {}) {
  const requestId = String(id || "").trim();
  if (!requestId) return null;

  const names = { "#updatedAt": "updatedAt" };
  const values = { ":updatedAt": new Date().toISOString() };
  const sets = ["#updatedAt = :updatedAt"];
  const removes = [];

  const allowed = [
    "status",
    "reviewedAt",
    "reviewedByAccountId",
    "reviewedByName",
    "reviewNote",
    "title",
  ];

  for (const key of allowed) {
    if (!Object.prototype.hasOwnProperty.call(updates, key)) continue;
    if (updates[key] === undefined) {
      removes.push(`#${key}`);
      names[`#${key}`] = key;
      continue;
    }
    names[`#${key}`] = key;
    values[`:${key}`] = key === "status" ? normalizeStatus(updates[key]) : updates[key];
    sets.push(`#${key} = :${key}`);
  }

  let UpdateExpression = `SET ${sets.join(", ")}`;
  if (removes.length) UpdateExpression += ` REMOVE ${removes.join(", ")}`;

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id: requestId },
      UpdateExpression,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: "ALL_NEW",
    })
  );
  return Attributes || null;
}

module.exports = {
  TABLE,
  toPublicAccessRequest,
  createAccessPermissionRequest,
  getAccessPermissionRequestById,
  listAccessPermissionRequests,
  listRequestsForTarget,
  listPendingForTarget,
  getPendingRequestForTarget,
  updateAccessPermissionRequest,
  supersedePendingForTarget,
  supersedeAllPendingForTarget,
};
