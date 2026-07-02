const { randomBytes } = require("crypto");
const { v4: uuidv4 } = require("uuid");
const { PutCommand, GetCommand, UpdateCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { queryPartition, paginateItems } = require("../utils/dynamoList");
const { listUsersByParentCoachId } = require("./userModel");
const { normalizeAssignedCoachType } = require("./userAssignmentLogic");

const TABLE = "ConsultancyTransaction";
const PAYMENT_STATUSES = new Set(["pending", "paid", "failed", "refunded"]);
const PRODUCT_TYPES = new Set(["consultancy", "subscription", "energy_exchange"]);
const CONSULTANCY_STATUSES = new Set(["scheduled", "completed", "follow_up_needed", "cancelled"]);

/** GSI partition keys must be omitted when unset — DynamoDB rejects NULL index keys. */
const SPARSE_GSI_ATTRIBUTES = new Set(["parentCoachId", "meetingAssigneeId"]);

function omitSparseGsiAttributes(item) {
  const next = { ...item };
  for (const key of SPARSE_GSI_ATTRIBUTES) {
    if (next[key] == null || next[key] === "") {
      delete next[key];
    }
  }
  return next;
}

function generateReferenceNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `WD${stamp}${suffix}`;
}

function normalizePaymentStatus(value, fallback = "pending") {
  const next = String(value || fallback).toLowerCase().trim();
  return PAYMENT_STATUSES.has(next) ? next : fallback;
}

function normalizeProductType(value, fallback = "consultancy") {
  const next = String(value || fallback).toLowerCase().trim();
  return PRODUCT_TYPES.has(next) ? next : fallback;
}

function normalizeConsultancyStatus(value) {
  if (value == null || value === "") return null;
  const next = String(value).toLowerCase().trim();
  return CONSULTANCY_STATUSES.has(next) ? next : null;
}

function toPublicTransaction(item) {
  if (!item) return null;
  return {
    ...item,
    _id: item.id,
  };
}

async function createConsultancyTransaction(payload) {
  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    referenceNumber: payload.referenceNumber || generateReferenceNumber(),
    userId: payload.userId,
    productType: normalizeProductType(payload.productType, "consultancy"),
    paymentStatus: normalizePaymentStatus(payload.paymentStatus, "pending"),
    paymentProvider: payload.paymentProvider || null,
    paymentGatewayOrderId: payload.paymentGatewayOrderId || null,
    paymentGatewayPaymentId: payload.paymentGatewayPaymentId || null,
    paymentMethod: payload.paymentMethod || null,
    baseAmount: payload.baseAmount,
    discountAmount: payload.discountAmount,
    discountedBase: payload.discountedBase,
    taxAmount: payload.taxAmount,
    taxPercent: payload.taxPercent,
    taxType: payload.taxType,
    totalAmount: payload.totalAmount,
    currency: payload.currency || "INR",
    referralCodeUsed: payload.referralCodeUsed || null,
    referralCodeValid: Boolean(payload.referralCodeValid),
    meetingAssigneeType: payload.meetingAssigneeType || null,
    meetingAssigneeId: payload.meetingAssigneeId || null,
    parentCoachId: payload.parentCoachId || null,
    visibleToCoachIds: Array.isArray(payload.visibleToCoachIds) ? payload.visibleToCoachIds : [],
    zoomMeetingId: payload.zoomMeetingId || null,
    zoomMeetingLink: payload.zoomMeetingLink || null,
    invoicePdfKey: payload.invoicePdfKey || null,
    whatsappDelivery: payload.whatsappDelivery || null,
    userSnapshot: payload.userSnapshot || null,
    assigneeSnapshot: payload.assigneeSnapshot || null,
    healthConcernId: payload.healthConcernId || null,
    healthConcernSnapshot: payload.healthConcernSnapshot || null,
    sessionScheduledAt: payload.sessionScheduledAt || null,
    consultancyStatus: normalizeConsultancyStatus(payload.consultancyStatus),
    consultancyNotes: payload.consultancyNotes || null,
    fyStartYear: payload.fyStartYear != null ? Number(payload.fyStartYear) || null : null,
    fyStartMonth: payload.fyStartMonth != null ? Number(payload.fyStartMonth) || null : null,
    fyStartsAt: payload.fyStartsAt || null,
    fyEndsAt: payload.fyEndsAt || null,
    paidAt: payload.paidAt || null,
    failureReason: payload.failureReason || null,
    createdAt: now,
    updatedAt: now,
  };

  const storedItem = omitSparseGsiAttributes(item);

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: storedItem,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );

  return storedItem;
}

