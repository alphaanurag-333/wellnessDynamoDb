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

const TABLE = "CoachRecommendedSupplement";
const CREATED_BY_ROLES = new Set(["wellness_coach", "assistant_wellness_coach"]);
const DELIVERY_OPTIONS = new Set(["coach_delivery", "self_billing"]);

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function normalizeCreatedByRole(value, fallback = "wellness_coach") {
  const next = String(value || fallback).trim().toLowerCase();
  return CREATED_BY_ROLES.has(next) ? next : fallback;
}

function normalizeDeliveryOption(value) {
  const next = String(value || "").trim().toLowerCase();
  if (!DELIVERY_OPTIONS.has(next)) {
    const err = new Error("deliveryOption must be coach_delivery or self_billing");
    err.name = "ValidationError";
    throw err;
  }
  return next;
}

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error("At least one supplement item is required");
    err.name = "ValidationError";
    throw err;
  }
  return items.map((item) => {
    const qty = Number(item.qty);
    if (!Number.isFinite(qty) || qty < 1) {
      const err = new Error("Each item must have qty >= 1");
      err.name = "ValidationError";
      throw err;
    }
    return {
      supplementId: String(item.supplementId || "").trim(),
      name: String(item.name || "").trim(),
      unit: String(item.unit || "").trim(),
      packSize: Number(item.packSize) || 0,
      price: Number(item.price) || 0,
      qty: Math.floor(qty),
    };
  });
}

function computeBillingTotal(items) {
  return (items || []).reduce(
    (sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0),
    0
  );
}

function toCoachRecommendedSupplementPublic(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  return {
    id: row.id,
    _id: row._id,
    userId: row.userId,
    coachId: row.coachId,
    items: Array.isArray(row.items) ? row.items : [],
    billingTotal: Number(row.billingTotal) || 0,
    deliveryOption: row.deliveryOption,
    deliveryRequestedAt: row.deliveryRequestedAt ?? null,
    billPdfKey: row.billPdfKey ?? null,
    billPdfUrl: row.billPdfKey ? resolvePublicUrl(row.billPdfKey) : null,
    billUploadedAt: row.billUploadedAt ?? null,
    createdByRole: normalizeCreatedByRole(row.createdByRole),
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function queryCoachRecommendedSupplementsByUserId(userId) {
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

async function listCoachRecommendedSupplementsByUserId(userId) {
  const items = await queryCoachRecommendedSupplementsByUserId(userId);
  return items.map((row) => toCoachRecommendedSupplementPublic(row)).filter(Boolean);
}

async function getCoachRecommendedSupplementRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function getCoachRecommendedSupplementById(id) {
  const item = await getCoachRecommendedSupplementRecordById(id);
  return item ? toCoachRecommendedSupplementPublic(item) : null;
}

async function createCoachRecommendedSupplement({
  userId,
  coachId,
  items,
  deliveryOption,
  createdByRole = "wellness_coach",
  createdById,
}) {
  const uid = String(userId || "").trim();
  const parentCoachId = String(coachId || "").trim();
  const creatorId = String(createdById || "").trim();
  if (!uid) throw new Error("userId is required");
  if (!parentCoachId) throw new Error("coachId is required");
  if (!creatorId) throw new Error("createdById is required");

  const normalizedItems = normalizeItems(items);
  const option = normalizeDeliveryOption(deliveryOption);
  const now = new Date().toISOString();

  const item = {
    id: uuidv4(),
    userId: uid,
    coachId: parentCoachId,
    items: normalizedItems,
    billingTotal: computeBillingTotal(normalizedItems),
    deliveryOption: option,
    deliveryRequestedAt: null,
    billPdfKey: null,
    billUploadedAt: null,
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

  return toCoachRecommendedSupplementPublic(item);
}

async function markDeliveryRequested(id) {
  const record = await getCoachRecommendedSupplementRecordById(id);
  if (!record) {
    const err = new Error("Recommendation not found");
    err.name = "NotFoundError";
    throw err;
  }
  if (record.deliveryOption !== "coach_delivery") {
    const err = new Error("Delivery request is not available for this recommendation");
    err.name = "ValidationError";
    throw err;
  }
  if (record.deliveryRequestedAt) {
    const err = new Error("Delivery has already been requested");
    err.name = "ValidationError";
    throw err;
  }

  const now = new Date().toISOString();
  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression: "SET deliveryRequestedAt = :deliveryRequestedAt, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":deliveryRequestedAt": now,
        ":updatedAt": now,
      },
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    })
  );

  return toCoachRecommendedSupplementPublic(Attributes);
}

async function saveBillPdf(id, billPdfKey) {
  const record = await getCoachRecommendedSupplementRecordById(id);
  if (!record) {
    const err = new Error("Recommendation not found");
    err.name = "NotFoundError";
    throw err;
  }
  if (record.deliveryOption !== "self_billing") {
    const err = new Error("Bill upload is not available for this recommendation");
    err.name = "ValidationError";
    throw err;
  }

  const pdfKey = String(billPdfKey || "").trim();
  if (!pdfKey) {
    const err = new Error("billPdfKey is required");
    err.name = "ValidationError";
    throw err;
  }

  if (record.billPdfKey && record.billPdfKey !== pdfKey) {
    await deleteStoredMedia(record.billPdfKey);
  }

  const now = new Date().toISOString();
  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression:
        "SET billPdfKey = :billPdfKey, billUploadedAt = :billUploadedAt, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":billPdfKey": pdfKey,
        ":billUploadedAt": now,
        ":updatedAt": now,
      },
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    })
  );

  return toCoachRecommendedSupplementPublic(Attributes);
}

async function deleteCoachRecommendedSupplement(id) {
  const record = await getCoachRecommendedSupplementRecordById(id);
  if (!record) {
    const err = new Error("Recommendation not found");
    err.name = "NotFoundError";
    throw err;
  }

  if (record.billPdfKey) {
    await deleteStoredMedia(record.billPdfKey);
  }

  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );

  return toCoachRecommendedSupplementPublic(record);
}

module.exports = {
  DELIVERY_OPTIONS,
  createCoachRecommendedSupplement,
  getCoachRecommendedSupplementById,
  getCoachRecommendedSupplementRecordById,
  listCoachRecommendedSupplementsByUserId,
  markDeliveryRequested,
  saveBillPdf,
  deleteCoachRecommendedSupplement,
  toCoachRecommendedSupplementPublic,
  normalizeDeliveryOption,
  normalizeCreatedByRole,
  computeBillingTotal,
};
