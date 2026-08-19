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
  paginateItems,
  filterItemsBySearch,
} = require("../utils/dynamoList");

const TABLE = "ConfigDropdown";
const ALLOWED_STATUS = new Set(["active", "inactive"]);

const SEED_LISTS = [
  {
    slug: "banner-type",
    title: "Banner type",
    options: [
      { label: "Main banner", value: "main" },
      { label: "WellnessPedia banner", value: "wellnesspedia" },
      { label: "Program promo banner", value: "program_promo" },
      { label: "Festive / offer banner", value: "festive" },
      { label: "Announcement strip", value: "announcement" },
    ],
  },
  {
    slug: "banner-headline",
    title: "Banner headline",
    options: [
      { label: "Reverse it, don't manage it" },
      { label: "Your labs, your plan, your coach" },
      { label: "Start your reversal journey" },
      { label: "Wellness, redefined for Indian bodies" },
    ],
  },
  {
    slug: "testimonial-point",
    title: "Testimonial data point",
    options: [
      { label: "Client name" },
      { label: "Age" },
      { label: "Weight lost" },
      { label: "Inches lost" },
      { label: "HbA1c change" },
      { label: "Duration" },
      { label: "City" },
    ],
  },
  {
    slug: "discount-slab",
    title: "Discount slab",
    options: [
      { label: "10% · standard" },
      { label: "15% · festive" },
      { label: "20% · annual plan" },
      { label: "25% · corporate" },
    ],
  },
  {
    slug: "yoga-category",
    title: "Yoga & pranayam categories",
    options: [
      { label: "Morning flow" },
      { label: "Restorative" },
      { label: "Pranayam" },
      { label: "Core & strength" },
      { label: "Back & neck relief" },
      { label: "Sleep wind-down" },
      { label: "Beginner" },
    ],
  },
  {
    slug: "recipe-category",
    title: "Recipe categories",
    options: [
      { label: "Fat loss" },
      { label: "Protein rich" },
      { label: "Diabetes friendly" },
      { label: "Gut reset" },
      { label: "Low GI" },
      { label: "PCOD friendly" },
      { label: "Thyroid friendly" },
      { label: "High fibre" },
    ],
  },
  {
    slug: "banner-placement",
    title: "Banner placement",
    options: [
      { label: "Home hero · web" },
      { label: "Web section banner" },
      { label: "App home carousel" },
      { label: "App inline card" },
      { label: "App popup" },
      { label: "Program page header" },
    ],
  },
  {
    slug: "leadership-title",
    title: "Leadership designations",
    options: [
      { label: "Chief Wellness Officer" },
      { label: "Head of Clinical Protocols" },
      { label: "Head of Coaching" },
      { label: "Head of Operations" },
      { label: "Medical Advisor" },
    ],
  },
  {
    slug: "wellness-title",
    title: "Wellness designations",
    options: [
      { label: "Wellness Coach" },
      { label: "Assistant Wellness Coach" },
      { label: "Functional Nutritionist" },
      { label: "Yoga & Movement Coach" },
      { label: "Ayurveda Practitioner" },
      { label: "Lifestyle Counsellor" },
    ],
  },
];