async function getConsultancyTransactionById(id) {
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { id },
    })
  );
  return Item || null;
}

async function updateConsultancyTransaction(id, updates) {
  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  const removeKeys = [];
  const setEntries = [];

  for (const [key, val] of Object.entries(updates)) {
    if (val === undefined) continue;
    if (SPARSE_GSI_ATTRIBUTES.has(key) && (val == null || val === "")) {
      removeKeys.push(key);
      continue;
    }
    setEntries.push([key, val]);
  }

  let updateExpr = "SET updatedAt = :updatedAt";
  for (const [key, val] of setEntries) {
    exprNames[`#${key}`] = key;
    exprValues[`:${key}`] = val;
    updateExpr += `, #${key} = :${key}`;
  }

  if (removeKeys.length) {
    for (const key of removeKeys) {
      exprNames[`#${key}`] = key;
    }
    updateExpr += ` REMOVE ${removeKeys.map((key) => `#${key}`).join(", ")}`;
  }

  if (setEntries.length === 0 && removeKeys.length === 0) {
    throw new Error("No valid fields provided for update");
  }

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression: updateExpr,
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    })
  );

  return Attributes;
}

async function markTransactionPaidIfPending(id, updates) {
  const exprNames = { "#paymentStatus": "paymentStatus" };
  const exprValues = {
    ":pending": "pending",
    ":paid": "paid",
    ":updatedAt": new Date().toISOString(),
  };
  const setEntries = Object.entries(updates).filter(([, val]) => val !== undefined);

  let updateExpr = "SET updatedAt = :updatedAt, #paymentStatus = :paid";
  for (const [key, val] of setEntries) {
    if (key === "paymentStatus") continue;
    if (SPARSE_GSI_ATTRIBUTES.has(key) && (val == null || val === "")) continue;
    exprNames[`#${key}`] = key;
    exprValues[`:${key}`] = val;
    updateExpr += `, #${key} = :${key}`;
  }

  try {
    const { Attributes } = await docClient.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { id },
        UpdateExpression: updateExpr,
        ConditionExpression: "#paymentStatus = :pending",
        ExpressionAttributeNames: exprNames,
        ExpressionAttributeValues: exprValues,
        ReturnValues: "ALL_NEW",
      })
    );
    return { item: Attributes, alreadyPaid: false };
  } catch (err) {
    if (err.name !== "ConditionalCheckFailedException") throw err;
    const existing = await getConsultancyTransactionById(id);
    if (existing && normalizePaymentStatus(existing.paymentStatus) === "paid") {
      return { item: existing, alreadyPaid: true };
    }
    throw err;
  }
}

async function getPendingConsultancyOrderForUser(userId) {
  const result = await listTransactionsByUserId(userId, { page: 1, limit: 20, paymentStatus: "pending" });
  return (
    result.items.find((row) => normalizeProductType(row.productType) === "consultancy") || null
  );
}

async function listTransactionsByUserId(userId, { page = 1, limit = 20, paymentStatus, productType } = {}) {
  const filterParts = [];
  const extraNames = {};
  const extraValues = { ":userId": userId };

  if (paymentStatus) {
    filterParts.push("#paymentStatus = :paymentStatus");
    extraNames["#paymentStatus"] = "paymentStatus";
    extraValues[":paymentStatus"] = normalizePaymentStatus(paymentStatus);
  }
  if (productType) {
    filterParts.push("#productType = :productType");
    extraNames["#productType"] = "productType";
    extraValues[":productType"] = normalizeProductType(productType);
  }

  return queryPartition({
    tableName: TABLE,
    indexName: "UserIdCreatedAtIndex",
    partitionKeyName: "userId",
    partitionKeyValue: userId,
    filterExpression: filterParts.length ? filterParts.join(" AND ") : undefined,
    exprNames: extraNames,
    exprValues: extraValues,
    page,
    limit,
  });
}

