import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

function dropdownBase() {
  return "/account/config-dropdowns";
}

function tokenOrStored(token) {
  return token || getAccountToken();
}

function mapOption(row) {
  if (!row) return null;
  return {
    id: row.id,
    label: row.label || "",
    value: row.value || "",
    on: row.on !== false,
    sortOrder: Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : 0,
  };
}

function mapList(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug || "",
    title: row.title || "",
    wide: Boolean(row.wide),
    status: row.status === "inactive" ? "inactive" : "active",
    sortOrder: Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : 0,
    options: (Array.isArray(row.options) ? row.options : []).map(mapOption).filter(Boolean),
  };
}

export async function adminListConfigDropdowns(token, { page = 1, limit = 50, status, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data } = await api.get(`${dropdownBase()}?${q}`, {
      headers: authHeader(tokenOrStored(token)),
    });
    const lists = (Array.isArray(data.lists) ? data.lists : []).map(mapList);
    return {
      lists,
      pagination: data.pagination ?? { page, limit, total: lists.length, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminAddConfigDropdownOption(token, listId, fields) {
  try {
    const { data } = await api.post(
      `${dropdownBase()}/${encodeURIComponent(listId)}/options`,
      {
        label: String(fields.label ?? "").trim(),
        ...(fields.value ? { value: fields.value } : {}),
        ...(fields.on !== undefined ? { on: fields.on } : {}),
      },
      { headers: authHeader(tokenOrStored(token)) },
    );
    return { option: mapOption(data.option), list: mapList(data.list) };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateConfigDropdownOption(token, listId, optionId, fields) {
  const payload = {};
  if (fields.label !== undefined) payload.label = String(fields.label).trim();
  if (fields.value !== undefined) payload.value = String(fields.value).trim();
  if (fields.on !== undefined) payload.on = Boolean(fields.on);
  try {
    const { data } = await api.patch(
      `${dropdownBase()}/${encodeURIComponent(listId)}/options/${encodeURIComponent(optionId)}`,
      payload,
      { headers: authHeader(tokenOrStored(token)) },
    );
    return { option: mapOption(data.option), list: mapList(data.list) };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteConfigDropdownOption(token, listId, optionId) {
  try {
    const { data } = await api.delete(
      `${dropdownBase()}/${encodeURIComponent(listId)}/options/${encodeURIComponent(optionId)}`,
      { headers: authHeader(tokenOrStored(token)) },
    );
    return mapList(data.list);
  } catch (error) {
    normalizeApiError(error);
  }
}
