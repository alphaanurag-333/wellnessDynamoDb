const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const { normalizeMediaField, resolveMediaFields } = require("../utils/s3");
const {
  listByPartitionKey,
  buildContainsFilter,
  appendFilter,
  sortByCreatedAtDesc,
} = require("../utils/dynamoList");

const TABLE = "MediaAsset";
const MEDIA_FIELDS = ["file"];
const STATUS = new Set(["active", "inactive"]);
const TYPES = new Set(["image", "video", "audio"]);

function normalizeStatus(value, fallback = "inactive") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUS.has(next) ? next : fallback;
}

function normalizeType(value, fallback = "image") {
  const next = String(value || fallback).toLowerCase().trim();
  return TYPES.has(next) ? next : fallback;
}

function normalizeVersionCount(value, fallback = 1) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), 999);
}

function formatFileSize(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function normalizeHistoryEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const n = Number(entry.n);
  if (!Number.isFinite(n) || n < 1) return null;
  const file = entry.file ? normalizeMediaField(entry.file, "file") : "";
  if (!file) return null;
  return {
    n: Math.floor(n),
    file,
    owner: String(entry.owner || "Admin").trim() || "Admin",
    fileSize: String(entry.fileSize || formatFileSize(entry.fileSizeBytes)).trim(),
    fileSizeBytes: Number.isFinite(Number(entry.fileSizeBytes))
      ? Math.floor(Number(entry.fileSizeBytes))
      : 0,
    uploadedAt: String(entry.uploadedAt || "").trim(),
  };
}

function normalizeHistoryList(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeHistoryEntry).filter(Boolean).slice(0, 30);
}

function toPublicHistoryEntry(entry) {
  const normalized = normalizeHistoryEntry(entry);
  if (!normalized) return null;
  const resolved = resolveMediaFields({ file: normalized.file }, MEDIA_FIELDS);
  return {
    n: normalized.n,
    file: resolved.file || "",
    url: resolved.file || "",
    owner: normalized.owner,
    fileSize: normalized.fileSize,
    fileSizeLabel: formatFileSize(normalized.fileSizeBytes) || normalized.fileSize,
    uploadedAt: normalized.uploadedAt,
  };
}

function toPublicMediaAsset(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  const resolved = resolveMediaFields(row, MEDIA_FIELDS);
  const history = normalizeHistoryList(resolved.history)
    .map((entry) => toPublicHistoryEntry(entry))
    .filter(Boolean);
  return {
    ...resolved,
    url: resolved.file || "",
    type: normalizeType(resolved.type, "image"),
    owner: String(resolved.owner || "Admin").trim() || "Admin",
    category: String(resolved.category || "").trim(),
    duration: String(resolved.duration || "").trim(),
    fileSize: String(resolved.fileSize || "").trim(),
    fileSizeLabel: formatFileSize(resolved.fileSizeBytes) || String(resolved.fileSize || "").trim(),
    versions: normalizeVersionCount(resolved.versions, 1),
    history,
  };
}

function sanitizeUpdateField(key, value) {
  if (key === "status") return normalizeStatus(value);
  if (key === "type") return normalizeType(value);
  if (key === "versions") return normalizeVersionCount(value);
  if (key === "history") return normalizeHistoryList(value);
  if (key === "fileSizeBytes") {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }
  if (key === "file") {
    if (value == null || String(value).trim() === "") return "";
    return normalizeMediaField(value, "file");
  }
  if (["title", "owner", "fileSize", "category", "duration"].includes(key)) {
    return String(value || "").trim();
  }
  return value;
}

function snapshotCurrentVersion(record) {
  if (!record?.file) return null;
  return normalizeHistoryEntry({
    n: Number(record.versions) || 1,
    file: record.file,
    owner: record.owner || "Admin",
    fileSize: record.fileSize,
    fileSizeBytes: record.fileSizeBytes,
    uploadedAt: record.updatedAt || record.createdAt || new Date().toISOString(),
  });
}

function toDayStartIso(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw}T00:00:00.000Z`;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function toDayEndIso(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw}T23:59:59.999Z`;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function createMediaAsset({
  title = "",
  owner = "Admin",
  type = "image",
  file,
  status = "inactive",
  category = "",
  duration = "",
  fileSize = "",
  fileSizeBytes = 0,
  versions = 1,
} = {}) {
  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    title: String(title || "Media asset").trim() || "Media asset",
    owner: String(owner || "Admin").trim() || "Admin",
    type: normalizeType(type),
    file: file ? normalizeMediaField(file, "file") : "",
    status: normalizeStatus(status),
    category: String(category || "").trim(),
    duration: String(duration || "").trim(),
    fileSize: String(fileSize || formatFileSize(fileSizeBytes)).trim(),
    fileSizeBytes: Number.isFinite(Number(fileSizeBytes)) ? Math.floor(Number(fileSizeBytes)) : 0,
    versions: normalizeVersionCount(versions, 1),
    history: [],
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

  return toPublicMediaAsset(item);
}

async function getMediaAssetRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function getMediaAssetById(id) {
  const item = await getMediaAssetRecordById(id);
  return item ? toPublicMediaAsset(item) : null;
}

