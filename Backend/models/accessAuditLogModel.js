const { PutCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const { listByPartitionKey } = require("../utils/dynamoList");

const TABLE = "AccessAuditLog";
const SCOPE = "access";
const KINDS = new Set(["role", "permission", "activity"]);

function normalizeKind(value, fallback = "activity") {
  const next = String(value || fallback).trim().toLowerCase();
  return KINDS.has(next) ? next : fallback;
}

function kindLabel(kind) {
  const key = normalizeKind(kind);
  if (key === "role") return "Role";
  if (key === "permission") return "Permission";
  return "Activity";
}

function buildSearchBlob(fields) {
  return fields
    .flatMap((value) => String(value || "").trim().split(/\s+/))
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function toPublicAccessAuditLog(item) {
  if (!item) return null;
  return {
    id: item.id,
    kind: kindLabel(item.kind),
    kindKey: normalizeKind(item.kind),
    text: item.text,
    detail: item.detail || "",
    subject: item.subject || "",
    subjectMeta: item.subjectMeta || "",
    actor: item.actor || "Staff",
    actorAccountId: item.actorAccountId || null,
    createdAt: item.createdAt,
  };
}

async function createAccessAuditLog({
  kind,
  text,
  detail = "",
  subject = "",
  subjectMeta = "",
  actor = "Staff",
  actorAccountId = null,
  createdAt,
}) {
  const now = createdAt || new Date().toISOString();
  const normalizedKind = normalizeKind(kind);
  const item = {
    id: uuidv4(),
    scope: SCOPE,
    kind: normalizedKind,
    text: String(text || "").trim(),
    detail: String(detail || "").trim(),
    subject: String(subject || "").trim(),
    subjectMeta: String(subjectMeta || "").trim(),
    actor: String(actor || "Staff").trim() || "Staff",
    actorAccountId: actorAccountId ? String(actorAccountId).trim() : null,
    searchBlob: buildSearchBlob([text, detail, subject, subjectMeta, actor]),
    createdAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
    })
  );

  return item;
}

async function listAccessAuditLogs({
  kind,
  search,
  page = 1,
  limit = 50,
} = {}) {
  const kindFilter = kind ? normalizeKind(kind) : null;
  const searchFields = ["searchBlob"];

  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "ScopeCreatedAtIndex",
    partitionKeyName: "scope",
    partitionKeyValue: SCOPE,
    page,
    limit,
    maxLimit: 200,
    search,
    searchFields,
    filterExpression: kindFilter ? "#kind = :kind" : undefined,
    exprNames: kindFilter ? { "#kind": "kind" } : {},
    exprValues: kindFilter ? { ":kind": kindFilter } : {},
  });

  return {
    items: (items || []).map(toPublicAccessAuditLog),
    pagination,
  };
}

async function seedAccessAuditLogSamplesIfEmpty() {
  const { pagination } = await listAccessAuditLogs({ page: 1, limit: 1 });
  if ((pagination?.total || 0) > 0) return false;

  const now = Date.now();
  const samples = [
    {
      kind: "role",
      text: "Promoted Ishita Sen to Assistant WC",
      detail: "Approved by Admin",
      subject: "Ishita Sen",
      subjectMeta: "IRW-1042",
      actor: "Admin",
      createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      kind: "permission",
      text: "Policy attached: Hide medical fields",
      detail: "Assistant WC role",
      subject: "Asst. Coach",
      subjectMeta: "Role",
      actor: "Sanjay Mehta",
      createdAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      kind: "activity",
      text: "Coach reassigned for Madhupriya Bilas",
      detail: "Anita Rao → Priya Nair",
      subject: "Madhupriya Bilas",
      subjectMeta: "IRW-1001",
      actor: "Admin",
      createdAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      kind: "permission",
      text: "Denied view on Client PII",
      detail: "Support role matrix",
      subject: "Support",
      subjectMeta: "Role",
      actor: "Aarti Deshmukh",
      createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      kind: "activity",
      text: "Broadcast sent to all users",
      detail: "Broadcast sent to all users",
      subject: "Global",
      subjectMeta: "—",
      actor: "Admin",
      createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      kind: "role",
      text: "New trainee account created",
      detail: "Ritu Sharma",
      subject: "Ritu Sharma",
      subjectMeta: "IRW-1098",
      actor: "Anita Rao",
      createdAt: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  for (const sample of samples) {
    await createAccessAuditLog(sample);
  }
  return true;
}

module.exports = {
  createAccessAuditLog,
  listAccessAuditLogs,
  seedAccessAuditLogSamplesIfEmpty,
  toPublicAccessAuditLog,
  kindLabel,
};
