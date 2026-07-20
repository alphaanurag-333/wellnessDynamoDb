const { QueryCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");

const DEFAULT_STATUS_PARTITIONS = ["active", "inactive"];

function normalizePageLimit(page, limit, maxLimit = 200) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(maxLimit, Math.max(1, Number(limit) || 20));
  return { safePage, safeLimit, skip: (safePage - 1) * safeLimit };
}

function mergeExpr(baseNames = {}, baseValues = {}, extraNames = {}, extraValues = {}) {
  const ExpressionAttributeNames = { ...baseNames, ...extraNames };
  const ExpressionAttributeValues = { ...baseValues, ...extraValues };
  return {
    ExpressionAttributeNames:
      Object.keys(ExpressionAttributeNames).length > 0 ? ExpressionAttributeNames : undefined,
    ExpressionAttributeValues:
      Object.keys(ExpressionAttributeValues).length > 0 ? ExpressionAttributeValues : undefined,
  };
}

/**
 * Iterate Query or Scan, apply skip/limit without loading unbounded rows when possible.
 * Returns { items, total } where total is the count of all matching rows.
 */
async function paginateDynamo({
  command: Command,
  baseParams,
  page = 1,
  limit = 20,
  maxLimit = 200,
}) {
  const { safePage, safeLimit, skip } = normalizePageLimit(page, limit, maxLimit);
  const items = [];
  let total = 0;
  let skipped = 0;
  let lastKey;

  do {
    const params = { ...baseParams, ExclusiveStartKey: lastKey };
    const { Items, LastEvaluatedKey } = await docClient.send(new Command(params));
    const batch = Items || [];

    for (const item of batch) {
      total += 1;
      if (skipped < skip) {
        skipped += 1;
      } else if (items.length < safeLimit) {
        items.push(item);
      }
    }

    lastKey = LastEvaluatedKey;
  } while (lastKey);

  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
}

async function queryPartition({
  tableName,
  indexName,
  partitionKeyName,
  partitionKeyValue,
  filterExpression,
  exprNames,
  exprValues,
  scanIndexForward = false,
  page,
  limit,
  maxLimit,
}) {
  const keyNames = { [`#${partitionKeyName}`]: partitionKeyName };
  const keyValues = { [`:${partitionKeyName}`]: partitionKeyValue };
  const merged = mergeExpr(keyNames, keyValues, exprNames, exprValues);

  return paginateDynamo({
    command: QueryCommand,
    baseParams: {
      TableName: tableName,
      IndexName: indexName,
      KeyConditionExpression: `#${partitionKeyName} = :${partitionKeyName}`,
      ScanIndexForward: scanIndexForward,
      ...(filterExpression ? { FilterExpression: filterExpression } : {}),
      ...merged,
    },
    page,
    limit,
    maxLimit,
  });
}

async function mergePartitionResults(partitions, { page, limit, maxLimit, sortFn }) {
  const { safePage, safeLimit, skip } = normalizePageLimit(page, limit, maxLimit);
  const rows = [];

  for (const partitionValue of partitions) {
    const part = await queryPartition({ ...partitionValue, page: 1, limit: Number.MAX_SAFE_INTEGER, maxLimit: Number.MAX_SAFE_INTEGER });
    rows.push(...part.items);
  }

  if (typeof sortFn === "function") {
    rows.sort(sortFn);
  }

  const total = rows.length;
  const items = rows.slice(skip, skip + safeLimit);

  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
}

/**
 * List rows using a status (or similar) GSI partition key.
 * When status is omitted, queries each value in statusPartitions and merges (avoids full-table Scan).
 */
async function listByPartitionKey({
  tableName,
  indexName,
  partitionKeyName = "status",
  partitionKeyValue,
  statusPartitions = DEFAULT_STATUS_PARTITIONS,
  filterExpression,
  exprNames = {},
  exprValues = {},
  scanIndexForward = false,
  page = 1,
  limit = 20,
  maxLimit = 200,
  sortFn,
  search,
  searchFields,
  searchFn,
}) {
  const searchTerm = String(search || "").trim();
  const useMemorySearch =
    Boolean(searchTerm) &&
    (typeof searchFn === "function" || (Array.isArray(searchFields) && searchFields.length > 0));
  // Custom sort must run on the full filtered set before paging (index order ≠ sortFn).
  const needsFullFetch = useMemorySearch || typeof sortFn === "function";
  const queryPage = needsFullFetch ? 1 : page;
  const queryLimit = needsFullFetch ? Number.MAX_SAFE_INTEGER : limit;
  const queryMaxLimit = needsFullFetch ? Number.MAX_SAFE_INTEGER : maxLimit;
  const queryFilter = useMemorySearch ? undefined : filterExpression;

  let result;
  if (partitionKeyValue) {
    result = await queryPartition({
      tableName,
      indexName,
      partitionKeyName,
      partitionKeyValue,
      filterExpression: queryFilter,
      exprNames,
      exprValues,
      scanIndexForward,
      page: queryPage,
      limit: queryLimit,
      maxLimit: queryMaxLimit,
    });
  } else {
    // Loads each partition fully, then sorts (if sortFn) and slices.
    // When searching, request an unpaged set so in-memory filter can run first.
    result = await mergePartitionResults(
      statusPartitions.map((value) => ({
        tableName,
        indexName,
        partitionKeyName,
        partitionKeyValue: value,
        filterExpression: queryFilter,
        exprNames,
        exprValues,
        scanIndexForward,
      })),
      {
        page: useMemorySearch ? 1 : page,
        limit: useMemorySearch ? Number.MAX_SAFE_INTEGER : limit,
        maxLimit: useMemorySearch ? Number.MAX_SAFE_INTEGER : maxLimit,
        sortFn,
      }
    );
  }

  if (useMemorySearch) {
    let items = result.items;
    if (filterExpression) {
      items = applyExprFilterInMemory(items, filterExpression, exprNames, exprValues);
    }
    const filtered = filterItemsBySearch(items, { search: searchTerm, searchFields, searchFn });
    if (typeof sortFn === "function") {
      filtered.sort(sortFn);
    }
    return paginateItems(filtered, page, limit, maxLimit);
  }

  // Single-partition path: sort full set, then paginate.
  if (partitionKeyValue && typeof sortFn === "function") {
    result.items.sort(sortFn);
    return paginateItems(result.items, page, limit, maxLimit);
  }

  return result;
}