function normalizeStatus(status, fallback = "active") {
  const next = String(status || fallback).toLowerCase().trim();
  return ALLOWED_STATUS.has(next) ? next : fallback;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function optionValueFromLabel(label) {
  return String(label || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function normalizeNumberField(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function normalizeOption(raw, index = 0) {
  const label = String(raw?.label || "").trim();
  if (!label) return null;
  const id = String(raw?.id || "").trim() || uuidv4();
  const value = String(raw?.value || "").trim() || optionValueFromLabel(label);
  return {
    id,
    label,
    value,
    icon: String(raw?.icon || "").trim(),
    on: raw?.on === false ? false : true,
    sortOrder: Number.isFinite(Number(raw?.sortOrder)) ? Number(raw.sortOrder) : index + 1,
    packSize: normalizeNumberField(raw?.packSize),
    unit: String(raw?.unit || "").trim(),
    price: normalizeNumberField(raw?.price),
  };
}

function normalizeOptions(options) {
  if (!Array.isArray(options)) return [];
  return options.map((row, index) => normalizeOption(row, index)).filter(Boolean);
}

function withLegacyId(item) {
  if (!item) return null;
  return {
    ...item,
    _id: item.id,
    options: normalizeOptions(item.options),
  };
}

function sortLists(a, b) {
  const orderA = Number(a.sortOrder) || 0;
  const orderB = Number(b.sortOrder) || 0;
  if (orderA !== orderB) return orderA - orderB;
  return String(a.title || "").localeCompare(String(b.title || ""));
}

async function listAllUnpaged() {
  const result = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusIndex",
    partitionKeyValue: undefined,
    scanIndexForward: true,
    page: 1,
    limit: Number.MAX_SAFE_INTEGER,
    maxLimit: Number.MAX_SAFE_INTEGER,
    sortFn: sortLists,
  });
  return (result.items || []).map(withLegacyId);
}

async function getDropdownBySlug(slug) {
  const key = slugify(slug);
  if (!key) return null;
  const result = await listByPartitionKey({
    tableName: TABLE,
    indexName: "SlugIndex",
    partitionKeyName: "slug",
    partitionKeyValue: key,
    page: 1,
    limit: 1,
    maxLimit: 1,
  });
  return withLegacyId(result.items?.[0] || null);
}

async function getDropdownById(id) {
  const { Item } = await docClient.send(new GetCommand({
    TableName: TABLE,
    Key: { id },
  }));
  return withLegacyId(Item || null);
}

async function getDropdownByIdOrSlug(idOrSlug) {
  const raw = String(idOrSlug || "").trim();
  if (!raw) return null;
  const byId = await getDropdownById(raw);
  if (byId) return byId;
  const bySlug = await getDropdownBySlug(raw);
  if (bySlug) return bySlug;
  const key = slugify(raw);
  if (SEED_LISTS.some((seed) => seed.slug === key)) {
    await ensureSeeded();
    return getDropdownBySlug(raw);
  }
  return null;
}

async function persistList(item) {
  await docClient.send(new PutCommand({
    TableName: TABLE,
    Item: item,
    ConditionExpression: "attribute_not_exists(id)",
  }));
  return withLegacyId(item);
}

const REMOVED_DROPDOWN_SLUGS = new Set(["program-category", "health-concern", "medical-questions"]);

async function removeRetiredDropdownLists(lists) {
  const remaining = [];
  for (const list of lists || []) {
    if (REMOVED_DROPDOWN_SLUGS.has(list.slug)) {
      try {
        await deleteDropdown(list.id);
      } catch (err) {
        if (err?.name !== "ConditionalCheckFailedException") throw err;
      }
      continue;
    }
    remaining.push(list);
  }
  return remaining;
}

async function ensureSeeded() {
  const existing = await removeRetiredDropdownLists(await listAllUnpaged());
  const have = new Set(existing.map((row) => row.slug));
  const seeds = SEED_LISTS.filter((seed) => !have.has(seed.slug));
  const created = [];

  if (seeds.length) {
    const now = new Date().toISOString();
    for (let i = 0; i < seeds.length; i += 1) {
      const seed = seeds[i];
      const seedIndex = SEED_LISTS.findIndex((row) => row.slug === seed.slug);
      const item = {
        id: uuidv4(),
        slug: seed.slug,
        title: seed.title,
        wide: Boolean(seed.wide),
        status: "active",
        sortOrder: seedIndex + 1,
        options: normalizeOptions(seed.options),
        createdAt: now,
        updatedAt: now,
      };
      await persistList(item);
      created.push(withLegacyId(item));
    }
  }

  return [...existing, ...created].sort(sortLists);
}

async function listDropdowns({ page = 1, limit = 50, status, search, seed = true } = {}) {
  if (seed) await ensureSeeded();

  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const searchTerm = String(search || "").trim();
  const searching = Boolean(searchTerm);

  const result = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusIndex",
    partitionKeyValue: normalizedStatus || undefined,
    scanIndexForward: true,
    page: searching ? 1 : page,
    limit: searching ? Number.MAX_SAFE_INTEGER : limit,
    maxLimit: searching ? Number.MAX_SAFE_INTEGER : 200,
    sortFn: sortLists,
  });

  let items = (result.items || []).map(withLegacyId).filter((row) => !REMOVED_DROPDOWN_SLUGS.has(row.slug));
  if (searching) {
    items = filterItemsBySearch(items, {
      search: searchTerm,
      searchFn: (row, term) => {
        if (String(row.title || "").toLowerCase().includes(term)) return true;
        if (String(row.slug || "").toLowerCase().includes(term)) return true;
        return (row.options || []).some((opt) => String(opt.label || "").toLowerCase().includes(term));
      },
    });
    const paged = paginateItems(items, page, limit, 200);
    return { lists: paged.items, pagination: paged.pagination };
  }

  return { lists: items, pagination: result.pagination };
}

