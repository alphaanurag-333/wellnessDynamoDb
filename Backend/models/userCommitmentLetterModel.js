const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const {
  listByPartitionKey,
  buildContainsFilter,
  appendFilter,
  sortByCreatedAtDesc,
  paginateItems,
} = require("../utils/dynamoList");
const {
  enrichUserCommitmentLetter,
  enrichUserCommitmentLetters,
} = require("../services/userCommitmentLetterEnrichment");

const TABLE = "UserCommitmentLetter";
const APPROVAL_STATUS = new Set(["pending", "approved", "rejected"]);

function normalizeApprovalStatus(value, fallback = "pending") {
  const next = String(value || fallback).trim().toLowerCase();
  return APPROVAL_STATUS.has(next) ? next : fallback;
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function sanitizeUserId(value) {
  const userId = String(value || "").trim();
  if (!userId) throw new Error("userId is required");
  return userId;
}

function sanitizePdfKey(value) {
  const pdfKey = String(value || "").trim();
  if (!pdfKey) throw new Error("pdfKey is required");
  return pdfKey;
}

function sanitizeCreateInput(input = {}) {
  return {
    userId: sanitizeUserId(input.userId),
    pdfKey: sanitizePdfKey(input.pdfKey),
    approvalStatus: normalizeApprovalStatus(input.approvalStatus, "pending"),
    managedByCoachId: input.managedByCoachId ? String(input.managedByCoachId).trim() : null,
    assignedCoachType: input.assignedCoachType ? String(input.assignedCoachType).trim() : null,
    assignedCoachId: input.assignedCoachId ? String(input.assignedCoachId).trim() : null,
    reviewedAt: input.reviewedAt || null,
    reviewedByRole: input.reviewedByRole || null,
    reviewedById: input.reviewedById || null,
    rejectionReason: input.rejectionReason ? String(input.rejectionReason).trim() : null,
    resubmissionCount: Number(input.resubmissionCount) || 0,
  };
}

function stripOptionalFields(item) {
  const next = { ...item };
  for (const key of [
    "managedByCoachId",
    "assignedCoachType",
    "assignedCoachId",
    "reviewedAt",
    "reviewedByRole",
    "reviewedById",
    "rejectionReason",
  ]) {
    if (!next[key]) delete next[key];
  }
  return next;
}

async function createUserCommitmentLetter(input) {
  const data = sanitizeCreateInput(input);
  const now = new Date().toISOString();
  const item = stripOptionalFields({
    id: uuidv4(),
    ...data,
    createdAt: now,
    updatedAt: now,
  });

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );
  return enrichUserCommitmentLetter(withLegacyId(item));
}

async function getUserCommitmentLetterRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function getUserCommitmentLetterById(id) {
  const item = await getUserCommitmentLetterRecordById(id);
  return item ? enrichUserCommitmentLetter(item) : null;
}

async function getLatestUserCommitmentLetterByUserId(userId) {
  const normalizedUserId = sanitizeUserId(userId);
  const { items } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "UserIdCreatedAtIndex",
    partitionKeyName: "userId",
    partitionKeyValue: normalizedUserId,
    scanIndexForward: false,
    page: 1,
    limit: 1,
    maxLimit: 1,
    sortFn: sortByCreatedAtDesc,
  });
  const record = items[0] || null;
  return record ? enrichUserCommitmentLetter(withLegacyId(record)) : null;
}

async function updateUserCommitmentLetter(id, updates) {
  const blockedFields = new Set(["id", "_id", "createdAt", "userId"]);
  const entries = Object.entries(updates || {}).filter(
    ([k, v]) => !blockedFields.has(k) && v !== undefined
  );
  if (entries.length === 0) throw new Error("No valid fields provided for update");

  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let setExpr = "SET updatedAt = :updatedAt";

  for (const [key, value] of entries) {
    let next = value;
    if (key === "pdfKey") next = sanitizePdfKey(value);
    if (key === "rejectionReason") next = String(value).trim();
    if (key === "approvalStatus") next = normalizeApprovalStatus(value);
    if (key === "resubmissionCount") next = Number(value) || 0;

    exprNames[`#${key}`] = key;
    exprValues[`:${key}`] = next;
    setExpr += `, #${key} = :${key}`;
  }

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression: setExpr,
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    })
  );

  return enrichUserCommitmentLetter(Attributes);
}