async function listAllTransactions({
  page = 1,
  limit = 20,
  paymentStatus,
  referralCode,
  coachId,
  fromDate,
  toDate,
  search,
} = {}) {
  const status = paymentStatus ? normalizePaymentStatus(paymentStatus) : "paid";
  const filterParts = [];
  const extraNames = {};
  const extraValues = {};

  if (referralCode) {
    filterParts.push("referralCodeUsed = :referralCodeUsed");
    extraValues[":referralCodeUsed"] = String(referralCode).trim().toUpperCase();
  }
  if (coachId) {
    filterParts.push(
      "(meetingAssigneeId = :coachId OR parentCoachId = :coachId OR contains(visibleToCoachIds, :coachId))"
    );
    extraValues[":coachId"] = String(coachId).trim();
  }
  if (fromDate) {
    filterParts.push("createdAt >= :fromDate");
    extraValues[":fromDate"] = String(fromDate);
  }
  if (toDate) {
    filterParts.push("createdAt <= :toDate");
    extraValues[":toDate"] = `${String(toDate)}T23:59:59.999Z`;
  }

  const searchTerm = String(search || "").trim();
  const hasSearch = Boolean(searchTerm);
  const normalizedSearch = searchTerm.toLowerCase();

  const result = await queryPartition({
    tableName: TABLE,
    indexName: "PaymentStatusCreatedAtIndex",
    partitionKeyName: "paymentStatus",
    partitionKeyValue: status,
    filterExpression: filterParts.length ? filterParts.join(" AND ") : undefined,
    exprNames: extraNames,
    exprValues: extraValues,
    page: hasSearch ? 1 : page,
    limit: hasSearch ? Number.MAX_SAFE_INTEGER : limit,
    maxLimit: hasSearch ? Number.MAX_SAFE_INTEGER : 200,
  });

  if (!hasSearch) {
    return {
      transactions: result.items.map(toPublicTransaction),
      pagination: result.pagination,
    };
  }

  const filtered = result.items.filter((row) => {
    const haystack = [
      row.userSnapshot?.name,
      row.userSnapshot?.email,
      row.referenceNumber,
    ]
      .map((value) => String(value || "").toLowerCase())
      .join(" ");
    return haystack.includes(normalizedSearch);
  });
  const paged = paginateItems(filtered, page, limit, 200);

  return {
    transactions: paged.items.map(toPublicTransaction),
    pagination: paged.pagination,
  };
}

async function listTransactionsForCoach(
  coachId,
  { page = 1, limit = 20, paymentStatus = "paid", search, scope = "all" } = {}
) {
  const id = String(coachId || "").trim();
  if (!id) {
    return { transactions: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } };
  }

  const normalizedScope = String(scope || "all").toLowerCase();
  const normalizedSearch = String(search || "").trim().toLowerCase();
  const statuses =
    !paymentStatus || String(paymentStatus).toLowerCase() === "all"
      ? ["paid", "pending", "failed", "refunded"]
      : [normalizePaymentStatus(paymentStatus)];

  const merged = new Map();
  for (const status of statuses) {
    const [byParent, byAssignee] = await Promise.all([
      queryPartition({
        tableName: TABLE,
        indexName: "ParentCoachIdCreatedAtIndex",
        partitionKeyName: "parentCoachId",
        partitionKeyValue: id,
        filterExpression: "#paymentStatus = :paymentStatus",
        exprNames: { "#paymentStatus": "paymentStatus" },
        exprValues: { ":paymentStatus": status },
        page: 1,
        limit: 500,
      }),
      queryPartition({
        tableName: TABLE,
        indexName: "MeetingAssigneeIdCreatedAtIndex",
        partitionKeyName: "meetingAssigneeId",
        partitionKeyValue: id,
        filterExpression: "#paymentStatus = :paymentStatus",
        exprNames: { "#paymentStatus": "paymentStatus" },
        exprValues: { ":paymentStatus": status },
        page: 1,
        limit: 500,
      }),
    ]);

    for (const item of [...byParent.items, ...byAssignee.items]) {
      if (!transactionVisibleToCoach(item, id)) continue;
      if (normalizedScope === "direct") {
        if (
          String(item.meetingAssigneeId || "") !== id ||
          String(item.meetingAssigneeType || "") !== "wellness_coach"
        ) {
          continue;
        }
      } else if (normalizedScope === "assistant") {
        if (String(item.meetingAssigneeType || "") !== "assistant_wellness_coach") continue;
      }
      if (normalizeProductType(item.productType) !== "consultancy") continue;
      if (normalizedSearch) {
        const haystack = [
          item.referenceNumber,
          item.userSnapshot?.name,
          item.userSnapshot?.email,
          item.referralCodeUsed,
        ]
          .map((v) => String(v || "").toLowerCase())
          .join(" ");
        if (!haystack.includes(normalizedSearch)) continue;
      }
      merged.set(item.id, item);
    }
  }

  const all = [...merged.values()].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;
  const transactions = all.slice(skip, skip + safeLimit).map(toPublicTransaction);

  return {
    transactions,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: all.length,
      pages: Math.max(1, Math.ceil(all.length / safeLimit)),
    },
  };
}

