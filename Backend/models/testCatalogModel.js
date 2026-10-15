const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const {
  listByPartitionKey,
  buildContainsFilter,
  sortByCreatedAtDesc,
} = require("../utils/dynamoList");

const TABLE = "TestCatalog";
const ALLOWED_STATUS = ["active", "inactive"];
const ALLOWED_TYPES = ["PROFILE", "SINGLE"];
const FASTING_TYPES = ["Fasting", "Non-fasting", "Post-prandial"];
const STATUS = new Set(ALLOWED_STATUS);
const TYPES = new Set(ALLOWED_TYPES);
const NAME_MIN_LEN = 2;
const NAME_MAX_LEN = 200;
const CATEGORY_MIN_LEN = 2;
const CATEGORY_MAX_LEN = 100;
const TEST_ID_MAX_LEN = 80;
const DURATION_MAX_LEN = 80;
const PARAM_NAME_MAX_LEN = 100;
const UNIT_MAX_LEN = 40;
const REF_RANGE_MAX_LEN = 120;
const MAX_PARAMETERS = 50;

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUS.has(next) ? next : fallback;
}

function normalizeType(value, fallback = "SINGLE") {
  const next = String(value || fallback).toUpperCase().trim();
  return TYPES.has(next) ? next : fallback;
}

function normalizeTestId(value) {
  const testId = slugify(value);
  if (!testId) {
    const err = new Error("testId is required");
    err.name = "ValidationError";
    throw err;
  }
  if (testId.length > TEST_ID_MAX_LEN) {
    const err = new Error(`testId cannot exceed ${TEST_ID_MAX_LEN} characters`);
    err.name = "ValidationError";
    throw err;
  }
  return testId;
}

function normalizeName(value) {
  const name = String(value || "").trim();
  if (!name) {
    const err = new Error("name is required");
    err.name = "ValidationError";
    throw err;
  }
  if (name.length < NAME_MIN_LEN) {
    const err = new Error(`name must be at least ${NAME_MIN_LEN} characters`);
    err.name = "ValidationError";
    throw err;
  }
  if (name.length > NAME_MAX_LEN) {
    const err = new Error(`name cannot exceed ${NAME_MAX_LEN} characters`);
    err.name = "ValidationError";
    throw err;
  }
  return name;
}

function normalizeCategory(value) {
  const category = String(value || "").trim();
  if (!category) {
    const err = new Error("category is required");
    err.name = "ValidationError";
    throw err;
  }
  if (category.length < CATEGORY_MIN_LEN) {
    const err = new Error(`category must be at least ${CATEGORY_MIN_LEN} characters`);
    err.name = "ValidationError";
    throw err;
  }
  if (category.length > CATEGORY_MAX_LEN) {
    const err = new Error(`category cannot exceed ${CATEGORY_MAX_LEN} characters`);
    err.name = "ValidationError";
    throw err;
  }
  return category;
}

function normalizeFastingType(value, { required = false } = {}) {
  const next = String(value ?? "").trim();
  if (!next) {
    if (!required) return "";
    const err = new Error("fasting type is required");
    err.name = "ValidationError";
    throw err;
  }
  const match = FASTING_TYPES.find((entry) => entry.toLowerCase() === next.toLowerCase());
  if (!match) {
    const err = new Error(`fasting type must be one of: ${FASTING_TYPES.join(", ")}`);
    err.name = "ValidationError";
    throw err;
  }
  return match;
}

function normalizeDuration(value, { required = false } = {}) {
  const duration = String(value ?? "").trim();
  if (!duration) {
    if (!required) return "";
    const err = new Error("duration is required");
    err.name = "ValidationError";
    throw err;
  }
  if (duration.length > DURATION_MAX_LEN) {
    const err = new Error(`duration cannot exceed ${DURATION_MAX_LEN} characters`);
    err.name = "ValidationError";
    throw err;
  }
  return duration;
}

function normalizeLines(lines) {
  if (lines === undefined || lines === null) return [];
  if (!Array.isArray(lines)) {
    const err = new Error("lines must be an array");
    err.name = "ValidationError";
    throw err;
  }
  if (lines.length > MAX_PARAMETERS) {
    const err = new Error(`A test cannot have more than ${MAX_PARAMETERS} lines`);
    err.name = "ValidationError";
    throw err;
  }
  return lines.map((line, index) => {
    try {
      return {
        category: normalizeCategory(line?.category),
        name: normalizeName(line?.name),
        fastingType: normalizeFastingType(line?.fastingType, { required: true }),
        duration: normalizeDuration(line?.duration, { required: true }),
        code: normalizeCode(line?.code),
        hours: normalizeHours(line?.hours ?? ""),
        selected: line?.selected !== false,
      };
    } catch (err) {
      err.message = `Line ${index + 1}: ${err.message}`;
      throw err;
    }
  });
}