async function updateMediaAsset(id, updates) {
  const blockedFields = new Set(["id", "_id", "createdAt"]);
  const entries = Object.entries(updates || {})
    .filter(([k, v]) => !blockedFields.has(k) && v !== undefined)
    .map(([k, v]) => [k, sanitizeUpdateField(k, v)]);

  if (entries.length === 0) throw new Error("No valid fields provided for update");

  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let setExpr = "SET updatedAt = :updatedAt";

  for (const [k, v] of entries) {
    exprNames[`#${k}`] = k;
    exprValues[`:${k}`] = v;
    setExpr += `, #${k} = :${k}`;
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

  return toPublicMediaAsset(Attributes || null);
}

async function deleteMediaAsset(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

async function listMediaAssets({
  page = 1,
  limit = 50,
  status,
  owner,
  search,
  type,
  category,
  from,
  to,
} = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const normalizedOwner = String(owner || "").trim();
  const normalizedType = type ? normalizeType(type, "") : "";
  const normalizedCategory = String(category || "").trim();
  const sortKeyFrom = toDayStartIso(from);
  const sortKeyTo = toDayEndIso(to);

  const searchFilter = buildContainsFilter(["title", "owner", "category"], search);
  let filterExpression = searchFilter.filterExpression;
  const exprNames = { ...searchFilter.exprNames };
  const exprValues = { ...searchFilter.exprValues };

  if (normalizedOwner) {
    exprNames["#owner"] = "owner";
    exprValues[":owner"] = normalizedOwner;
    filterExpression = appendFilter(filterExpression, "#owner = :owner");
  }
  if (normalizedType && TYPES.has(normalizedType)) {
    exprNames["#type"] = "type";
    exprValues[":type"] = normalizedType;
    filterExpression = appendFilter(filterExpression, "#type = :type");
  }
  if (normalizedCategory) {
    exprNames["#category"] = "category";
    exprValues[":category"] = normalizedCategory;
    filterExpression = appendFilter(filterExpression, "#category = :category");
  }

  // When filtering by date without a status partition, apply createdAt as a filter
  // (sort-key BETWEEN only works on a single status partition query).
  const useSortKeyRange = Boolean(normalizedStatus) && (sortKeyFrom || sortKeyTo);
  if (!useSortKeyRange && (sortKeyFrom || sortKeyTo)) {
    exprNames["#createdAt"] = "createdAt";
    if (sortKeyFrom && sortKeyTo) {
      exprValues[":from"] = sortKeyFrom;
      exprValues[":to"] = sortKeyTo;
      filterExpression = appendFilter(filterExpression, "#createdAt BETWEEN :from AND :to");
    } else if (sortKeyFrom) {
      exprValues[":from"] = sortKeyFrom;
      filterExpression = appendFilter(filterExpression, "#createdAt >= :from");
    } else {
      exprValues[":to"] = sortKeyTo;
      filterExpression = appendFilter(filterExpression, "#createdAt <= :to");
    }
  }

  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: normalizedStatus || undefined,
    sortKeyName: useSortKeyRange ? "createdAt" : undefined,
    sortKeyFrom: useSortKeyRange ? sortKeyFrom : undefined,
    sortKeyTo: useSortKeyRange ? sortKeyTo : undefined,
    filterExpression,
    exprNames,
    exprValues,
    search: searchFilter.search,
    searchFields: searchFilter.searchFields,
    scanIndexForward: false,
    page,
    limit,
    maxLimit: 200,
    sortFn: sortByCreatedAtDesc,
  });

  return {
    media: items.map((row) => toPublicMediaAsset(row)),
    pagination,
  };
}

async function restoreMediaAssetVersion(id, versionN) {
  const current = await getMediaAssetRecordById(id);
  if (!current) return null;

  const targetN = Number(versionN);
  const history = normalizeHistoryList(current.history);
  const target = history.find((entry) => entry.n === targetN);
  if (!target) throw new Error("VERSION_NOT_FOUND");

  const currentSnap = snapshotCurrentVersion(current);
  const nextHistory = history.filter((entry) => entry.n !== targetN);
  if (currentSnap && currentSnap.file !== target.file) {
    nextHistory.unshift(currentSnap);
  }

  return updateMediaAsset(id, {
    file: target.file,
    owner: target.owner,
    fileSize: target.fileSize,
    fileSizeBytes: target.fileSizeBytes,
    versions: (Number(current.versions) || 1) + 1,
    history: nextHistory.slice(0, 30),
  });
}

function collectMediaAssetFiles(record) {
  const keys = [];
  if (record?.file) keys.push(record.file);
  for (const entry of normalizeHistoryList(record?.history)) {
    if (entry.file) keys.push(entry.file);
  }
  return [...new Set(keys)];
}

module.exports = {
  createMediaAsset,
  getMediaAssetById,
  getMediaAssetRecordById,
  updateMediaAsset,
  deleteMediaAsset,
  listMediaAssets,
  restoreMediaAssetVersion,
  snapshotCurrentVersion,
  collectMediaAssetFiles,
  normalizeHistoryList,
  normalizeStatus,
  normalizeType,
  toPublicMediaAsset,
  formatFileSize,
  TYPES,
};