function transactionVisibleToCoach(txn, coachId) {
  const id = String(coachId || "").trim();
  if (!id || !txn) return false;
  return (
    String(txn.parentCoachId || "") === id ||
    String(txn.meetingAssigneeId || "") === id ||
    (Array.isArray(txn.visibleToCoachIds) && txn.visibleToCoachIds.includes(id))
  );
}

function transactionVisibleToAssistant(txn, assistantId) {
  const id = String(assistantId || "").trim();
  if (!id || !txn) return false;
  return (
    String(txn.meetingAssigneeId || "") === id ||
    (Array.isArray(txn.visibleToCoachIds) && txn.visibleToCoachIds.includes(id))
  );
}

async function listTransactionsForAssistant(
  assistantId,
  { page = 1, limit = 20, paymentStatus = "paid", search } = {}
) {
  const id = String(assistantId || "").trim();
  if (!id) {
    return { transactions: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } };
  }

  const normalizedSearch = String(search || "").trim().toLowerCase();
  const statuses =
    !paymentStatus || String(paymentStatus).toLowerCase() === "all"
      ? ["paid", "pending", "failed", "refunded"]
      : [normalizePaymentStatus(paymentStatus)];

  const merged = new Map();
  for (const status of statuses) {
    const byAssignee = await queryPartition({
      tableName: TABLE,
      indexName: "MeetingAssigneeIdCreatedAtIndex",
      partitionKeyName: "meetingAssigneeId",
      partitionKeyValue: id,
      filterExpression: "#paymentStatus = :paymentStatus",
      exprNames: { "#paymentStatus": "paymentStatus" },
      exprValues: { ":paymentStatus": status },
      page: 1,
      limit: 500,
    });

    for (const item of byAssignee.items) {
      if (!transactionVisibleToAssistant(item, id)) continue;
      if (normalizeProductType(item.productType) !== "consultancy") continue;
      if (normalizedSearch) {
        const haystack = [
          item.referenceNumber,
          item.userSnapshot?.name,
          item.userSnapshot?.email,
          item.referralCodeUsed,
        ]
          .map((v) => String(v || "").toLowerCase())
          .join(" ");
        if (!haystack.includes(normalizedSearch)) continue;
      }
      merged.set(item.id, item);
    }
  }

  const all = [...merged.values()].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;
  const transactions = all.slice(skip, skip + safeLimit).map(toPublicTransaction);

  return {
    transactions,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: all.length,
      pages: Math.max(1, Math.ceil(all.length / safeLimit)),
    },
  };
}

function buildEnrolledUsersFromTransactions(transactions) {
  const latestPaidByUser = new Map();
  for (const txn of transactions) {
    if (normalizePaymentStatus(txn.paymentStatus) !== "paid") continue;
    const existing = latestPaidByUser.get(txn.userId);
    if (!existing || String(txn.paidAt || txn.createdAt) > String(existing.paidAt || existing.createdAt)) {
      latestPaidByUser.set(txn.userId, txn);
    }
  }

  return [...latestPaidByUser.entries()]
    .map(([userId, txn]) => enrolledUserRowFromTransaction(userId, txn))
    .sort((a, b) =>
      String(b.latestTransaction?.paidAt || "").localeCompare(String(a.latestTransaction?.paidAt || ""))
    );
}