function normalizeCode(value) {
  const code = String(value ?? "").trim();
  if (code.length > 40) {
    const err = new Error("code cannot exceed 40 characters");
    err.name = "ValidationError";
    throw err;
  }
  return code;
}

function normalizeHours(value) {
  if (value === "" || value === null || value === undefined) return 0;
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours < 0 || hours > 168) {
    const err = new Error("fasting / prep hours must be between 0 and 168");
    err.name = "ValidationError";
    throw err;
  }
  return Math.round(hours);
}

function normalizeRecordId(value, fallback) {
  const id = String(value || "").trim();
  if (!id || id.length > 80) return fallback;
  return id;
}

function readHours(value) {
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours < 0) return 0;
  return Math.min(168, Math.round(hours));
}

function publicLines(lines) {
  if (!Array.isArray(lines)) return [];
  return lines.map((line) => ({
    category: String(line?.category || "").trim(),
    name: String(line?.name || "").trim(),
    fastingType: String(line?.fastingType || "").trim(),
    duration: String(line?.duration || "").trim(),
    code: String(line?.code || "").trim(),
    hours: readHours(line?.hours),
    selected: line?.selected !== false,
  }));
}

function publicSections(sections) {
  if (!Array.isArray(sections)) return [];
  return sections.map((section, sectionIndex) => ({
    id: normalizeRecordId(section?.id, `section-${sectionIndex + 1}`),
    category: String(section?.category || "").trim(),
    tests: (Array.isArray(section?.tests) ? section.tests : []).map((test, testIndex) => ({
      id: normalizeRecordId(test?.id, `test-${sectionIndex + 1}-${testIndex + 1}`),
      name: String(test?.name || "").trim(),
      code: String(test?.code || "").trim(),
      hours: readHours(test?.hours),
      selected: test?.selected !== false,
    })),
  }));
}

function normalizeDismissedCategories(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    const err = new Error("dismissedCategories must be an array");
    err.name = "ValidationError";
    throw err;
  }
  return [...new Set(
    value
      .map((entry) => String(entry || "").trim())
      .filter((entry) => entry.length >= CATEGORY_MIN_LEN && entry.length <= CATEGORY_MAX_LEN),
  )];
}

function normalizeSections(sections) {
  if (sections === undefined || sections === null) return [];
  if (!Array.isArray(sections)) {
    const err = new Error("sections must be an array");
    err.name = "ValidationError";
    throw err;
  }
  if (sections.length > 40) {
    const err = new Error("A goal cannot have more than 40 sections");
    err.name = "ValidationError";
    throw err;
  }
  const withCategory = sections.filter((section) => String(section?.category || "").trim());
  return withCategory.map((section, sectionIndex) => {
    const tests = Array.isArray(section?.tests) ? section.tests : [];
    if (tests.length > MAX_PARAMETERS) {
      const err = new Error(`A section cannot have more than ${MAX_PARAMETERS} tests`);
      err.name = "ValidationError";
      throw err;
    }
    return {
      id: normalizeRecordId(section?.id, `section-${sectionIndex + 1}`),
      category: normalizeCategory(section?.category),
      tests: tests.map((test, testIndex) => {
        try {
          return {
            id: normalizeRecordId(test?.id, `test-${sectionIndex + 1}-${testIndex + 1}`),
            name: normalizeName(test?.name),
            code: normalizeCode(test?.code),
            hours: normalizeHours(test?.hours),
            selected: test?.selected !== false,
          };
        } catch (err) {
          err.message = `${String(section?.category || "Section").trim() || "Section"} test ${testIndex + 1}: ${err.message}`;
          throw err;
        }
      }),
    };
  });
}

