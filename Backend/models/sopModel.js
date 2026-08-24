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
  sortByCreatedAtDesc,
  paginateItems,
  filterItemsBySearch,
} = require("../utils/dynamoList");
const { resolvePublicUrl, normalizeNullableMediaField } = require("../utils/s3");

const TABLE = "Sop";
const ALLOWED_STATUS = new Set(["active", "inactive"]);
const ALLOWED_CATEGORIES = new Set([
  "onboarding",
  "escalation",
  "nutrition",
  "reviews",
  "payments",
]);
const ALLOWED_CONTENT_TYPES = new Set(["text", "word", "pdf", "video"]);
const { normalizeAudienceRoleInput, AUDIENCE_ALL } = require("../utils/sopAudienceRole");

function normalizeStatus(status, fallback = "active") {
  const next = String(status || fallback).toLowerCase().trim();
  return ALLOWED_STATUS.has(next) ? next : fallback;
}

function normalizeCategory(category, fallback = "onboarding") {
  const next = String(category || fallback).toLowerCase().trim();
  return ALLOWED_CATEGORIES.has(next) ? next : fallback;
}

function normalizeContentType(contentType, fallback = "text") {
  const next = String(contentType || fallback).toLowerCase().trim();
  return ALLOWED_CONTENT_TYPES.has(next) ? next : fallback;
}

function normalizeAudienceRole(audienceRole, fallback = AUDIENCE_ALL) {
  const next = normalizeAudienceRoleInput(audienceRole);
  return next || fallback;
}

function normalizeSteps(steps) {
  if (Array.isArray(steps)) {
    return steps.map((s) => String(s || "").trim()).filter(Boolean);
  }
  if (typeof steps === "string") {
    const raw = steps.trim();
    if (raw.startsWith("[")) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((s) => String(s || "").trim()).filter(Boolean);
        }
      } catch {
        /* fall through to line split */
      }
    }
    return raw
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeLinkUrl(value) {
  const raw = String(value || "").trim();
  return raw || null;
}

function toPublicSop(item) {
  if (!item) return null;
  const steps = Array.isArray(item.steps) ? item.steps : [];
  const contentType = normalizeContentType(item.contentType || (steps.length ? "text" : "text"));
  const fileKey = item.fileKey || null;
  const fileUrl = fileKey ? resolvePublicUrl(fileKey) : null;
  return {
    ...item,
    contentType,
    audienceRole: normalizeAudienceRole(item.audienceRole, AUDIENCE_ALL),
    steps,
    stepCount: steps.length,
    fileKey,
    fileUrl: fileUrl || null,
    fileName: item.fileName || null,
    linkUrl: item.linkUrl || null,
  };
}

async function createSop({
  title,
  category = "onboarding",
  contentType = "text",
  audienceRole = AUDIENCE_ALL,
  steps = [],
  fileKey = null,
  fileName = null,
  linkUrl = null,
  author = "Admin desk",
  status = "active",
}) {
  const now = new Date().toISOString();
  const type = normalizeContentType(contentType);
  const item = {
    id: uuidv4(),
    title: String(title || "").trim(),
    category: normalizeCategory(category),
    contentType: type,
    audienceRole: normalizeAudienceRole(audienceRole),
    steps: type === "text" ? normalizeSteps(steps) : [],
    fileKey: fileKey ? normalizeNullableMediaField(fileKey, "fileKey") : null,
    fileName: fileName ? String(fileName).trim() || null : null,
    linkUrl: type === "video" ? normalizeLinkUrl(linkUrl) : null,
    author: String(author || "Admin desk").trim() || "Admin desk",
    status: normalizeStatus(status),
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

  return toPublicSop(item);
}

async function getSopById(id) {
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { id },
    })
  );
  return toPublicSop(Item || null);
}

async function updateSop(id, updates) {
  const patch = { ...(updates || {}) };
  if (patch.contentType !== undefined) {
    patch.contentType = normalizeContentType(patch.contentType);
  }
  if (patch.steps !== undefined) {
    patch.steps = normalizeSteps(patch.steps);
  }
  if (patch.fileKey !== undefined) {
    patch.fileKey = patch.fileKey
      ? normalizeNullableMediaField(patch.fileKey, "fileKey")
      : null;
  }
  if (patch.linkUrl !== undefined) {
    patch.linkUrl = normalizeLinkUrl(patch.linkUrl);
  }
  if (patch.fileName !== undefined) {
    patch.fileName = patch.fileName ? String(patch.fileName).trim() || null : null;
  }

  const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    throw new Error("No valid fields provided for update");
  }

  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let setExpr = "SET updatedAt = :updatedAt";

  for (const [key, value] of entries) {
    const n = `#${key}`;
    const v = `:${key}`;
    exprNames[n] = key;
    exprValues[v] = value;
    setExpr += `, ${n} = ${v}`;
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

  return toPublicSop(Attributes || null);
}

async function deleteSop(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

async function listSops({ page = 1, limit = 50, status, category, audienceRole, search } = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const normalizedCategory = category ? normalizeCategory(category, "") : "";
  const normalizedAudienceRole = audienceRole ? normalizeAudienceRole(audienceRole, "") : "";
  const searchTerm = String(search || "").trim();
  const searching = Boolean(searchTerm) || Boolean(normalizedCategory) || Boolean(normalizedAudienceRole);

  const result = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusIndex",
    partitionKeyValue: normalizedStatus || undefined,
    scanIndexForward: false,
    page: searching ? 1 : page,
    limit: searching ? Number.MAX_SAFE_INTEGER : limit,
    maxLimit: searching ? Number.MAX_SAFE_INTEGER : 200,
    sortFn: sortByCreatedAtDesc,
  });

  let items = result.items.map(toPublicSop);

  if (normalizedCategory) {
    items = items.filter((item) => item.category === normalizedCategory);
  }

  if (normalizedAudienceRole) {
    items = items.filter((item) => item.audienceRole === normalizedAudienceRole);
  }

  if (searchTerm) {
    items = filterItemsBySearch(items, {
      search: searchTerm,
      searchFields: ["title", "category", "audienceRole", "author", "steps", "fileName", "linkUrl"],
    });
  }

  if (!searching) {
    return { sops: items, pagination: result.pagination };
  }

  const paged = paginateItems(items, page, limit, 200);
  return { sops: paged.items, pagination: paged.pagination };
}

module.exports = {
  TABLE,
  ALLOWED_CATEGORIES,
  ALLOWED_CONTENT_TYPES,
  createSop,
  getSopById,
  updateSop,
  deleteSop,
  listSops,
  normalizeStatus,
  normalizeCategory,
  normalizeContentType,
  normalizeAudienceRole,
  normalizeSteps,
};
