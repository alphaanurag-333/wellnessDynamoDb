const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const { docClient } = require("../config/db");
const {
  listByPartitionKey,
  sortByUpdatedAtDesc,
} = require("../utils/dynamoList");
const {
  compileLegalBlocksToHtml,
  normalizeLegalBlocks,
  slugCandidates,
} = require("../utils/legalBlocks");
const { normalizeStoredMedia, resolvePublicUrl } = require("../utils/s3");

const TABLE = "StaticPage";
const STATUS = new Set(["active", "inactive"]);

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUS.has(next) ? next : fallback;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Store icon as S3 key when possible; keep empty string to clear. */
function normalizeIconField(value) {
  if (value === undefined) return undefined;
  if (value === null || String(value).trim() === "") return "";
  const raw = String(value).trim();
  const key = normalizeStoredMedia(raw);
  return key || raw;
}

function resolveIconUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return resolvePublicUrl(raw) || raw;
}

function withLegacyId(row) {
  if (!row) return null;
  return { ...row, _id: row.id };
}

async function getPageBySlug(slug) {
  const clean = slugify(slug);
  if (!clean) return null;
  const { Items } = await docClient.send(new QueryCommand({
    TableName: TABLE,
    IndexName: "SlugIndex",
    KeyConditionExpression: "slug = :slug",
    ExpressionAttributeValues: { ":slug": clean },
    Limit: 1,
  }));
  return withLegacyId(Items?.[0] || null);
}

async function getPageBySlugWithAliases(slug) {
  for (const candidate of slugCandidates(slug)) {
    const row = await getPageBySlug(candidate);
    if (row) return row;
  }
  return null;
}

function compactHtml(value) {
  return String(value || "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?o:p[^>]*>/gi, "")
    .replace(/\s*mso-[a-z-]+:[^;"]+;?/gi, "")
    .replace(/\sclass="Mso[a-zA-Z0-9]+"/gi, "")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function storedBlocks(row) {
  return normalizeLegalBlocks(row?.blocks);
}

function storedPageContent(row) {
  return compactHtml(row?.content);
}

function pageHtml(row, surface = "web") {
  const content = storedPageContent(row);
  if (content) return content;
  return compileLegalBlocksToHtml(storedBlocks(row), surface);
}

function toAdminPagePayload(row) {
  if (!row) return null;
  const payload = {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    content: pageHtml(row),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
  const icon = resolveIconUrl(row.icon);
  if (icon) payload.icon = icon;
  const blocks = storedBlocks(row);
  if (blocks.length) payload.blocks = blocks;
  return payload;
}

function toPublicPagePayload(row, surface = "web") {
  if (!row) return null;
  const payload = {
    title: row.title,
    slug: row.slug,
    content: pageHtml(row, surface),
  };
  const icon = resolveIconUrl(row.icon);
  if (icon) payload.icon = icon;
  return payload;
}

async function listPages() {
  const { items } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusUpdatedAtIndex",
    scanIndexForward: false,
    page: 1,
    limit: Number.MAX_SAFE_INTEGER,
    maxLimit: Number.MAX_SAFE_INTEGER,
    sortFn: sortByUpdatedAtDesc,
  });

  return items.map(withLegacyId);
}

async function getPageById(id) {
  const { Item } = await docClient.send(new GetCommand({
    TableName: TABLE,
    Key: { id },
  }));
  return withLegacyId(Item || null);
}

async function createPage({ title, content = "", status = "active", slug, blocks, icon }) {
  const cleanTitle = String(title || "").trim();
  const now = new Date().toISOString();
  const cleanSlug = slugify(slug || cleanTitle);
  const normalizedBlocks = blocks !== undefined ? normalizeLegalBlocks(blocks) : undefined;
  const compiled = compactHtml(
    normalizedBlocks
      ? compileLegalBlocksToHtml(normalizedBlocks)
      : content,
  );
  const normalizedIcon = normalizeIconField(icon);

  const existing = await getPageBySlug(cleanSlug);
  if (existing) {
    const err = new Error("slug already exists");
    err.code = "DUPLICATE_SLUG";
    throw err;
  }

  const item = {
    id: uuidv4(),
    title: cleanTitle,
    slug: cleanSlug,
    content: compiled,
    status: normalizeStatus(status),
    createdAt: now,
    updatedAt: now,
  };
  if (normalizedBlocks) item.blocks = normalizedBlocks;
  if (normalizedIcon) item.icon = normalizedIcon;

  await docClient.send(new PutCommand({
    TableName: TABLE,
    Item: item,
    ConditionExpression: "attribute_not_exists(id)",
  }));

  return withLegacyId(item);
}

async function updatePage(id, updates) {
  const existing = await getPageById(id);
  if (!existing) {
    const err = new Error("page not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  const next = { ...updates };

  const removeKeys = [];
  if (next.blocks === null) {
    delete next.blocks;
    removeKeys.push("blocks");
  } else if (next.blocks !== undefined) {
    next.blocks = normalizeLegalBlocks(next.blocks);
    if (next.content === undefined) {
      next.content = compileLegalBlocksToHtml(next.blocks);
    }
  }

  if (next.content !== undefined) {
    next.content = compactHtml(next.content);
  }

  if (next.icon !== undefined) {
    next.icon = normalizeIconField(next.icon);
  }

  if (next.slug !== undefined) {
    const candidateSlug = slugify(next.slug);
    if (!candidateSlug) {
      const err = new Error("slug is required");
      err.code = "INVALID_SLUG";
      throw err;
    }
    if (candidateSlug !== existing.slug) {
      const slugRow = await getPageBySlug(candidateSlug);
      if (slugRow && slugRow.id !== id) {
        const err = new Error("slug already exists");
        err.code = "DUPLICATE_SLUG";
        throw err;
      }
    }
    next.slug = candidateSlug;
  }

  const entries = Object.entries(next).filter(([, value]) => value !== undefined);
  if (entries.length === 0 && !removeKeys.length) {
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

  for (const key of removeKeys) {
    exprNames[`#${key}`] = key;
  }
  const removeExpr = removeKeys.length
    ? ` REMOVE ${removeKeys.map((key) => `#${key}`).join(", ")}`
    : "";

  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { id },
    UpdateExpression: setExpr + removeExpr,
    ExpressionAttributeNames: exprNames,
    ExpressionAttributeValues: exprValues,
    ConditionExpression: "attribute_exists(id)",
    ReturnValues: "ALL_NEW",
  }));

  return withLegacyId(Attributes || null);
}

async function deletePage(id) {
  await docClient.send(new DeleteCommand({
    TableName: TABLE,
    Key: { id },
    ConditionExpression: "attribute_exists(id)",
  }));
}

module.exports = {
  listPages,
  getPageById,
  getPageBySlug,
  getPageBySlugWithAliases,
  toAdminPagePayload,
  toPublicPagePayload,
  createPage,
  updatePage,
  deletePage,
  slugify,
  normalizeStatus,
  normalizeIconField,
};
