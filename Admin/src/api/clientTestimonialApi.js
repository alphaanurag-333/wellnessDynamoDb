import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

const BASE = "/admin/client-testimonials";

function tokenOrStored(token) {
  return token || getAccountToken();
}

export function mapClientTestimonial(row) {
  if (!row) return null;
  const id = row.id || row._id;
  if (!id) return null;
  const rating = Number(row.rating);
  return {
    id,
    name: String(row.name || "").trim(),
    quote: String(row.description || "").trim(),
    description: String(row.description || "").trim(),
    rating: Number.isFinite(rating) ? rating : 5,
    profileImage: row.profileImage || "",
    order: Number.isFinite(Number(row.order)) ? Number(row.order) : 0,
    live: row.status === "active",
    status: row.status === "active" ? "active" : "inactive",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function adminListClientTestimonials(
  token,
  { page = 1, limit = 20, status, search } = {},
) {
  const params = { page, limit };
  if (status) params.status = status;
  if (String(search || "").trim()) params.search = String(search).trim();
  try {
    const { data } = await api.get(BASE, {
      params,
      headers: authHeader(tokenOrStored(token)),
    });
    const items = (Array.isArray(data.clientTestimonials) ? data.clientTestimonials : [])
      .map(mapClientTestimonial)
      .filter(Boolean);
    return {
      items,
      pagination: data.pagination || { page, limit, total: items.length, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateClientTestimonial(token, id, fields) {
  const payload = {};
  if (fields.description !== undefined || fields.quote !== undefined) {
    payload.description = String(fields.description ?? fields.quote ?? "").trim();
  }
  if (fields.rating !== undefined) payload.rating = fields.rating;
  if (fields.order !== undefined) payload.order = fields.order;
  if (fields.status !== undefined) payload.status = String(fields.status);
  else if (fields.live !== undefined) payload.status = fields.live ? "active" : "inactive";
  try {
    const { data } = await api.patch(`${BASE}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(tokenOrStored(token)),
    });
    return mapClientTestimonial(data.clientTestimonial);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteClientTestimonial(token, id) {
  try {
    await api.delete(`${BASE}/${encodeURIComponent(id)}`, {
      headers: authHeader(tokenOrStored(token)),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}
