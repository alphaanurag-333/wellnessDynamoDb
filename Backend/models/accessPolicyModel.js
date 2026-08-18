const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const { listByPartitionKey } = require("../utils/dynamoList");
const { PERM_CATALOG, ROLE_KEY_META } = require("../config/consolePermissionCatalog");

const TABLE = "AccessPolicy";
const STATUS = new Set(["active", "inactive"]);
const EFFECTS = new Set(["deny"]);
const TARGET_TYPES = new Set(["role", "member"]);

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).trim().toLowerCase();
  return STATUS.has(next) ? next : fallback;
}

function normalizeEffect(value, fallback = "deny") {
  const next = String(value || fallback).trim().toLowerCase();
  return EFFECTS.has(next) ? next : fallback;
}

function normalizeSlug(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getFeatureRow(featureId) {
  return PERM_CATALOG.find((row) => row[2] === String(featureId || "").trim()) || null;
}

function normalizeFeatureId(value) {
  const featureId = String(value || "").trim();
  if (!getFeatureRow(featureId)) {
    throw new Error("Invalid featureId");
  }
  return featureId;
}

function normalizeRoleKey(value) {
  const key = String(value || "").trim().toLowerCase();
  return ROLE_KEY_META[key] ? key : null;
}

function buildSearchBlob(item) {
  const parts = [
    item.name,
    item.featureId,
    item.featureName,
    item.sectionLabel,
    ...(item.attachments || []).flatMap((attachment) => [
      attachment.roleName,
      attachment.memberName,
      attachment.memberEmail,
    ]),
  ];
  return parts
    .flatMap((value) => String(value || "").trim().split(/\s+/))
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function normalizeAttachment(input) {
  if (!input || typeof input !== "object") {
    throw new Error("attachment must be an object");
  }
  const targetType = String(input.targetType || "").trim().toLowerCase();
  if (!TARGET_TYPES.has(targetType)) {
    throw new Error("Invalid attachment targetType");
  }
  const now = new Date().toISOString();
  if (targetType === "role") {
    const roleKey = normalizeRoleKey(input.roleKey);
    if (!roleKey) throw new Error("Invalid roleKey");
    return {
      id: input.id ? String(input.id).trim() : uuidv4(),
      targetType,
      roleKey,
      roleName: String(input.roleName || ROLE_KEY_META[roleKey]?.name || roleKey).trim(),
      createdAt: input.createdAt ? String(input.createdAt).trim() : now,
    };
  }
  const accountId = String(input.accountId || "").trim();
  if (!accountId) throw new Error("accountId is required");
  return {
    id: input.id ? String(input.id).trim() : uuidv4(),
    targetType,
    accountId,
    memberName: String(input.memberName || "Member").trim() || "Member",
    memberEmail: String(input.memberEmail || "").trim(),
    createdAt: input.createdAt ? String(input.createdAt).trim() : now,
  };
}

function formatRuleText(featureName, action) {
  return `${action} \u00b7 ${featureName}`;
}

function toPublicAccessPolicy(item) {
  if (!item) return null;
  const row = getFeatureRow(item.featureId);
  const featureName = row?.[1] || item.featureName || item.featureId;
  const sectionLabel = row?.[0] || item.sectionLabel || "Policy";
  const actions = row?.[3] || [];
  const attachments = Array.isArray(item.attachments) ? item.attachments.map(normalizeAttachment) : [];
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    status: normalizeStatus(item.status),
    effect: normalizeEffect(item.effect),
    featureId: item.featureId,
    featureName,
    sectionId: row?.[4] || null,
    sectionLabel,
    scope: "Deny",
    desc: `Blocks every action on ${featureName}.`,
    rules: actions.map((action) => ({
      type: "DENY",
      action,
      text: formatRuleText(featureName, action),
    })),
    attachments,
    attachedCount: attachments.length,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

async function createAccessPolicy({ name, featureId, effect = "deny", status = "active" }) {
  const row = getFeatureRow(featureId);
  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    name: String(name || "").trim(),
    slug: normalizeSlug(name),
    featureId: normalizeFeatureId(featureId),
    featureName: row[1],
    sectionLabel: row[0],
    effect: normalizeEffect(effect),
    status: normalizeStatus(status),
    attachments: [],
    createdAt: now,
    updatedAt: now,
  };
  item.searchBlob = buildSearchBlob(item);
  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );
  return toPublicAccessPolicy(item);
}

async function getAccessPolicyById(id) {
  if (!id) return null;
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { id: String(id).trim() },
    })
  );
  return Item ? toPublicAccessPolicy(Item) : null;
}

async function updateAccessPolicy(id, updates) {
  const current = await getAccessPolicyById(id);
  if (!current) return null;
  const nextName =
    updates?.name !== undefined ? String(updates.name || "").trim() : current.name;
  const nextFeatureId =
    updates?.featureId !== undefined ? normalizeFeatureId(updates.featureId) : current.featureId;
  const row = getFeatureRow(nextFeatureId);
  const nextAttachments =
    updates?.attachments !== undefined
      ? (Array.isArray(updates.attachments) ? updates.attachments : []).map(normalizeAttachment)
      : current.attachments;
  const item = {
    ...current,
    name: nextName,
    slug: normalizeSlug(nextName),
    featureId: nextFeatureId,
    featureName: row?.[1] || current.featureName,
    sectionLabel: row?.[0] || current.sectionLabel,
    effect: updates?.effect !== undefined ? normalizeEffect(updates.effect) : current.effect,
    status: updates?.status !== undefined ? normalizeStatus(updates.status) : current.status,
    attachments: nextAttachments,
    updatedAt: new Date().toISOString(),
  };
  item.searchBlob = buildSearchBlob(item);

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id: String(id).trim() },
      UpdateExpression:
        "SET #name = :name, slug = :slug, featureId = :featureId, featureName = :featureName, sectionLabel = :sectionLabel, effect = :effect, #status = :status, attachments = :attachments, searchBlob = :searchBlob, updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#name": "name",
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":name": item.name,
        ":slug": item.slug,
        ":featureId": item.featureId,
        ":featureName": item.featureName,
        ":sectionLabel": item.sectionLabel,
        ":effect": item.effect,
        ":status": item.status,
        ":attachments": item.attachments,
        ":searchBlob": item.searchBlob,
        ":updatedAt": item.updatedAt,
      },
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    })
  );
  return toPublicAccessPolicy(Attributes || null);
}

async function deleteAccessPolicy(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id: String(id).trim() },
      ConditionExpression: "attribute_exists(id)",
    })
  );
  return { deleted: true };
}

async function listAccessPolicies({ page = 1, limit = 100, status = "active", search } = {}) {
  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: normalizeStatus(status),
    page,
    limit,
    maxLimit: 200,
    search,
    searchFields: ["searchBlob"],
  });
  return {
    items: (items || []).map(toPublicAccessPolicy),
    pagination,
  };
}

function policyAppliesToTarget(policy, { roleKey, accountId } = {}) {
  const role = normalizeRoleKey(roleKey);
  const account = String(accountId || "").trim();
  return (policy?.attachments || []).some((attachment) => {
    if (attachment.targetType === "role") {
      return role && attachment.roleKey === role;
    }
    if (attachment.targetType === "member") {
      return account && attachment.accountId === account;
    }
    return false;
  });
}

module.exports = {
  createAccessPolicy,
  getAccessPolicyById,
  updateAccessPolicy,
  deleteAccessPolicy,
  listAccessPolicies,
  toPublicAccessPolicy,
  normalizeFeatureId,
  normalizeAttachment,
  policyAppliesToTarget,
};
