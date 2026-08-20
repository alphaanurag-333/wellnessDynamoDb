const {
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
  UpdateCommand,
  ScanCommand,
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

function normalizeIsoDate(value, fieldName) {
  const raw = String(value || "").trim();
  if (!raw) {
    const err = new Error(`${fieldName} is required`);
    err.name = "ValidationError";
    throw err;
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    const err = new Error(`${fieldName} must be a valid date`);
    err.name = "ValidationError";
    throw err;
  }
  return d.toISOString().slice(0, 10);
}

function normalizeOptionalIsoDate(value, fieldName) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return normalizeIsoDate(raw, fieldName);
}

function toFulfilmentOrderPublic(order) {
  if (!order || !order.id) return null;
  const items = Array.isArray(order.items) ? order.items : [];
  return {
    id: String(order.id),
    items,
    billingTotal: Number(order.billingTotal) || computeBillingTotal(items),
    placedOn: String(order.placedOn || "").trim(),
    vendor: String(order.vendor || "").trim(),
    tracking: String(order.tracking || "").trim(),
    expectedDelivery: String(order.expectedDelivery || "").trim(),
    billPdfKey: order.billPdfKey ?? null,
    billPdfUrl: order.billPdfKey ? resolvePublicUrl(order.billPdfKey) : null,
    billFileName: String(order.billFileName || "").trim(),
    billUploadedAt: order.billUploadedAt ?? null,
    status: String(order.status || "logged").trim() || "logged",
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

function readFulfilmentOrders(record) {
  return (Array.isArray(record?.fulfilmentOrders) ? record.fulfilmentOrders : [])
    .map((row) => toFulfilmentOrderPublic(row))
    .filter(Boolean);
}

function normalizeFulfilmentOrderInput(payload = {}, { existing = null } = {}) {
  const items = normalizeItems(payload.items);
  const placedOn = normalizeIsoDate(payload.placedOn, "placedOn");
  const vendor = String(payload.vendor || "").trim();
  if (!vendor) {
    const err = new Error("vendor is required");
    err.name = "ValidationError";
    throw err;
  }

  const now = new Date().toISOString();
  return {
    id: String(existing?.id || payload.id || uuidv4()).trim(),
    items,
    billingTotal: computeBillingTotal(items),
    placedOn,
    vendor,
    tracking: String(payload.tracking || "").trim(),
    expectedDelivery: normalizeOptionalIsoDate(payload.expectedDelivery, "expectedDelivery"),
    billPdfKey: existing?.billPdfKey ?? null,
    billFileName: String(existing?.billFileName || payload.billFileName || "").trim(),
    billUploadedAt: existing?.billUploadedAt ?? null,
    status: String(payload.status || existing?.status || "logged").trim() || "logged",
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

function toCoachRecommendedSupplementPublic(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  const fulfilmentOrders = readFulfilmentOrders(row);
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
    fulfilmentOrders,
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

async function queryCoachRecommendedSupplementsByCoachId(coachId) {
  const cid = String(coachId || "").trim();
  if (!cid) return [];

  const items = [];
  let lastKey;

  do {
    const { Items = [], LastEvaluatedKey } = await docClient.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: "CoachCreatedAtIndex",
        KeyConditionExpression: "coachId = :coachId",
        ExpressionAttributeValues: { ":coachId": cid },
        ScanIndexForward: false,
        ExclusiveStartKey: lastKey,
      })
    );
    items.push(...Items);
    lastKey = LastEvaluatedKey;
  } while (lastKey);

  return items.map((row) => toCoachRecommendedSupplementPublic(row)).filter(Boolean);
}

async function scanCoachRecommendedSupplements({ limit = 500 } = {}) {
  const items = [];
  let lastKey;
  const max = Math.min(800, Math.max(1, Number(limit) || 500));

  do {
    const params = { TableName: TABLE };
    if (lastKey) params.ExclusiveStartKey = lastKey;
    const { Items = [], LastEvaluatedKey } = await docClient.send(new ScanCommand(params));
    items.push(...Items);
    lastKey = LastEvaluatedKey;
  } while (lastKey && items.length < max);

  return items.slice(0, max).map((row) => toCoachRecommendedSupplementPublic(row)).filter(Boolean);
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
    fulfilmentOrders: [],
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

async function assertCoachDeliveryRecommendation(record) {
  if (!record) {
    const err = new Error("Recommendation not found");
    err.name = "NotFoundError";
    throw err;
  }
  if (record.deliveryOption !== "coach_delivery") {
    const err = new Error("Fulfilment orders are only available for coach delivery recommendations");
    err.name = "ValidationError";
    throw err;
  }
}

async function upsertFulfilmentOrder(recommendationId, payload) {
  const record = await getCoachRecommendedSupplementRecordById(recommendationId);
  await assertCoachDeliveryRecommendation(record);

  const orders = Array.isArray(record.fulfilmentOrders) ? [...record.fulfilmentOrders] : [];
  const orderId = String(payload?.id || "").trim();
  const existingIndex = orderId
    ? orders.findIndex((row) => String(row.id) === orderId)
    : -1;
  const existing = existingIndex >= 0 ? orders[existingIndex] : null;
  const nextOrder = normalizeFulfilmentOrderInput(payload, { existing });

  if (existingIndex >= 0) {
    orders[existingIndex] = nextOrder;
  } else {
    orders.push(nextOrder);
  }

  const now = new Date().toISOString();
  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id: recommendationId },
      UpdateExpression: "SET fulfilmentOrders = :fulfilmentOrders, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":fulfilmentOrders": orders,
        ":updatedAt": now,
      },
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    })
  );

  const recommendation = toCoachRecommendedSupplementPublic(Attributes);
  return {
    recommendation,
    order: recommendation.fulfilmentOrders.find((row) => row.id === nextOrder.id) || null,
  };
}

