import api, { authHeader, normalizeApiError } from "../../api.js";

const AUTH_STORAGE_KEY = "wellness_admin_auth";

export function getAdminToken() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.adminToken || null;
  } catch {
    return null;
  }
}

function sopBase() {
  return "/admin/sops";
}

export async function adminListSops(token, { page = 1, limit = 50, status, category, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (category) q.set("category", category);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data } = await api.get(`${sopBase()}?${q}`, { headers: authHeader(token) });
    return {
      sops: Array.isArray(data.sops) ? data.sops : [],
      pagination: data.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetSopById(token, id) {
  try {
    const { data } = await api.get(`${sopBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
    return data.sop;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateSop(token, fields) {
  try {
    const { data } = await api.post(
      sopBase(),
      {
        title: String(fields.title ?? "").trim(),
        category: String(fields.category || "onboarding").toLowerCase(),
        steps: fields.steps,
        author: fields.author,
        status: String(fields.status || "active"),
      },
      { headers: authHeader(token) }
    );
    return data.sop;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateSop(token, id, fields) {
  const payload = {};
  if (fields.title !== undefined) payload.title = String(fields.title).trim();
  if (fields.category !== undefined) payload.category = String(fields.category).toLowerCase();
  if (fields.steps !== undefined) payload.steps = fields.steps;
  if (fields.author !== undefined) payload.author = String(fields.author).trim();
  if (fields.status !== undefined) payload.status = String(fields.status);

  try {
    const { data } = await api.patch(`${sopBase()}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(token),
    });
    return data.sop;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteSop(token, id) {
  try {
    await api.delete(`${sopBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}
