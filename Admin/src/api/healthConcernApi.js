import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

function healthConcernBase() {
  return "/admin/health-concerns";
}

function tokenOrStored(token) {
  return token || getAccountToken();
}

function mapConcern(row) {
  if (!row) return null;
  const id = row.id || row._id;
  if (!id) return null;
  return {
    id,
    title: row.title || "",
    description: row.description || "",
    icon: row.icon || "",
    status: row.status === "inactive" ? "inactive" : "active",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapConcernsToDropdownList(concerns = []) {
  return {
    id: "health-concern",
    slug: "health-concern",
    title: "Health concern",
    wide: true,
    status: "active",
    sortOrder: 0,
    options: concerns.map((row) => ({
      id: row.id,
      label: row.title || "",
      value: row.id,
      icon: row.icon || "",
      description: row.description || "",
      on: row.status !== "inactive",
      sortOrder: 0,
    })),
  };
}

export async function fetchPublicHealthConcernOptions() {
  try {
    const params = new URLSearchParams({ page: "1", limit: "200" });
    const { data } = await api.get(`/public/misc/health-concerns?${params}`);
    const concerns = (Array.isArray(data.healthConcerns) ? data.healthConcerns : [])
      .map(mapConcern)
      .filter(Boolean);
    return mapConcernsToDropdownList(concerns).options.filter((row) => row.on);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminListHealthConcerns(token, { page = 1, limit = 200, status, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data } = await api.get(`${healthConcernBase()}?${q}`, {
      headers: authHeader(tokenOrStored(token)),
    });
    return {
      healthConcerns: (Array.isArray(data.healthConcerns) ? data.healthConcerns : []).map(mapConcern).filter(Boolean),
      pagination: data.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateHealthConcern(token, fields, file) {
  const title = String(fields.title ?? "").trim();
  const description = String(fields.description ?? title).trim() || title;
  const status = fields.status || (fields.on === false ? "inactive" : "active");
  const headers = authHeader(tokenOrStored(token));

  try {
    if (file instanceof File) {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("description", description);
      fd.append("status", status);
      fd.append("file", file);
      const { data } = await api.post(healthConcernBase(), fd, { headers });
      return mapConcern(data.healthConcern);
    }
    const { data } = await api.post(
      healthConcernBase(),
      { title, description, icon: String(fields.icon ?? "").trim(), status },
      { headers },
    );
    return mapConcern(data.healthConcern);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateHealthConcern(token, id, fields, file) {
  const headers = authHeader(tokenOrStored(token));
  try {
    if (file instanceof File) {
      const fd = new FormData();
      if (fields.title !== undefined) fd.append("title", String(fields.title).trim());
      if (fields.description !== undefined) fd.append("description", String(fields.description).trim());
      if (fields.status !== undefined) fd.append("status", String(fields.status));
      else if (fields.on !== undefined) fd.append("status", fields.on ? "active" : "inactive");
      fd.append("file", file);
      const { data } = await api.patch(`${healthConcernBase()}/${encodeURIComponent(id)}`, fd, { headers });
      return mapConcern(data.healthConcern);
    }

    const payload = {};
    if (fields.title !== undefined) payload.title = String(fields.title).trim();
    if (fields.description !== undefined) payload.description = String(fields.description).trim();
    if (fields.icon !== undefined) payload.icon = String(fields.icon).trim();
    if (fields.status !== undefined) payload.status = String(fields.status);
    else if (fields.on !== undefined) payload.status = fields.on ? "active" : "inactive";
    const { data } = await api.patch(`${healthConcernBase()}/${encodeURIComponent(id)}`, payload, { headers });
    return mapConcern(data.healthConcern);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteHealthConcern(token, id) {
  try {
    await api.delete(`${healthConcernBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(tokenOrStored(token)),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}