async function createDropdown({ slug, title, wide = false, status = "active", options = [], sortOrder } = {}) {
  const now = new Date().toISOString();
  const resolvedSlug = slugify(slug || title);
  if (!resolvedSlug) throw new Error("slug is required");
  if (REMOVED_DROPDOWN_SLUGS.has(resolvedSlug)) {
    throw Object.assign(new Error("This dropdown list has been removed"), { statusCode: 400 });
  }
  const existing = await getDropdownBySlug(resolvedSlug);
  if (existing) throw Object.assign(new Error("A dropdown list already exists with this slug"), { statusCode: 409 });

  const item = {
    id: uuidv4(),
    slug: resolvedSlug,
    title: String(title || "").trim(),
    wide: Boolean(wide),
    status: normalizeStatus(status),
    sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : Date.now(),
    options: normalizeOptions(options),
    createdAt: now,
    updatedAt: now,
  };
  return persistList(item);
}

async function updateDropdown(id, updates) {
  const current = await getDropdownById(id);
  if (!current) {
    const err = new Error("Dropdown list not found");
    err.name = "ConditionalCheckFailedException";
    throw err;
  }

  const next = { ...current };
  if (updates.title !== undefined) next.title = String(updates.title).trim();
  if (updates.wide !== undefined) next.wide = Boolean(updates.wide);
  if (updates.status !== undefined) next.status = normalizeStatus(updates.status);
  if (updates.sortOrder !== undefined) next.sortOrder = Number(updates.sortOrder);
  if (updates.options !== undefined) next.options = normalizeOptions(updates.options);
  if (updates.slug !== undefined) {
    const resolvedSlug = slugify(updates.slug);
    if (!resolvedSlug) throw Object.assign(new Error("slug cannot be empty"), { statusCode: 400 });
    const clash = await getDropdownBySlug(resolvedSlug);
    if (clash && clash.id !== id) {
      throw Object.assign(new Error("A dropdown list already exists with this slug"), { statusCode: 409 });
    }
    next.slug = resolvedSlug;
  }
  next.updatedAt = new Date().toISOString();
  delete next._id;

  const exprNames = {};
  const exprValues = {};
  const sets = [];
  for (const [key, value] of Object.entries(next)) {
    if (key === "id") continue;
    exprNames[`#${key}`] = key;
    exprValues[`:${key}`] = value;
    sets.push(`#${key} = :${key}`);
  }

  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { id },
    UpdateExpression: `SET ${sets.join(", ")}`,
    ExpressionAttributeNames: exprNames,
    ExpressionAttributeValues: exprValues,
    ConditionExpression: "attribute_exists(id)",
    ReturnValues: "ALL_NEW",
  }));
  return withLegacyId(Attributes || next);
}