function enrolledUserRowFromTransaction(userId, txn, userOverrides = {}) {
  return {
    user: {
      id: userId,
      _id: userId,
      name: userOverrides.name ?? txn.userSnapshot?.name ?? null,
      email: userOverrides.email ?? txn.userSnapshot?.email ?? null,
      phone: userOverrides.phone ?? txn.userSnapshot?.phone ?? null,
      phoneCountryCode: userOverrides.phoneCountryCode ?? txn.userSnapshot?.phoneCountryCode ?? null,
      userTier: userOverrides.userTier ?? txn.userSnapshot?.userTier ?? "consultancy_only",
    },
    latestTransaction: {
      id: txn.id,
      referenceNumber: txn.referenceNumber,
      paymentStatus: txn.paymentStatus,
      totalAmount: txn.totalAmount,
      referralCodeUsed: txn.referralCodeUsed,
      healthConcernId: txn.healthConcernId || null,
      healthConcernSnapshot: txn.healthConcernSnapshot || null,
      paidAt: txn.paidAt,
      meetingAssigneeType: txn.meetingAssigneeType,
      meetingAssigneeId: txn.meetingAssigneeId,
      assigneeSnapshot: txn.assigneeSnapshot || null,
    },
    enrollmentStatus: "enrolled",
  };
}

/**
 * Include consultancy clients assigned to the coach on the user record when their paid
 * transaction was created before admin assignment (no parentCoachId on the txn yet).
 */
async function supplementEnrolledUsersFromAssignedClients(coachId, enrolled, { search, scope = "all" } = {}) {
  const id = String(coachId || "").trim();
  if (!id) return enrolled;

  const normalizedScope = String(scope || "all").toLowerCase();
  const normalizedSearch = String(search || "").trim().toLowerCase();
  const seenIds = new Set(enrolled.map((row) => row.user.id));

  const { users } = await listUsersByParentCoachId(id, {
    page: 1,
    limit: 500,
    userTier: "consultancy_only",
  });

  const extras = [];
  for (const user of users) {
    if (seenIds.has(user.id)) continue;
    if (user.assignmentStatus !== "assigned") continue;

    if (normalizedScope === "direct") {
      if (String(user.assignedCoachId || "") !== id) continue;
      if (normalizeAssignedCoachType(user.assignedCoachType) !== "wellness_coach") continue;
    } else if (normalizedScope === "assistant") {
      if (normalizeAssignedCoachType(user.assignedCoachType) !== "assistant_wellness_coach") continue;
    }

    const { items } = await listTransactionsByUserId(user.id, {
      page: 1,
      limit: 1,
      paymentStatus: "paid",
      productType: "consultancy",
    });
    const txn = items[0];
    if (!txn) continue;

    if (normalizedSearch) {
      const haystack = [user.name, user.email, user.phone, txn.referenceNumber]
        .map((v) => String(v || "").toLowerCase())
        .join(" ");
      if (!haystack.includes(normalizedSearch)) continue;
    }

    extras.push(
      enrolledUserRowFromTransaction(user.id, txn, {
        name: user.name,
        email: user.email,
        phone: user.phone,
        phoneCountryCode: user.phoneCountryCode,
        userTier: user.userTier,
      })
    );
    seenIds.add(user.id);
  }

  if (!extras.length) return enrolled;

  return [...enrolled, ...extras].sort((a, b) =>
    String(b.latestTransaction?.paidAt || "").localeCompare(String(a.latestTransaction?.paidAt || ""))
  );
}

module.exports = {
  TABLE,
  PAYMENT_STATUSES,
  PRODUCT_TYPES,
  CONSULTANCY_STATUSES,
  generateReferenceNumber,
  toPublicTransaction,
  createConsultancyTransaction,
  getConsultancyTransactionById,
  updateConsultancyTransaction,
  markTransactionPaidIfPending,
  getPendingConsultancyOrderForUser,
  listTransactionsByUserId,
  listAllTransactions,
  listTransactionsForCoach,
  listTransactionsForAssistant,
  transactionVisibleToCoach,
  transactionVisibleToAssistant,
  buildEnrolledUsersFromTransactions,
  supplementEnrolledUsersFromAssignedClients,
  normalizeProductType,
  normalizeConsultancyStatus,
};
