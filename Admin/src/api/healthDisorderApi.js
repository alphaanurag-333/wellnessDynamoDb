import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

function healthDisorderBase() {
  return "/admin/health-disorders";
}

function tokenOrStored(token) {
  return token || getAccountToken();
}

function normalizeSymptoms(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,;\n]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

export function mapHealthDisorder(row) {
  if (!row) return null;
  const id = row.id || row._id;
  if (!id) return null;
  const type = String(row.type || "acute").toLowerCase() === "chronic" ? "chronic" : "acute";
  return {
    id: String(id),
    title: String(row.title || "").trim(),
    description: String(row.description || "").trim(),
    symptoms: normalizeSymptoms(row.symptoms),
    type,
    status: row.status === "inactive" ? "inactive" : "active",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function adminListHealthDisorders(
  token,
  { page = 1, limit = 200, status, type, search } = {},
) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (type) q.set("type", type);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data } = await api.get(`${healthDisorderBase()}?${q}`, {
      headers: authHeader(tokenOrStored(token)),
    });
    return {
      healthDisorders: (Array.isArray(data.healthDisorders) ? data.healthDisorders : [])
        .map(mapHealthDisorder)
        .filter(Boolean),
      pagination: data.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateHealthDisorder(token, fields) {
  const payload = {
    title: String(fields.title || "").trim(),
    description: String(fields.description || "").trim(),
    symptoms: normalizeSymptoms(fields.symptoms),
    type: String(fields.type || "acute").toLowerCase() === "chronic" ? "chronic" : "acute",
    status: fields.status === "inactive" || fields.on === false ? "inactive" : "active",
  };
  try {
    const { data } = await api.post(healthDisorderBase(), payload, {
      headers: authHeader(tokenOrStored(token)),
    });
    return mapHealthDisorder(data.healthDisorder);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateHealthDisorder(token, id, fields) {
  const payload = {};
  if (fields.title !== undefined) payload.title = String(fields.title || "").trim();
  if (fields.description !== undefined) payload.description = String(fields.description || "").trim();
  if (fields.symptoms !== undefined) payload.symptoms = normalizeSymptoms(fields.symptoms);
  if (fields.type !== undefined) {
    payload.type = String(fields.type || "acute").toLowerCase() === "chronic" ? "chronic" : "acute";
  }
  if (fields.status !== undefined) {
    payload.status = fields.status === "inactive" ? "inactive" : "active";
  } else if (fields.on !== undefined) {
    payload.status = fields.on ? "active" : "inactive";
  }
  try {
    const { data } = await api.patch(`${healthDisorderBase()}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(tokenOrStored(token)),
    });
    return mapHealthDisorder(data.healthDisorder);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteHealthDisorder(token, id) {
  try {
    await api.delete(`${healthDisorderBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(tokenOrStored(token)),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}
