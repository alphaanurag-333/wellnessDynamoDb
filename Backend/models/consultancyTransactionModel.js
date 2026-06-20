const { randomBytes } = require("crypto");
const { v4: uuidv4 } = require("uuid");
const { PutCommand, GetCommand, UpdateCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { queryPartition } = require("../utils/dynamoList");

const TABLE = "ConsultancyTransaction";
const PAYMENT_STATUSES = new Set(["pending", "paid", "failed", "refunded"]);

function generateReferenceNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `WD${stamp}${suffix}`;
}

function normalizePaymentStatus(value, fallback = "pending") {
  const next = String(value || fallback).toLowerCase().trim();
  return PAYMENT_STATUSES.has(next) ? next : fallback;
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
    paidAt: payload.paidAt || null,
    failureReason: payload.failureReason || null,
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
  let setExpr = "SET updatedAt = :updatedAt";

  for (const [key, val] of Object.entries(updates)) {
    if (val === undefined) continue;
    exprNames[`#${key}`] = key;
    exprValues[`:${key}`] = val;
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

  return Attributes;
}

async function listTransactionsByUserId(userId, { page = 1, limit = 20, paymentStatus } = {}) {
  const filterParts = [];
  const extraNames = {};
  const extraValues = { ":userId": userId };

  if (paymentStatus) {
    filterParts.push("#paymentStatus = :paymentStatus");
    extraNames["#paymentStatus"] = "paymentStatus";
    extraValues[":paymentStatus"] = normalizePaymentStatus(paymentStatus);
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
  if (search) {
    filterParts.push(
      "(contains(userSnapshot.#name, :search) OR contains(userSnapshot.#email, :search) OR contains(referenceNumber, :search))"
    );
    extraNames["#name"] = "name";
    extraNames["#email"] = "email";
    extraValues[":search"] = String(search).trim();
  }

  const result = await queryPartition({
    tableName: TABLE,
    indexName: "PaymentStatusCreatedAtIndex",
    partitionKeyName: "paymentStatus",
    partitionKeyValue: status,
    filterExpression: filterParts.length ? filterParts.join(" AND ") : undefined,
    exprNames: extraNames,
    exprValues: extraValues,
    page,
    limit,
  });

  return {
    transactions: result.items.map(toPublicTransaction),
    pagination: result.pagination,
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
    .map(([userId, txn]) => ({
      user: {
        id: userId,
        _id: userId,
        name: txn.userSnapshot?.name || null,
        email: txn.userSnapshot?.email || null,
        phone: txn.userSnapshot?.phone || null,
        phoneCountryCode: txn.userSnapshot?.phoneCountryCode || null,
        userTier: "heal",
      },
      latestTransaction: {
        id: txn.id,
        referenceNumber: txn.referenceNumber,
        paymentStatus: txn.paymentStatus,
        totalAmount: txn.totalAmount,
        referralCodeUsed: txn.referralCodeUsed,
        paidAt: txn.paidAt,
        meetingAssigneeType: txn.meetingAssigneeType,
        meetingAssigneeId: txn.meetingAssigneeId,
        assigneeSnapshot: txn.assigneeSnapshot || null,
      },
      enrollmentStatus: "enrolled",
    }))
    .sort((a, b) =>
      String(b.latestTransaction?.paidAt || "").localeCompare(String(a.latestTransaction?.paidAt || ""))
    );
}

module.exports = {
  TABLE,
  PAYMENT_STATUSES,
  generateReferenceNumber,
  toPublicTransaction,
  createConsultancyTransaction,
  getConsultancyTransactionById,
  updateConsultancyTransaction,
  listTransactionsByUserId,
  listAllTransactions,
  listTransactionsForCoach,
  listTransactionsForAssistant,
  transactionVisibleToCoach,
  transactionVisibleToAssistant,
  buildEnrolledUsersFromTransactions,
};
