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
} = require("../utils/dynamoList");
const {
  enrichRealPeopleTestimonial,
  enrichRealPeopleTestimonials,
} = require("../services/realPeopleTestimonialEnrichment");

const TABLE = "RealPeopleTestimonial";
const STATUS = new Set(["active", "inactive"]);
const APPROVAL_STATUS = new Set(["pending", "approved", "rejected"]);
const SUBMITTED_BY_ROLES = new Set([
  "user",
  "wellness_coach",
  "assistant_wellness_coach",
  "admin",
]);

function normalizeStatus(value, fallback = "inactive") {
  const next = String(value || fallback).trim().toLowerCase();
  return STATUS.has(next) ? next : fallback;
}

function normalizeApprovalStatus(value, fallback = "pending") {
  const next = String(value || fallback).trim().toLowerCase();
  return APPROVAL_STATUS.has(next) ? next : fallback;
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function sanitizeStars(value) {
  const stars = Number(value);
  if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
    throw new Error("stars must be a number between 1 and 5");
  }
  return Math.round(stars);
}

function sanitizeReview(value) {
  const review = String(value || "").trim();
  if (!review) throw new Error("review is required");
  if (review.length < 5) throw new Error("review must be at least 5 characters");
  if (review.length > 500) throw new Error("review cannot exceed 500 characters");
  return review;
}

function sanitizeUserId(value) {
  const userId = String(value || "").trim();
  if (!userId) throw new Error("userId is required");
  return userId;
}

function sanitizeCreateInput(input = {}) {
  return {
    userId: sanitizeUserId(input.userId),
    review: sanitizeReview(input.review ?? input.content),
    stars: sanitizeStars(input.stars ?? input.rating),
    status: normalizeStatus(input.status, "inactive"),
    approvalStatus: normalizeApprovalStatus(input.approvalStatus, "pending"),
    submittedByRole: SUBMITTED_BY_ROLES.has(String(input.submittedByRole || "").trim())
      ? String(input.submittedByRole).trim()
      : "user",
    managedByCoachId: input.managedByCoachId ? String(input.managedByCoachId).trim() : null,
    assignedCoachType: input.assignedCoachType ? String(input.assignedCoachType).trim() : null,
    assignedCoachId: input.assignedCoachId ? String(input.assignedCoachId).trim() : null,
    reviewedAt: input.reviewedAt || null,
    reviewedByRole: input.reviewedByRole || null,
    reviewedById: input.reviewedById || null,
    rejectionReason: input.rejectionReason ? String(input.rejectionReason).trim() : null,
  };
}

async function createRealPeopleTestimonial(input) {
  const data = sanitizeCreateInput(input);
  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  if (!item.managedByCoachId) delete item.managedByCoachId;
  if (!item.assignedCoachType) delete item.assignedCoachType;
  if (!item.assignedCoachId) delete item.assignedCoachId;
  if (!item.reviewedAt) delete item.reviewedAt;
  if (!item.reviewedByRole) delete item.reviewedByRole;
  if (!item.reviewedById) delete item.reviewedById;
  if (!item.rejectionReason) delete item.rejectionReason;

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );
  return enrichRealPeopleTestimonial(withLegacyId(item));
}

async function getRealPeopleTestimonialRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function getRealPeopleTestimonialById(id) {
  const item = await getRealPeopleTestimonialRecordById(id);
  return item ? enrichRealPeopleTestimonial(item) : null;
}