function paginateItems(items, page, limit, maxLimit = 200) {
  const { safePage, safeLimit, skip } = normalizePageLimit(page, limit, maxLimit);
  const total = items.length;
  return {
    items: items.slice(skip, skip + safeLimit),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
}

function fieldMatchesTerm(item, field, term) {
  const value = item[field];
  if (Array.isArray(value)) {
    return value.some((entry) => String(entry || "").toLowerCase().includes(term));
  }
  return String(value || "").toLowerCase().includes(term);
}

function resolveExprField(exprNames, token) {
  return exprNames[token] || token.replace(/^#/, "");
}

function resolveExprValue(exprValues, token) {
  return exprValues[token];
}

function matchesExprClause(item, clause, exprNames, exprValues) {
  const trimmed = String(clause || "").trim();
  if (!trimmed) return true;

  const eqMatch = trimmed.match(/^(#\w+)\s*=\s*(:\w+)$/);
  if (eqMatch) {
    const field = resolveExprField(exprNames, eqMatch[1]);
    const value = resolveExprValue(exprValues, eqMatch[2]);
    return String(item[field] ?? "").toLowerCase() === String(value ?? "").toLowerCase();
  }

  const containsMatch = trimmed.match(/^contains\((#\w+),\s*(:\w+)\)$/);
  if (containsMatch) {
    const field = resolveExprField(exprNames, containsMatch[1]);
    const value = resolveExprValue(exprValues, containsMatch[2]);
    return String(item[field] || "").toLowerCase().includes(String(value || "").toLowerCase());
  }

  return true;
}

function applyExprFilterInMemory(items, filterExpression, exprNames = {}, exprValues = {}) {
  if (!filterExpression) return items;
  const clauses = String(filterExpression).split(/\s+AND\s+/i);
  return items.filter((item) =>
    clauses.every((clause) => matchesExprClause(item, clause, exprNames, exprValues))
  );
}

function filterItemsBySearch(items, { search, searchFields, searchFn }) {
  const term = String(search || "").trim().toLowerCase();
  if (!term) return items;
  if (typeof searchFn === "function") {
    return items.filter((item) => searchFn(item, term));
  }
  if (!Array.isArray(searchFields) || searchFields.length === 0) return items;
  return items.filter((item) =>
    searchFields.some((field) => fieldMatchesTerm(item, field, term))
  );
}

async function listByScan({
  tableName,
  filterExpression,
  exprNames = {},
  exprValues = {},
  page = 1,
  limit = 20,
  maxLimit = 200,
  sortFn,
}) {
  const merged = mergeExpr({}, {}, exprNames, exprValues);
  const result = await paginateDynamo({
    command: ScanCommand,
    baseParams: {
      TableName: tableName,
      ...(filterExpression ? { FilterExpression: filterExpression } : {}),
      ...merged,
    },
    page,
    limit,
    maxLimit,
  });

  if (typeof sortFn === "function") {
    result.items.sort(sortFn);
  }

  return result;
}

function buildContainsFilter(fields, search, names = {}, values = {}) {
  const normalizedSearch = String(search || "").trim();
  if (!normalizedSearch) {
    return { filterExpression: null, exprNames: names, exprValues: values, search: null, searchFields: null };
  }

  // DynamoDB contains() is case-sensitive; defer to in-memory filter in listByPartitionKey.
  return {
    filterExpression: null,
    exprNames: names,
    exprValues: values,
    search: normalizedSearch,
    searchFields: fields,
  };
}

function appendFilter(existing, addition) {
  if (!addition) return existing;
  if (!existing) return addition;
  return `${existing} AND ${addition}`;
}

function sortByCreatedAtDesc(a, b) {
  return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
}

function sortBySentAtDesc(a, b) {
  return String(b.sentAt || "").localeCompare(String(a.sentAt || ""));
}

function sortByUpdatedAtDesc(a, b) {
  return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
}

module.exports = {
  DEFAULT_STATUS_PARTITIONS,
  normalizePageLimit,
  paginateDynamo,
  paginateItems,
  fieldMatchesTerm,
  applyExprFilterInMemory,
  filterItemsBySearch,
  queryPartition,
  listByPartitionKey,
  listByScan,
  buildContainsFilter,
  appendFilter,
  sortByCreatedAtDesc,
  sortBySentAtDesc,
  sortByUpdatedAtDesc,
};
