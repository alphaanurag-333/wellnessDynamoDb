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

export function mapDietSectionRow(row, index = 0) {
  if (!row) return null;
  return {
    id: String(row.id || `row-${index}`),
    label: String(row.label || row.title || "").trim() || `Option ${index + 1}`,
    description: String(row.description || row.foods || "").trim() || "—",
    quantity: String(row.quantity || row.notes || "").trim() || "—",
  };
}

export function mapPersonalisedSections(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((section, sIdx) => ({
    id: String(section.id || `section-${sIdx}`),
    title: String(section.title || "").trim() || "New section",
    rows: (Array.isArray(section.rows) ? section.rows : [])
      .map(mapDietSectionRow)
      .filter(Boolean),
  }));
}

export function mapDietAssignment(row) {
  if (!row) return null;
  const id = row.id || row._id;
  if (!id) return null;
  const personalisedSections = mapPersonalisedSections(row.personalisedSections);
  return {
    id: String(id),
    userId: String(row.userId || ""),
    startDate: String(row.startDate || "").trim(),
    note: String(row.note || "").trim(),
    plans: (Array.isArray(row.plans) ? row.plans : []).map(mapCatalogPlan).filter(Boolean),
    personalisedSections,
    pdfUrl: row.pdfUrl || "",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function todayIsoDate() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
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
    const recommended = mapDietAssignment(data.recommended) || assignments[0] || null;
    const personalisedSections = mapPersonalisedSections(
      Array.isArray(data.personalisedSections) && data.personalisedSections.length
        ? data.personalisedSections
        : recommended?.personalisedSections,
    );
    return {
      assignments,
      recommended,
      history: (Array.isArray(data.history) ? data.history : assignments.slice(1)).map(mapDietAssignment).filter(Boolean),
      personalisedSections,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveUserPersonalisedDietPlan(userId, { sections, assignmentId, startDate, note } = {}) {
  const payload = {
    personalised: true,
    sections: mapPersonalisedSections(sections),
    startDate: startDate || todayIsoDate(),
    note: note || undefined,
  };
  try {
    if (assignmentId) {
      const { data } = await api.patch(
        `${assignmentsBase(userId)}/${encodeURIComponent(assignmentId)}`,
        payload,
        { headers: authHeader(tokenOrStored()) },
      );
      const assignment = mapDietAssignment(data.assignment);
      if (assignment && data.personalisedSections) {
        assignment.personalisedSections = mapPersonalisedSections(data.personalisedSections);
      }
      return assignment;
    }
    const { data } = await api.post(assignmentsBase(userId), payload, {
      headers: authHeader(tokenOrStored()),
    });
    const assignment = mapDietAssignment(data.assignment);
    if (assignment && data.personalisedSections) {
      assignment.personalisedSections = mapPersonalisedSections(data.personalisedSections);
    }
    return assignment;
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

export async function updateUserDietPlanEnabled(userId, enabled) {
  try {
    const { data } = await api.patch(
      `/account/heal-users/${encodeURIComponent(userId)}/diet-plan-enabled`,
      { enabled: Boolean(enabled) },
      { headers: authHeader(tokenOrStored()) },
    );
    return data.dietPlanEnabled !== false;
  } catch (error) {
    normalizeApiError(error);
  }
}
