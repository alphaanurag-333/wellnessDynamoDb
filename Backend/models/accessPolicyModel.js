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
const RULE_EFFECTS = new Set(["allow", "deny"]);
const POLICY_EFFECTS = new Set(["allow", "deny", "mixed"]);
const TARGET_TYPES = new Set(["role", "member"]);

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).trim().toLowerCase();
  return STATUS.has(next) ? next : fallback;
}

function normalizeRuleEffect(value, fallback = "deny") {
  const next = String(value || fallback).trim().toLowerCase();
  return RULE_EFFECTS.has(next) ? next : fallback;
}

function normalizeEffect(value, fallback = "deny") {
  const next = String(value || fallback).trim().toLowerCase();
  return POLICY_EFFECTS.has(next) ? next : fallback;
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
    item.description,
    item.featureId,
    item.featureName,
    item.sectionLabel,
    item.effect,
    ...(item.rules || []).flatMap((rule) => [rule.effect, rule.featureId, rule.featureName]),
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

function formatRuleText(featureName, actions) {
  const list = Array.isArray(actions) ? actions.filter(Boolean) : [];
  return `${list.join(" / ")} \u00b7 ${featureName}`;
}

function normalizeStoredRule(input) {
  const effect = normalizeRuleEffect(input?.effect || input?.type);
  const featureId = normalizeFeatureId(input?.featureId);
  const row = getFeatureRow(featureId);
  const allowed = row[3] || [];
  const incoming = Array.isArray(input?.actions) ? input.actions.map((action) => String(action).trim()) : [];
  const actions = allowed.filter((action) => incoming.includes(action));
  if (!actions.length) {
    throw new Error("Each policy rule needs at least one valid action");
  }
  return {
    effect,
    featureId,
    featureName: row[1],
    actions,
  };
}

function rulesFromLegacyItem(item) {
  if (!item?.featureId) return [];
  const row = getFeatureRow(item.featureId);
  if (!row) return [];
  return [
    {
      effect: normalizeRuleEffect(item.effect),
      featureId: row[2],
      featureName: row[1],
      actions: [...row[3]],
    },
  ];
}

function normalizeStoredRules(rules, fallback = {}) {
  if (Array.isArray(rules) && rules.length) {
    return rules.map(normalizeStoredRule);
  }
  if (fallback.featureId) {
    return rulesFromLegacyItem({
      featureId: fallback.featureId,
      effect: fallback.effect,
    });
  }
  throw new Error("Add at least one allow or deny rule");
}

function derivePolicyEffect(rules) {
  const effects = new Set((rules || []).map((rule) => rule.effect));
  if (effects.has("allow") && effects.has("deny")) return "mixed";
  if (effects.has("allow")) return "allow";
  return "deny";
}

function derivePolicyScope(effect) {
  if (effect === "allow") return "Allow";
  if (effect === "mixed") return "Mixed";
  return "Deny";
}

function derivePolicyDescription(item, rules, effect) {
  const custom = String(item?.description || "").trim();
  if (custom) return custom;
  if (effect === "mixed") return "Mix of allow and deny rules.";
  const names = [...new Set((rules || []).map((rule) => rule.featureName).filter(Boolean))];
  const label = names.join(", ") || "selected features";
  if (effect === "allow") return `Grants selected actions on ${label}.`;
  return `Blocks selected actions on ${label}.`;
}

function storedRulesFromItem(item) {
  try {
    if (Array.isArray(item?.rules) && item.rules.length) {
      return item.rules.map(normalizeStoredRule);
    }
  } catch {
    /* fall back to the original single-feature deny/allow shape */
  }
  return rulesFromLegacyItem(item);
}

function toPublicAccessPolicy(item) {
  if (!item) return null;
  const rules = storedRulesFromItem(item);
  const effect = derivePolicyEffect(rules);
  const primary = rules[0] || null;
  const row = getFeatureRow(primary?.featureId || item.featureId);
  const featureName = primary?.featureName || row?.[1] || item.featureName || item.featureId;
  const sectionLabel = row?.[0] || item.sectionLabel || "Policy";
  const attachments = Array.isArray(item.attachments) ? item.attachments.map(normalizeAttachment) : [];
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    status: normalizeStatus(item.status),
    effect,
    description: String(item.description || "").trim(),
    featureId: primary?.featureId || item.featureId || null,
    featureName,
    sectionId: row?.[4] || null,
    sectionLabel,
    scope: derivePolicyScope(effect),
    desc: derivePolicyDescription(item, rules, effect),
    rules: rules.map((rule) => ({
      type: rule.effect.toUpperCase(),
      effect: rule.effect,
      featureId: rule.featureId,
      featureName: rule.featureName,
      actions: rule.actions,
      action: rule.actions.join("/"),
      text: formatRuleText(rule.featureName, rule.actions),
    })),
    attachments,
    attachedCount: attachments.length,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function policyFieldsFromRules(rules, description) {
  const primary = rules[0];
  const row = getFeatureRow(primary.featureId);
  const effect = derivePolicyEffect(rules);
  return {
    description: String(description || "").trim(),
    featureId: primary.featureId,
    featureName: row?.[1] || primary.featureName,
    sectionLabel: row?.[0] || "",
    effect,
    rules,
  };
}

async function createAccessPolicy({
  name,
  description = "",
  featureId,
  effect = "deny",
  rules,
  status = "active",
}) {
  const now = new Date().toISOString();
  const storedRules = normalizeStoredRules(rules, { featureId, effect });
  const fields = policyFieldsFromRules(storedRules, description);
  const item = {
    id: uuidv4(),
    name: String(name || "").trim(),
    slug: normalizeSlug(name),
    ...fields,
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

async function getAccessPolicyRecord(id) {
  if (!id) return null;
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { id: String(id).trim() },
    })
  );
  return Item || null;
}

async function getAccessPolicyById(id) {
  const item = await getAccessPolicyRecord(id);
  return item ? toPublicAccessPolicy(item) : null;
}

async function updateAccessPolicy(id, updates) {
  const current = await getAccessPolicyRecord(id);
  if (!current) return null;
  const nextName =
    updates?.name !== undefined ? String(updates.name || "").trim() : current.name;
  const nextDescription =
    updates?.description !== undefined ? String(updates.description || "").trim() : current.description || "";
  const nextAttachments =
    updates?.attachments !== undefined
      ? (Array.isArray(updates.attachments) ? updates.attachments : []).map(normalizeAttachment)
      : Array.isArray(current.attachments)
        ? current.attachments.map(normalizeAttachment)
        : [];

  let storedRules;
  if (updates?.rules !== undefined) {
    storedRules = normalizeStoredRules(updates.rules, {
      featureId: updates.featureId || current.featureId,
      effect: updates.effect || current.effect,
    });
  } else if (updates?.featureId !== undefined || updates?.effect !== undefined) {
    storedRules = normalizeStoredRules(current.rules, {
      featureId: updates.featureId !== undefined ? updates.featureId : current.featureId,
      effect: updates.effect !== undefined ? updates.effect : current.effect,
    });
  } else {
    storedRules = Array.isArray(current.rules) && current.rules.length
      ? current.rules.map(normalizeStoredRule)
      : rulesFromLegacyItem(current);
  }

  const fields = policyFieldsFromRules(storedRules, nextDescription);
  const item = {
    ...current,
    name: nextName,
    slug: normalizeSlug(nextName),
    ...fields,
    status: updates?.status !== undefined ? normalizeStatus(updates.status) : normalizeStatus(current.status),
    attachments: nextAttachments,
    updatedAt: new Date().toISOString(),
  };
  item.searchBlob = buildSearchBlob(item);

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id: String(id).trim() },
      UpdateExpression:
        "SET #name = :name, slug = :slug, #description = :description, featureId = :featureId, featureName = :featureName, sectionLabel = :sectionLabel, effect = :effect, #rules = :rules, #status = :status, attachments = :attachments, searchBlob = :searchBlob, updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#name": "name",
        "#description": "description",
        "#rules": "rules",
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":name": item.name,
        ":slug": item.slug,
        ":description": item.description,
        ":featureId": item.featureId,
        ":featureName": item.featureName,
        ":sectionLabel": item.sectionLabel,
        ":effect": item.effect,
        ":rules": item.rules,
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