async function saveFulfilmentOrderBill(recommendationId, orderId, billPdfKey, billFileName = "") {
  const record = await getCoachRecommendedSupplementRecordById(recommendationId);
  await assertCoachDeliveryRecommendation(record);

  const oid = String(orderId || "").trim();
  const key = String(billPdfKey || "").trim();
  if (!oid) {
    const err = new Error("orderId is required");
    err.name = "ValidationError";
    throw err;
  }
  if (!key) {
    const err = new Error("billPdfKey is required");
    err.name = "ValidationError";
    throw err;
  }

  const orders = Array.isArray(record.fulfilmentOrders) ? [...record.fulfilmentOrders] : [];
  const index = orders.findIndex((row) => String(row.id) === oid);
  if (index < 0) {
    const err = new Error("Fulfilment order not found");
    err.name = "NotFoundError";
    throw err;
  }

  const existing = orders[index];
  if (existing.billPdfKey && existing.billPdfKey !== key) {
    await deleteStoredMedia(existing.billPdfKey);
  }

  const now = new Date().toISOString();
  orders[index] = {
    ...existing,
    billPdfKey: key,
    billFileName: String(billFileName || existing.billFileName || "").trim(),
    billUploadedAt: now,
    updatedAt: now,
  };

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id: recommendationId },
      UpdateExpression: "SET fulfilmentOrders = :fulfilmentOrders, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":fulfilmentOrders": orders,
        ":updatedAt": now,
      },
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    })
  );

  const recommendation = toCoachRecommendedSupplementPublic(Attributes);
  return {
    recommendation,
    order: recommendation.fulfilmentOrders.find((row) => row.id === oid) || null,
  };
}

async function deleteFulfilmentOrder(recommendationId, orderId) {
  const record = await getCoachRecommendedSupplementRecordById(recommendationId);
  await assertCoachDeliveryRecommendation(record);

  const oid = String(orderId || "").trim();
  const orders = Array.isArray(record.fulfilmentOrders) ? [...record.fulfilmentOrders] : [];
  const index = orders.findIndex((row) => String(row.id) === oid);
  if (index < 0) {
    const err = new Error("Fulfilment order not found");
    err.name = "NotFoundError";
    throw err;
  }

  const [removed] = orders.splice(index, 1);
  if (removed?.billPdfKey) {
    await deleteStoredMedia(removed.billPdfKey);
  }

  const now = new Date().toISOString();
  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id: recommendationId },
      UpdateExpression: "SET fulfilmentOrders = :fulfilmentOrders, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":fulfilmentOrders": orders,
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
  for (const order of Array.isArray(record.fulfilmentOrders) ? record.fulfilmentOrders : []) {
    if (order?.billPdfKey) {
      await deleteStoredMedia(order.billPdfKey);
    }
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
  queryCoachRecommendedSupplementsByCoachId,
  scanCoachRecommendedSupplements,
  markDeliveryRequested,
  saveBillPdf,
  upsertFulfilmentOrder,
  saveFulfilmentOrderBill,
  deleteFulfilmentOrder,
  deleteCoachRecommendedSupplement,
  toCoachRecommendedSupplementPublic,
  toFulfilmentOrderPublic,
  normalizeDeliveryOption,
  normalizeCreatedByRole,
  computeBillingTotal,
};
