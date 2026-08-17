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
