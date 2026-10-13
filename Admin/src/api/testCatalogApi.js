import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";
import {
  adminCreateConfigDropdown,
  adminGetConfigDropdown,
  fetchActiveConfigDropdown,
} from "./configDropdownApi.js";

export const TEST_CATALOG_PAGE_SIZE = 20;
export const BLOOD_TEST_CATEGORY_SLUG = "blood-test-category";

/** Fallback labels. Live options come from Configs → Dropdowns (blood-test-category). */
export const TEST_CATEGORIES = [
  "Hematology",
  "Diabetes",
  "Cardiac",
  "Thyroid",
  "Vitamins",
  "Liver",
  "Kidney",
  "Inflammation",
  "Hormones",
  "Metabolic",
  "Other",
];

function labelsFromDropdown(list) {
  return (Array.isArray(list?.options) ? list.options : [])
    .filter((row) => row && row.on !== false)
    .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0))
    .map((row) => String(row.label || row.value || "").trim())
    .filter(Boolean);
}

function bloodTestCategoryPayload() {
  return {
    slug: BLOOD_TEST_CATEGORY_SLUG,
    title: "Blood test categories",
    status: "active",
    options: TEST_CATEGORIES.map((label, index) => ({
      label,
      value: label,
      on: true,
      sortOrder: index + 1,
    })),
  };
}

/** Creates the dropdown list on first use so Configs → Dropdowns can edit it. */
export async function ensureBloodTestCategoryDropdown(existingLists) {
  const found = (existingLists || []).find((row) => row?.slug === BLOOD_TEST_CATEGORY_SLUG);
  if (found) return found;
  try {
    const list = await adminGetConfigDropdown(null, BLOOD_TEST_CATEGORY_SLUG);
    if (list) return list;
  } catch {
    /* missing on this server — create it below */
  }
  try {
    return await adminCreateConfigDropdown(null, bloodTestCategoryPayload());
  } catch {
    try {
      return await fetchActiveConfigDropdown(BLOOD_TEST_CATEGORY_SLUG);
    } catch {
      return null;
    }
  }
}

/** Active blood-test categories from the common dropdowns page. */
export async function fetchTestCategories() {
  const list = await ensureBloodTestCategoryDropdown();
  const labels = labelsFromDropdown(list);
  return labels.length ? labels : [...TEST_CATEGORIES];
}

export function testCategoryOptions(extra = [], base = TEST_CATEGORIES) {
  const set = new Set();
  (base || []).forEach((value) => {
    const next = String(value || "").trim();
    if (next) set.add(next);
  });
  extra.forEach((value) => {
    const next = String(value || "").trim();
    if (next) set.add(next);
  });
  return [...set];
}

function catalogBase() {
  return "/admin/test-catalog";
}

function tokenOrStored(token) {
  return token || getAccountToken();
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function mapTestCatalog(row) {
  if (!row) return null;
  const id = row.id || row._id;
  if (!id) return null;
  const parameters = Array.isArray(row.parameters)
    ? row.parameters.map((param, index) => ({
        paramId: String(param.paramId || slugify(param.name) || `param-${index + 1}`),
        name: String(param.name || "").trim(),
        unit: String(param.unit || "").trim(),
        refRange: String(param.refRange || "").trim(),
        sequence: Number(param.sequence) || index + 1,
      }))
    : [];
  return {
    id,
    testId: String(row.testId || "").trim(),
    name: String(row.name || "").trim(),
    type: String(row.type || "SINGLE").toUpperCase() === "PROFILE" ? "PROFILE" : "SINGLE",
    category: String(row.category || "").trim(),
    fastingType: String(row.fastingType || "").trim(),
    duration: String(row.duration || "").trim(),
    lines: Array.isArray(row.lines)
      ? row.lines.map((line) => ({
          category: String(line?.category || "").trim(),
          name: String(line?.name || "").trim(),
          fastingType: String(line?.fastingType || "").trim(),
          duration: String(line?.duration || "").trim(),
        }))
      : [],
    status: row.status === "inactive" ? "inactive" : "active",
    live: row.status !== "inactive",
    sequence: Number(row.sequence) || 0,
    parameters,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function adminListTestCatalog(token, { page = 1, limit = TEST_CATALOG_PAGE_SIZE, status, search, category } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  if (category && String(category).trim()) q.set("category", String(category).trim());
  try {
    const { data } = await api.get(`${catalogBase()}?${q}`, {
      headers: authHeader(tokenOrStored(token)),
    });
    const tests = (Array.isArray(data.tests) ? data.tests : []).map(mapTestCatalog).filter(Boolean);
    return {
      tests,
      pagination: data.pagination ?? { page, limit, total: tests.length, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateTestCatalog(token, fields) {
  try {
    const { data } = await api.post(
      catalogBase(),
      {
        name: String(fields.name ?? "").trim(),
        testId: String(fields.testId ?? "").trim() || undefined,
        type: fields.type || "SINGLE",
        category: String(fields.category ?? "").trim(),
        fastingType: String(fields.fastingType ?? "").trim(),
        duration: String(fields.duration ?? "").trim(),
        lines: Array.isArray(fields.lines) ? fields.lines : [],
        status: fields.status || (fields.live === false ? "inactive" : "active"),
        sequence: Number(fields.sequence) || 0,
        parameters: Array.isArray(fields.parameters) ? fields.parameters : [],
      },
      { headers: authHeader(tokenOrStored(token)) },
    );
    return mapTestCatalog(data.test);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateTestCatalog(token, id, fields) {
  const payload = {};
  if (fields.name !== undefined) payload.name = String(fields.name).trim();
  if (fields.testId !== undefined) payload.testId = String(fields.testId).trim();
  if (fields.type !== undefined) payload.type = fields.type;
  if (fields.category !== undefined) payload.category = String(fields.category).trim();
  if (fields.fastingType !== undefined) payload.fastingType = String(fields.fastingType).trim();
  if (fields.duration !== undefined) payload.duration = String(fields.duration).trim();
  if (fields.lines !== undefined) payload.lines = fields.lines;
  if (fields.sequence !== undefined) payload.sequence = Number(fields.sequence) || 0;
  if (fields.parameters !== undefined) payload.parameters = fields.parameters;
  if (fields.status !== undefined) payload.status = String(fields.status);
  else if (fields.live !== undefined) payload.status = fields.live ? "active" : "inactive";

  try {
    const { data } = await api.patch(`${catalogBase()}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(tokenOrStored(token)),
    });
    return mapTestCatalog(data.test);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteTestCatalog(token, id) {
  try {
    await api.delete(`${catalogBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(tokenOrStored(token)),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}