function projectGoalCatalog({ name, status = "active", sections, dismissedCategories } = {}) {
  const goalName = normalizeName(name);
  const nextStatus = normalizeStatus(status);
  const nextSections = normalizeSections(Array.isArray(sections) ? sections : []);
  const dismissed = normalizeDismissedCategories(dismissedCategories);
  const selected = [];

  nextSections.forEach((section) => {
    section.tests.forEach((test) => {
      if (!test.selected || !test.name) return;
      const post = /^(pfbs|ppbs|pp|post)/i.test(test.code);
      const hours = Number(test.hours) || 0;
      selected.push({
        category: section.category,
        name: test.name,
        fastingType: post ? "Post-prandial" : hours > 0 ? "Fasting" : "Non-fasting",
        duration: hours === 1 ? "1 hr" : `${hours} hrs`,
        code: test.code,
        hours,
        selected: true,
      });
    });
  });

  const usedIds = new Set();
  const parameterSource = selected.length ? selected : [{ name: goalName }];
  const parameters = parameterSource.map((line, index) => {
    const base = slugify(line.name) || `param-${index + 1}`;
    let paramId = base;
    let suffix = 2;
    while (usedIds.has(paramId)) paramId = `${base}-${suffix++}`;
    usedIds.add(paramId);
    return { paramId, name: line.name, unit: "—", refRange: "—", sequence: index + 1 };
  });

  return {
    kind: "goal",
    testId: `goal-${slugify(goalName)}`,
    name: goalName,
    type: selected.length > 1 ? "PROFILE" : "SINGLE",
    category: nextSections[0]?.category || "Goal",
    status: nextStatus,
    fastingType: selected[0]?.fastingType || "Fasting",
    duration: selected[0]?.duration || "0 hrs",
    lines: selected,
    parameters,
    sections: nextSections,
    dismissedCategories: dismissed,
    sequence: 0,
  };
}

function normalizeSequence(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
}

function normalizeParameters(parameters, { type = "SINGLE" } = {}) {
  if (!Array.isArray(parameters) || parameters.length === 0) {
    const err = new Error("At least one parameter is required");
    err.name = "ValidationError";
    throw err;
  }
  if (parameters.length > MAX_PARAMETERS) {
    const err = new Error(`A test cannot have more than ${MAX_PARAMETERS} parameters`);
    err.name = "ValidationError";
    throw err;
  }
  const normalizedType = normalizeType(type);
  if (normalizedType === "SINGLE" && parameters.length !== 1) {
    const err = new Error("Single-parameter tests must have exactly one parameter");
    err.name = "ValidationError";
    throw err;
  }
  if (normalizedType === "PROFILE" && parameters.length < 2) {
    const err = new Error("Profile tests must have at least two parameters");
    err.name = "ValidationError";
    throw err;
  }

  const seenParamIds = new Set();
  return parameters.map((param, index) => {
    const name = String(param?.name || "").trim();
    if (!name) {
      const err = new Error(`Parameter ${index + 1}: name is required`);
      err.name = "ValidationError";
      throw err;
    }
    if (name.length > PARAM_NAME_MAX_LEN) {
      const err = new Error(`Parameter ${index + 1}: name cannot exceed ${PARAM_NAME_MAX_LEN} characters`);
      err.name = "ValidationError";
      throw err;
    }
    const paramId = normalizeTestId(param?.paramId || name);
    if (seenParamIds.has(paramId)) {
      const err = new Error(`Parameter ${index + 1}: duplicate param ID "${paramId}"`);
      err.name = "ValidationError";
      throw err;
    }
    seenParamIds.add(paramId);
    const unit = String(param?.unit || "").trim();
    const refRange = String(param?.refRange || "").trim();
    if (unit.length > UNIT_MAX_LEN) {
      const err = new Error(`Parameter ${index + 1}: unit cannot exceed ${UNIT_MAX_LEN} characters`);
      err.name = "ValidationError";
      throw err;
    }
    if (refRange.length > REF_RANGE_MAX_LEN) {
      const err = new Error(`Parameter ${index + 1}: reference range cannot exceed ${REF_RANGE_MAX_LEN} characters`);
      err.name = "ValidationError";
      throw err;
    }
    return {
      paramId,
      name,
      unit: unit || "—",
      refRange: refRange || "—",
      sequence: normalizeSequence(param?.sequence, index + 1),
    };
  });
}