async function deleteUserCommitmentLetter(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

async function listUserCommitmentLetters({
  page = 1,
  limit = 10,
  approvalStatus,
  search,
  managedByCoachId,
  userId,
} = {}) {
  const normalizedApproval = approvalStatus ? normalizeApprovalStatus(approvalStatus, "") : "";
  const normalizedCoachId = String(managedByCoachId || "").trim();
  const normalizedUserId = String(userId || "").trim();
  const searchFilter = buildContainsFilter(["rejectionReason"], search);
  const queryPage = searchFilter.search ? 1 : page;
  const queryLimit = searchFilter.search ? Number.MAX_SAFE_INTEGER : limit;
  const queryMaxLimit = searchFilter.search ? Number.MAX_SAFE_INTEGER : 200;

  let indexName = "ApprovalStatusCreatedAtIndex";
  let partitionKeyName = "approvalStatus";
  let partitionKeyValue = normalizedApproval || undefined;
  let statusPartitions = ["pending", "approved", "rejected"];

  if (normalizedCoachId) {
    indexName = "ManagedByCoachIdCreatedAtIndex";
    partitionKeyName = "managedByCoachId";
    partitionKeyValue = normalizedCoachId;
    statusPartitions = undefined;
  } else if (normalizedUserId) {
    indexName = "UserIdCreatedAtIndex";
    partitionKeyName = "userId";
    partitionKeyValue = normalizedUserId;
    statusPartitions = undefined;
  }

  let filterExpression = searchFilter.filterExpression;
  const exprNames = { ...searchFilter.exprNames };
  const exprValues = { ...searchFilter.exprValues };

  if (normalizedApproval && partitionKeyName !== "approvalStatus") {
    exprNames["#approvalStatus"] = "approvalStatus";
    exprValues[":approvalStatus"] = normalizedApproval;
    filterExpression = appendFilter(filterExpression, "#approvalStatus = :approvalStatus");
  }

  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName,
    partitionKeyName,
    partitionKeyValue,
    statusPartitions: partitionKeyValue ? undefined : statusPartitions,
    filterExpression,
    exprNames,
    exprValues,
    search: searchFilter.search,
    searchFields: searchFilter.searchFields,
    scanIndexForward: false,
    page: queryPage,
    limit: queryLimit,
    maxLimit: queryMaxLimit,
    sortFn: sortByCreatedAtDesc,
  });

  let commitmentLetters = await enrichUserCommitmentLetters(items);

  if (searchFilter.search) {
    const paged = paginateItems(commitmentLetters, page, limit, 200);
    return {
      commitmentLetters: paged.items,
      pagination: paged.pagination,
    };
  }

  return {
    commitmentLetters,
    pagination,
  };
}

async function resubmitUserCommitmentLetter(id, { pdfKey, resubmissionCount }) {
  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression:
        "SET pdfKey = :pdfKey, approvalStatus = :approvalStatus, resubmissionCount = :resubmissionCount, updatedAt = :updatedAt REMOVE reviewedAt, reviewedByRole, reviewedById, rejectionReason",
      ExpressionAttributeValues: {
        ":pdfKey": sanitizePdfKey(pdfKey),
        ":approvalStatus": "pending",
        ":resubmissionCount": Number(resubmissionCount) || 0,
        ":updatedAt": new Date().toISOString(),
      },
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    })
  );
  return enrichUserCommitmentLetter(Attributes);
}

async function reviewUserCommitmentLetter(id, { approvalStatus, reviewedByRole, reviewedById, rejectionReason }) {
  const nextApproval = normalizeApprovalStatus(approvalStatus);
  if (!["approved", "rejected"].includes(nextApproval)) {
    throw new Error("approvalStatus must be approved or rejected");
  }

  return updateUserCommitmentLetter(id, {
    approvalStatus: nextApproval,
    reviewedAt: new Date().toISOString(),
    reviewedByRole: String(reviewedByRole || "").trim(),
    reviewedById: String(reviewedById || "").trim(),
    rejectionReason: nextApproval === "rejected" ? String(rejectionReason || "").trim() : "",
  });
}

module.exports = {
  TABLE,
  normalizeApprovalStatus,
  createUserCommitmentLetter,
  getUserCommitmentLetterById,
  getUserCommitmentLetterRecordById,
  getLatestUserCommitmentLetterByUserId,
  updateUserCommitmentLetter,
  resubmitUserCommitmentLetter,
  deleteUserCommitmentLetter,
  listUserCommitmentLetters,
  reviewUserCommitmentLetter,
};