async function updateRealPeopleTestimonial(id, updates) {
  const blockedFields = new Set(["id", "_id", "createdAt"]);
  const entries = Object.entries(updates || {}).filter(
    ([k, v]) => !blockedFields.has(k) && v !== undefined
  );
  if (entries.length === 0) throw new Error("No valid fields provided for update");

  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let setExpr = "SET updatedAt = :updatedAt";

  for (const [key, value] of entries) {
    let next = value;
    if (key === "stars" || key === "rating") next = sanitizeStars(value);
    if (key === "review" || key === "content") next = sanitizeReview(value);
    if (key === "userId") next = sanitizeUserId(value);
    if (key === "rejectionReason") next = String(value).trim();
    if (key === "status") next = normalizeStatus(value);
    if (key === "approvalStatus") next = normalizeApprovalStatus(value);

    const field = key === "content" ? "review" : key === "rating" ? "stars" : key;
    exprNames[`#${field}`] = field;
    exprValues[`:${field}`] = next;
    setExpr += `, #${field} = :${field}`;
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
  return enrichRealPeopleTestimonial(Attributes || null);
}

async function deleteRealPeopleTestimonial(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

async function listRealPeopleTestimonials({
  page = 1,
  limit = 10,
  status,
  approvalStatus,
  search,
  managedByCoachId,
  userId,
  publicOnly = false,
} = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const normalizedApproval = approvalStatus ? normalizeApprovalStatus(approvalStatus, "") : "";
  const normalizedCoachId = String(managedByCoachId || "").trim();
  const normalizedUserId = String(userId || "").trim();
  const searchFilter = buildContainsFilter(["review"], search);

  let indexName = "StatusCreatedAtIndex";
  let partitionKeyName = "status";
  let partitionKeyValue = normalizedStatus || undefined;

  if (normalizedApproval) {
    indexName = "ApprovalStatusCreatedAtIndex";
    partitionKeyName = "approvalStatus";
    partitionKeyValue = normalizedApproval;
  } else if (normalizedCoachId) {
    indexName = "ManagedByCoachIdCreatedAtIndex";
    partitionKeyName = "managedByCoachId";
    partitionKeyValue = normalizedCoachId;
  } else if (normalizedUserId) {
    indexName = "UserIdCreatedAtIndex";
    partitionKeyName = "userId";
    partitionKeyValue = normalizedUserId;
  }

  let filterExpression = searchFilter.filterExpression;
  const exprNames = { ...searchFilter.exprNames };
  const exprValues = { ...searchFilter.exprValues };

  if (normalizedStatus && partitionKeyName !== "status") {
    exprNames["#status"] = "status";
    exprValues[":status"] = normalizedStatus;
    filterExpression = appendFilter(filterExpression, "#status = :status");
  }

  if (normalizedApproval && partitionKeyName !== "approvalStatus") {
    exprNames["#approvalStatus"] = "approvalStatus";
    exprValues[":approvalStatus"] = normalizedApproval;
    filterExpression = appendFilter(filterExpression, "#approvalStatus = :approvalStatus");
  }

  if (publicOnly) {
    exprNames["#approvalStatus"] = "approvalStatus";
    exprValues[":approvalStatus"] = "approved";
    filterExpression = appendFilter(filterExpression, "#approvalStatus = :approvalStatus");
  }

  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName,
    partitionKeyName,
    partitionKeyValue,
    filterExpression,
    exprNames,
    exprValues,
    search: searchFilter.search,
    searchFields: searchFilter.searchFields,
    scanIndexForward: false,
    page,
    limit,
    maxLimit: 200,
    sortFn: sortByCreatedAtDesc,
  });

  return {
    realPeopleTestimonials: await enrichRealPeopleTestimonials(items),
    pagination,
  };
}

async function reviewRealPeopleTestimonial(id, { approvalStatus, reviewedByRole, reviewedById, rejectionReason }) {
  const nextApproval = normalizeApprovalStatus(approvalStatus);
  if (!["approved", "rejected"].includes(nextApproval)) {
    throw new Error("approvalStatus must be approved or rejected");
  }

  return updateRealPeopleTestimonial(id, {
    approvalStatus: nextApproval,
    reviewedAt: new Date().toISOString(),
    reviewedByRole: String(reviewedByRole || "").trim(),
    reviewedById: String(reviewedById || "").trim(),
    rejectionReason: nextApproval === "rejected" ? String(rejectionReason || "").trim() : "",
    status: nextApproval === "approved" ? "active" : "inactive",
  });
}

module.exports = {
  TABLE,
  normalizeStatus,
  normalizeApprovalStatus,
  createRealPeopleTestimonial,
  getRealPeopleTestimonialById,
  getRealPeopleTestimonialRecordById,
  updateRealPeopleTestimonial,
  deleteRealPeopleTestimonial,
  listRealPeopleTestimonials,
  reviewRealPeopleTestimonial,
};
