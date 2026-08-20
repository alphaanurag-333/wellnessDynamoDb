const { PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const { queryPartition } = require("../utils/dynamoList");
const { getReadMapForAccount } = require("./adminActivityReadModel");

const TABLE = "AdminActivity";

const KINDS = new Set([
  "assignment",
  "feedback",
  "calendar",
  "payment",
  "champion",
  "meal",
  "lab",
  "coach",
  "reminder",
  "system",
]);

const KIND_META = {
  assignment: { label: "Assignment", icon: "👤", fromDefault: "System" },
  feedback: { label: "Feedback", icon: "💬", fromDefault: "Support" },
  calendar: { label: "Calendar", icon: "📅", fromDefault: "Community" },
  payment: { label: "Payment", icon: "💰", fromDefault: "Billing" },
  champion: { label: "Champion", icon: "🏆", fromDefault: "Daily Reflection" },
  meal: { label: "Meal", icon: "🍽️", fromDefault: "Client" },
  lab: { label: "Lab", icon: "🧪", fromDefault: "Client" },
  coach: { label: "Coach", icon: "🩺", fromDefault: "Coach" },
  reminder: { label: "Reminder", icon: "🔔", fromDefault: "Admin" },
  system: { label: "System", icon: "🔔", fromDefault: "System" },
};

function normalizeKind(value, fallback = "system") {
  const next = String(value || fallback).trim().toLowerCase();
  return KINDS.has(next) ? next : fallback;
}

function toInboxItem(item, readMap) {
  if (!item) return null;
  const kind = normalizeKind(item.kind);
  const meta = KIND_META[kind] || KIND_META.system;
  const readAt = readMap?.get(item.id) || null;
  return {
    id: item.id,
    kind: meta.label,
    kindKey: kind,
    icon: item.icon || meta.icon,
    title: item.title,
    from: item.from || meta.fromDefault,
    href: item.href || null,
    subjectUserId: item.subjectUserId || null,
    referenceType: item.referenceType || null,
    referenceId: item.referenceId || null,
    createdAt: item.createdAt,
    unread: !readAt,
    readAt,
  };
}

async function createAdminActivity({
  kind,
  title,
  from = null,
  icon = null,
  actorType = "system",
  actorId = null,
  actorName = null,
  subjectUserId = null,
  subjectUserName = null,
  recipientAccountId = null,
  referenceType = null,
  referenceId = null,
  href = null,
  meta = null,
}) {
  const now = new Date().toISOString();
  const normalizedKind = normalizeKind(kind);
  const kindMeta = KIND_META[normalizedKind] || KIND_META.system;

  const item = {
    id: uuidv4(),
    status: "active",
    kind: normalizedKind,
    title: String(title || "").trim(),
    from: String(from || kindMeta.fromDefault).trim(),
    icon: icon || kindMeta.icon,
    actorType: String(actorType || "system").trim(),
    createdAt: now,
    updatedAt: now,
  };

  if (!item.title) throw new Error("title is required");

  if (actorId) item.actorId = String(actorId).trim();
  if (actorName) item.actorName = String(actorName).trim();
  if (subjectUserId) item.subjectUserId = String(subjectUserId).trim();
  if (subjectUserName) item.subjectUserName = String(subjectUserName).trim();
  if (recipientAccountId) item.recipientAccountId = String(recipientAccountId).trim();
  if (referenceType) item.referenceType = String(referenceType).trim();
  if (referenceId) item.referenceId = String(referenceId).trim();
  if (href) item.href = String(href).trim();
  if (meta && typeof meta === "object") item.meta = meta;

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
    })
  );

  return item;
}

async function getAdminActivityById(id) {
  const activityId = String(id || "").trim();
  if (!activityId) return null;
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { id: activityId },
    })
  );
  return Item || null;
}

function matchesInboxVisibility(row, accountId, subjectUserIds) {
  const recipientId = String(row?.recipientAccountId || "").trim();
  if (recipientId) {
    return recipientId === String(accountId || "").trim();
  }
  if (!(subjectUserIds instanceof Set)) return true;
  const uid = String(row?.subjectUserId || "").trim();
  return Boolean(uid && subjectUserIds.has(uid));
}

async function listAdminActivities({
  page = 1,
  limit = 30,
  unreadOnly = false,
  accountId,
  subjectUserIds = null,
} = {}) {
  const { items } = await queryPartition({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyName: "status",
    partitionKeyValue: "active",
    scanIndexForward: false,
    page: 1,
    limit: 200,
    maxLimit: 200,
  });

  const scopedItems = items.filter((row) =>
    matchesInboxVisibility(row, accountId, subjectUserIds)
  );
  const ids = scopedItems.map((row) => row.id);
  const readMap = accountId ? await getReadMapForAccount(accountId, ids) : new Map();

  let notifications = scopedItems.map((row) => toInboxItem(row, readMap)).filter(Boolean);
  if (unreadOnly) {
    notifications = notifications.filter((row) => row.unread);
  }
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 30));
  const skip = (safePage - 1) * safeLimit;
  const total = notifications.length;
  notifications = notifications.slice(skip, skip + safeLimit);
  return {
    notifications,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
}

async function listAdminActivityIds({ limit = 200, subjectUserIds = null, accountId = null } = {}) {
  const { items } = await queryPartition({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyName: "status",
    partitionKeyValue: "active",
    scanIndexForward: false,
    page: 1,
    limit,
    maxLimit: 500,
  });
  return items
    .filter((row) => matchesInboxVisibility(row, accountId, subjectUserIds))
    .map((row) => row.id)
    .filter(Boolean);
}

async function countUnreadAdminActivities(accountId, subjectUserIds = null) {
  const { notifications } = await listAdminActivities({
    page: 1,
    limit: 200,
    unreadOnly: true,
    accountId,
    subjectUserIds,
  });
  return notifications.length;
}

module.exports = {
  TABLE,
  KIND_META,
  KINDS,
  createAdminActivity,
  getAdminActivityById,
  listAdminActivities,
  listAdminActivityIds,
  countUnreadAdminActivities,
  toInboxItem,
  normalizeKind,
  matchesInboxVisibility,
};