function toTestCatalogPublic(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  return {
    id: row.id,
    _id: row._id,
    testId: row.testId,
    name: row.name,
    type: normalizeType(row.type),
    category: row.category,
    status: normalizeStatus(row.status),
    fastingType: String(row.fastingType || "").trim(),
    duration: String(row.duration || "").trim(),
    kind: row.kind === "goal" || (Array.isArray(row.sections) && row.sections.length) ? "goal" : "test",
    lines: publicLines(row.lines),
    sections: publicSections(row.sections),
    dismissedCategories: Array.isArray(row.dismissedCategories)
      ? row.dismissedCategories.map((entry) => String(entry || "").trim()).filter(Boolean)
      : [],
    parameters: Array.isArray(row.parameters) ? row.parameters : [],
    sequence: normalizeSequence(row.sequence),
    createdBy: row.createdBy || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function snapshotTest(item) {
  const pub = toTestCatalogPublic(item);
  if (!pub) return null;
  return {
    catalogId: pub.id,
    testId: pub.testId,
    name: pub.name,
    type: pub.type,
    category: pub.category,
    fastingType: pub.fastingType,
    duration: pub.duration,
    lines: pub.lines,
    parameters: pub.parameters,
  };
}

async function getTestCatalogByTestId(testId) {
  const slug = normalizeTestId(testId);
  const { Items } = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "TestIdIndex",
      KeyConditionExpression: "#testId = :testId",
      ExpressionAttributeNames: { "#testId": "testId" },
      ExpressionAttributeValues: { ":testId": slug },
      Limit: 1,
    })
  );
  return withLegacyId(Items?.[0] || null);
}

async function createTestCatalog({
  testId,
  name,
  type = "SINGLE",
  category,
  status = "active",
  fastingType = "",
  duration = "",
  lines,
  parameters,
  sequence = 0,
  createdBy,
  kind = "test",
  sections,
  dismissedCategories,
}) {
  const slug = normalizeTestId(testId || name);
  const existing = await getTestCatalogByTestId(slug);
  if (existing) {
    const err = new Error("testId already exists");
    err.name = "ConflictError";
    throw err;
  }

  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    testId: slug,
    name: normalizeName(name),
    type: normalizeType(type),
    category: normalizeCategory(category),
    status: normalizeStatus(status),
    fastingType: normalizeFastingType(fastingType),
    duration: normalizeDuration(duration),
    lines: normalizeLines(lines),
    parameters: normalizeParameters(parameters, { type: normalizeType(type) }),
    sequence: normalizeSequence(sequence),
    kind: kind === "goal" ? "goal" : "test",
    ...(kind === "goal"
      ? {
          sections: normalizeSections(sections),
          dismissedCategories: normalizeDismissedCategories(dismissedCategories),
        }
      : {}),
    createdBy: String(createdBy || "").trim() || null,
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

  return toTestCatalogPublic(item);
}

async function getTestCatalogRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function getTestCatalogById(id) {
  const item = await getTestCatalogRecordById(id);
  return item ? toTestCatalogPublic(item) : null;
}

async function getActiveTestCatalogByIds(ids) {
  const unique = [...new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean))];
  const results = await Promise.all(unique.map((id) => getTestCatalogRecordById(id)));
  return results
    .filter((item) => item && normalizeStatus(item.status) === "active")
    .map((item) => toTestCatalogPublic(item))
    .filter(Boolean);
}

function isLiveCatalogRow(row) {
  return row && normalizeStatus(row.status, "active") !== "inactive";
}

function sortLiveCatalog(a, b) {
  const seqDiff = normalizeSequence(a.sequence) - normalizeSequence(b.sequence);
  if (seqDiff !== 0) return seqDiff;
  return String(a.name || "").localeCompare(String(b.name || ""));
}

async function scanAllTestCatalog() {
  const items = [];
  let ExclusiveStartKey;
  do {
    const res = await docClient.send(
      new ScanCommand({
        TableName: TABLE,
        ExclusiveStartKey,
      })
    );
    items.push(...(res.Items || []));
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

async function listActiveTestCatalog() {
  const { items } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: "active",
    scanIndexForward: true,
    page: 1,
    limit: 500,
    maxLimit: 500,
    sortFn: sortLiveCatalog,
  });
  let rows = items.map((row) => toTestCatalogPublic(row)).filter(isLiveCatalogRow);
  if (rows.length) return rows.sort(sortLiveCatalog);

  const listed = await listTestCatalog({ page: 1, limit: 200 });
  rows = (listed.tests || []).filter(isLiveCatalogRow);
  if (rows.length) return rows.sort(sortLiveCatalog);

  rows = (await scanAllTestCatalog())
    .map((row) => toTestCatalogPublic(row))
    .filter(isLiveCatalogRow);
  return rows.sort(sortLiveCatalog);
}

async function listTestGoals() {
  const items = await scanAllTestCatalog();
  return items
    .map((row) => toTestCatalogPublic(row))
    .filter((row) => row && row.kind === "goal")
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
}