async function deleteDropdown(id) {
  await docClient.send(new DeleteCommand({
    TableName: TABLE,
    Key: { id },
    ConditionExpression: "attribute_exists(id)",
  }));
}

async function addOption(listId, option) {
  const current = await getDropdownById(listId);
  if (!current) {
    const err = new Error("Dropdown list not found");
    err.name = "ConditionalCheckFailedException";
    throw err;
  }
  const nextOption = normalizeOption(option, current.options.length);
  if (!nextOption) throw Object.assign(new Error("label is required"), { statusCode: 400 });
  const options = [...current.options, nextOption];
  const updated = await updateDropdown(listId, { options });
  return { list: updated, option: nextOption };
}

async function updateOption(listId, optionId, patch) {
  const current = await getDropdownById(listId);
  if (!current) {
    const err = new Error("Dropdown list not found");
    err.name = "ConditionalCheckFailedException";
    throw err;
  }
  const idx = current.options.findIndex((row) => row.id === optionId);
  if (idx < 0) {
    const err = new Error("Dropdown option not found");
    err.statusCode = 404;
    throw err;
  }
  const prev = current.options[idx];
  const nextOption = normalizeOption({
    ...prev,
    ...patch,
    id: prev.id,
    label: patch.label !== undefined ? patch.label : prev.label,
    value: patch.value !== undefined ? patch.value : prev.value,
    on: patch.on !== undefined ? patch.on : prev.on,
    sortOrder: patch.sortOrder !== undefined ? patch.sortOrder : prev.sortOrder,
    packSize: patch.packSize !== undefined ? patch.packSize : prev.packSize,
    unit: patch.unit !== undefined ? patch.unit : prev.unit,
    price: patch.price !== undefined ? patch.price : prev.price,
  }, idx);
  const options = current.options.map((row, i) => (i === idx ? nextOption : row));
  const updated = await updateDropdown(listId, { options });
  return { list: updated, option: nextOption };
}

async function deleteOption(listId, optionId) {
  const current = await getDropdownById(listId);
  if (!current) {
    const err = new Error("Dropdown list not found");
    err.name = "ConditionalCheckFailedException";
    throw err;
  }
  if (!current.options.some((row) => row.id === optionId)) {
    const err = new Error("Dropdown option not found");
    err.statusCode = 404;
    throw err;
  }
  const options = current.options.filter((row) => row.id !== optionId);
  return updateDropdown(listId, { options });
}

async function getActiveDropdownValues(slug) {
  const list = await getDropdownBySlug(slug);
  if (!list || list.status !== "active") return [];
  return (list.options || [])
    .filter((row) => row.on)
    .map((row) => String(row.value || "").trim())
    .filter(Boolean);
}

function toPublicList(list, { activeOptionsOnly = false } = {}) {
  if (!list) return null;
  let options = list.options || [];
  if (activeOptionsOnly) options = options.filter((row) => row.on);
  return {
    id: list.id,
    _id: list.id,
    slug: list.slug,
    title: list.title,
    wide: Boolean(list.wide),
    status: list.status,
    sortOrder: list.sortOrder,
    options: options.map((row) => ({
      id: row.id,
      label: row.label,
      value: row.value,
      icon: row.icon || "",
      on: row.on,
      sortOrder: row.sortOrder,
      packSize: Number(row.packSize) || 0,
      unit: String(row.unit || "").trim(),
      price: Number(row.price) || 0,
    })),
  };
}

module.exports = {
  TABLE,
  SEED_LISTS,
  normalizeStatus,
  slugify,
  listDropdowns,
  getDropdownById,
  getDropdownBySlug,
  getDropdownByIdOrSlug,
  createDropdown,
  updateDropdown,
  deleteDropdown,
  addOption,
  updateOption,
  deleteOption,
  getActiveDropdownValues,
  ensureSeeded,
  toPublicList,
};
