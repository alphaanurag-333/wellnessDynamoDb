import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

function dietPlanBase() {
  return "/admin/diet-plan-book";
}

function tokenOrStored(token) {
  return token || getAccountToken();
}

export function mapDietPlan(row) {
  if (!row) return null;
  const id = row.id || row._id;
  if (!id) return null;
  return {
    id,
    title: String(row.title || "").trim(),
    content: String(row.content || "").trim(),
    live: row.live !== false && row.status !== "inactive",
    status: row.status === "inactive" ? "inactive" : "active",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function adminListDietPlans(token, { page = 1, limit = 20, status, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data } = await api.get(`${dietPlanBase()}?${q}`, {
      headers: authHeader(tokenOrStored(token)),
    });
    const plans = (Array.isArray(data.plans) ? data.plans : []).map(mapDietPlan).filter(Boolean);
    return {
      plans,
      pagination: data.pagination ?? { page, limit, total: plans.length, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateDietPlan(token, fields) {
  try {
    const { data } = await api.post(
      dietPlanBase(),
      {
        title: String(fields.title ?? "").trim(),
        content: String(fields.content ?? "").trim(),
        status: fields.status || (fields.live === false ? "inactive" : "active"),
      },
      { headers: authHeader(tokenOrStored(token)) },
    );
    return mapDietPlan(data.plan);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateDietPlan(token, id, fields) {
  const payload = {};
  if (fields.title !== undefined) payload.title = String(fields.title).trim();
  if (fields.content !== undefined) payload.content = String(fields.content).trim();
  if (fields.status !== undefined) payload.status = String(fields.status);
  else if (fields.live !== undefined) payload.live = Boolean(fields.live);

  try {
    const { data } = await api.patch(`${dietPlanBase()}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(tokenOrStored(token)),
    });
    return mapDietPlan(data.plan);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteDietPlan(token, id) {
  try {
    await api.delete(`${dietPlanBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(tokenOrStored(token)),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}

function catalogBase() {
  return "/account/diet-plan-catalog";
}

function assignmentsBase(userId) {
  return `/account/heal-users/${encodeURIComponent(userId)}/diet-plan-assignments`;
}

export function mapCatalogMeal(meal, index = 0) {
  if (!meal) return null;
  return {
    id: String(meal.mealId || meal.id || `meal-${index}`),
    day: String(meal.day || "all"),
    slot: String(meal.slot || "other").toLowerCase(),
    title: String(meal.title || "").trim() || `Meal ${index + 1}`,
    foods: String(meal.foods || "").trim(),
    notes: String(meal.notes || "").trim(),
    calories: Number(meal.calories) || 0,
    sequence: Number(meal.sequence) || index + 1,
  };
}

export function mapCatalogPlan(row) {
  if (!row) return null;
  const id = row.id || row._id || row.planId;
  const name = String(row.name || row.title || "").trim();
  if (!id && !name) return null;
  const meals = (Array.isArray(row.meals) ? row.meals : []).map(mapCatalogMeal).filter(Boolean);
  return {
    id: String(id || name),
    planId: String(row.planId || "").trim(),
    name,
    type: String(row.type || "GENERAL").toUpperCase(),
    category: String(row.category || "").trim(),
    description: String(row.description || "").trim(),
    status: String(row.status || "active").toLowerCase(),
    meals,
    live: String(row.status || "active").toLowerCase() !== "inactive",
  };
}

export function mapDietAssignment(row) {
  if (!row) return null;
  const id = row.id || row._id;
  if (!id) return null;
  return {
    id: String(id),
    userId: String(row.userId || ""),
    startDate: String(row.startDate || "").trim(),
    note: String(row.note || "").trim(),
    plans: (Array.isArray(row.plans) ? row.plans : []).map(mapCatalogPlan).filter(Boolean),
    pdfUrl: row.pdfUrl || "",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listDietPlanCatalog({ page = 1, limit = 100, status = "active", search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data } = await api.get(`${catalogBase()}?${q}`, {
      headers: authHeader(tokenOrStored()),
    });
    const plans = (Array.isArray(data.plans) ? data.plans : []).map(mapCatalogPlan).filter(Boolean);
    return {
      plans,
      pagination: data.pagination ?? { page, limit, total: plans.length, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function listUserDietPlanAssignments(userId) {
  try {
    const { data } = await api.get(assignmentsBase(userId), {
      headers: authHeader(tokenOrStored()),
    });
    const assignments = (Array.isArray(data.assignments) ? data.assignments : []).map(mapDietAssignment).filter(Boolean);
    return {
      assignments,
      recommended: mapDietAssignment(data.recommended) || assignments[0] || null,
      history: (Array.isArray(data.history) ? data.history : assignments.slice(1)).map(mapDietAssignment).filter(Boolean),
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assignUserDietPlan(userId, { planIds, startDate, note } = {}) {
  try {
    const { data } = await api.post(
      assignmentsBase(userId),
      {
        planIds: Array.isArray(planIds) ? planIds : [planIds].filter(Boolean),
        startDate,
        note: note || undefined,
      },
      { headers: authHeader(tokenOrStored()) },
    );
    return mapDietAssignment(data.assignment);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function deleteUserDietPlanAssignment(userId, assignmentId) {
  try {
    await api.delete(`${assignmentsBase(userId)}/${encodeURIComponent(assignmentId)}`, {
      headers: authHeader(tokenOrStored()),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}
