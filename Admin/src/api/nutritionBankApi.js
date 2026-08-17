import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";
import { formatPack } from "../data/nutritionBankData.js";

function nutritionBankBase() {
  return "/admin/supplements";
}

function tokenOrStored(token) {
  return token || getAccountToken();
}

export function mapNutritionBankItem(row) {
  if (!row) return null;
  const id = row.id || row._id;
  if (!id) return null;
  const packSize = Number(row.packSize);
  const price = Number(row.price);
  const unit = String(row.unit || "").trim();
  return {
    id,
    name: String(row.name || "").trim(),
    description: String(row.description || "").trim(),
    packSize: Number.isFinite(packSize) ? packSize : 0,
    unit,
    pack: formatPack(packSize, unit),
    price: Number.isFinite(price) ? price : 0,
    image: row.image || "",
    status: row.status === "inactive" ? "inactive" : "active",
    live: row.status !== "inactive",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function appendFields(fd, fields) {
  if (fields.name !== undefined) fd.append("name", String(fields.name ?? "").trim());
  if (fields.description !== undefined) fd.append("description", String(fields.description ?? "").trim());
  if (fields.packSize !== undefined) fd.append("packSize", String(Number(fields.packSize) || 0));
  if (fields.unit !== undefined) fd.append("unit", String(fields.unit ?? "").trim());
  if (fields.price !== undefined) fd.append("price", String(Number(fields.price) || 0));
  if (fields.status !== undefined) fd.append("status", String(fields.status));
  else if (fields.live !== undefined) fd.append("status", fields.live ? "active" : "inactive");
}

function fieldsToPayload(fields) {
  const payload = {};
  if (fields.name !== undefined) payload.name = String(fields.name ?? "").trim();
  if (fields.description !== undefined) payload.description = String(fields.description ?? "").trim();
  if (fields.packSize !== undefined) payload.packSize = Number(fields.packSize) || 0;
  if (fields.unit !== undefined) payload.unit = String(fields.unit ?? "").trim();
  if (fields.price !== undefined) payload.price = Number(fields.price) || 0;
  if (fields.status !== undefined) payload.status = String(fields.status);
  else if (fields.live !== undefined) payload.status = fields.live ? "active" : "inactive";
  return payload;
}

export async function adminListNutritionBank(token, { page = 1, limit = 20, status, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data } = await api.get(`${nutritionBankBase()}?${q}`, {
      headers: authHeader(tokenOrStored(token)),
    });
    const items = (Array.isArray(data.supplements) ? data.supplements : [])
      .map(mapNutritionBankItem)
      .filter(Boolean);
    return {
      items,
      pagination: data.pagination ?? { page, limit, total: items.length, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateNutritionBankItem(token, fields, file) {
  const name = String(fields.name ?? "").trim();
  const payload = {
    name,
    description: String(fields.description ?? "").trim() || name,
    packSize: Number(fields.packSize) || 0,
    unit: String(fields.unit ?? "Caps").trim() || "Caps",
    price: Number(fields.price) || 0,
    status: fields.status || (fields.live === false ? "inactive" : "active"),
  };
  const headers = authHeader(tokenOrStored(token));
  try {
    if (file instanceof File) {
      const fd = new FormData();
      appendFields(fd, payload);
      fd.append("file", file);
      const { data } = await api.post(nutritionBankBase(), fd, { headers });
      return mapNutritionBankItem(data.supplement);
    }
    const { data } = await api.post(nutritionBankBase(), payload, { headers });
    return mapNutritionBankItem(data.supplement);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateNutritionBankItem(token, id, fields, file) {
  const headers = authHeader(tokenOrStored(token));
  try {
    if (file instanceof File) {
      const fd = new FormData();
      appendFields(fd, fields);
      fd.append("file", file);
      const { data } = await api.patch(`${nutritionBankBase()}/${encodeURIComponent(id)}`, fd, { headers });
      return mapNutritionBankItem(data.supplement);
    }
    const { data } = await api.patch(`${nutritionBankBase()}/${encodeURIComponent(id)}`, fieldsToPayload(fields), {
      headers,
    });
    return mapNutritionBankItem(data.supplement);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteNutritionBankItem(token, id) {
  try {
    await api.delete(`${nutritionBankBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(tokenOrStored(token)),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}
