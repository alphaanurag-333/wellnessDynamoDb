import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

export const TEST_CATALOG_PAGE_SIZE = 20;

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

export function testCategoryOptions(extra = []) {
  const set = new Set(TEST_CATEGORIES);
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
