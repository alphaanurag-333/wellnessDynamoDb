import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

function catalogBase() {
  return "/admin/wellness-prescriptions";
}

function tokenOrStored(token) {
  return token || getAccountToken();
}

export function mapRxProtocol(row) {
  if (!row) return null;
  const id = row.id || row._id;
  if (!id) return null;
  const points = Array.isArray(row.points) ? row.points : [];
  return {
    id,
    title: String(row.title || "").trim(),
    pointers: points.map((entry) => String(entry || "").trim()).filter(Boolean),
    live: row.status !== "inactive",
    status: row.status === "inactive" ? "inactive" : "active",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function adminListRxProtocols(token, { page = 1, limit = 20, status, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data } = await api.get(`${catalogBase()}?${q}`, {
      headers: authHeader(tokenOrStored(token)),
    });
    const rows = Array.isArray(data.prescriptions) ? data.prescriptions : [];
    const protocols = rows.map(mapRxProtocol).filter(Boolean);
    return {
      protocols,
      pagination: data.pagination ?? { page, limit, total: protocols.length, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateRxProtocol(token, fields) {
  try {
    const { data } = await api.post(
      catalogBase(),
      {
        title: String(fields.title ?? "").trim(),
        points: Array.isArray(fields.pointers) ? fields.pointers : fields.points || [],
        category: String(fields.category || "General").trim() || "General",
        status: fields.status || (fields.live === false ? "inactive" : "active"),
      },
      { headers: authHeader(tokenOrStored(token)) },
    );
    return mapRxProtocol(data.prescription);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateRxProtocol(token, id, fields) {
  const payload = {};
  if (fields.title !== undefined) payload.title = String(fields.title).trim();
  if (fields.pointers !== undefined) payload.points = fields.pointers;
  else if (fields.points !== undefined) payload.points = fields.points;
  if (fields.status !== undefined) payload.status = String(fields.status);
  else if (fields.live !== undefined) payload.status = fields.live ? "active" : "inactive";

  try {
    const { data } = await api.patch(`${catalogBase()}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(tokenOrStored(token)),
    });
    return mapRxProtocol(data.prescription);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteRxProtocol(token, id) {
  try {
    await api.delete(`${catalogBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(tokenOrStored(token)),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}