async function listActiveTestCatalogPaginated({ page = 1, limit = 12, search, category } = {}) {
  const searchFilter = buildContainsFilter(["name", "testId", "category"], search);
  let filterExpression = searchFilter.filterExpression;
  const exprNames = { ...searchFilter.exprNames };
  const exprValues = { ...searchFilter.exprValues };

  if (category) {
    const catKey = "#category";
    exprNames[catKey] = "category";
    exprValues[":category"] = String(category).trim();
    filterExpression = filterExpression
      ? `${filterExpression} AND ${catKey} = :category`
      : `${catKey} = :category`;
  }

  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: "active",
    filterExpression,
    exprNames,
    exprValues,
    search: searchFilter.search,
    searchFields: searchFilter.searchFields,
    scanIndexForward: true,
    page,
    limit,
    maxLimit: 50,
    sortFn: (a, b) => {
      const seqDiff = normalizeSequence(a.sequence) - normalizeSequence(b.sequence);
      if (seqDiff !== 0) return seqDiff;
      return String(a.name || "").localeCompare(String(b.name || ""));
    },
  });

  return {
    tests: items.map((row) => toTestCatalogPublic(row)).filter(Boolean),
    pagination,
  };
}

async function listTestCatalog({ page = 1, limit = 10, status, search, category } = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const searchFilter = buildContainsFilter(["name", "testId", "category"], search);
  let filterExpression = searchFilter.filterExpression;
  const exprNames = { ...searchFilter.exprNames };
  const exprValues = { ...searchFilter.exprValues };

  if (category) {
    const catKey = "#category";
    exprNames[catKey] = "category";
    exprValues[":category"] = String(category).trim();
    filterExpression = filterExpression
      ? `${filterExpression} AND ${catKey} = :category`
      : `${catKey} = :category`;
  }

  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: normalizedStatus || undefined,
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
    tests: items.map((row) => toTestCatalogPublic(row)),
    pagination,
  };
}

async function updateTestCatalog(id, updates) {
  const blockedFields = new Set(["id", "_id", "createdAt", "createdBy"]);
  const existing = await getTestCatalogRecordById(id);
  if (!existing) {
    const err = new Error("Test catalog entry not found");
    err.name = "ValidationError";
    throw err;
  }

  const entries = [];

  for (const [key, value] of Object.entries(updates || {})) {
    if (blockedFields.has(key) || value === undefined) continue;
    if (key === "status") entries.push([key, normalizeStatus(value)]);
    else if (key === "type") entries.push([key, normalizeType(value)]);
    else if (key === "name") entries.push([key, normalizeName(value)]);
    else if (key === "category") entries.push([key, normalizeCategory(value)]);
    else if (key === "fastingType") entries.push([key, normalizeFastingType(value)]);
    else if (key === "duration") entries.push([key, normalizeDuration(value)]);
    else if (key === "lines") entries.push([key, normalizeLines(value)]);
    else if (key === "sections") entries.push([key, normalizeSections(value)]);
    else if (key === "dismissedCategories") entries.push([key, normalizeDismissedCategories(value)]);
    else if (key === "kind") entries.push([key, value === "goal" ? "goal" : "test"]);
    else if (key === "sequence") entries.push([key, normalizeSequence(value)]);
    else if (key === "parameters") {
      const nextType =
        updates.type !== undefined ? normalizeType(updates.type) : normalizeType(existing.type);
      entries.push([key, normalizeParameters(value, { type: nextType })]);
    }
    else if (key === "testId") entries.push([key, normalizeTestId(value)]);
    else entries.push([key, value]);
  }

  if (entries.length === 0) {
    const err = new Error("No valid fields provided for update");
    err.name = "ValidationError";
    throw err;
  }

  const testIdUpdate = entries.find(([k]) => k === "testId");
  if (testIdUpdate) {
    const existing = await getTestCatalogByTestId(testIdUpdate[1]);
    if (existing && existing.id !== id) {
      const err = new Error("testId already exists");
      err.name = "ConflictError";
      throw err;
    }
  }

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

  return toTestCatalogPublic(Attributes || null);
}

async function deleteTestCatalog(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

module.exports = {
  TABLE,
  ALLOWED_STATUS,
  ALLOWED_TYPES,
  FASTING_TYPES,
  slugify,
  normalizeStatus,
  normalizeType,
  normalizeFastingType,
  normalizeDuration,
  normalizeLines,
  normalizeSections,
  projectGoalCatalog,
  normalizeTestId,
  normalizeParameters,
  toTestCatalogPublic,
  snapshotTest,
  createTestCatalog,
  getTestCatalogById,
  getTestCatalogRecordById,
  getTestCatalogByTestId,
  getActiveTestCatalogByIds,
  listActiveTestCatalog,
  listActiveTestCatalogPaginated,
  listTestCatalog,
  listTestGoals,
  updateTestCatalog,
  deleteTestCatalog,
};
