import api, { authHeader, normalizeApiError } from "../api.js";

const AUTH_STORAGE_KEY = "wellness_admin_auth";

export function getAdminToken() {
  if (typeof window === "undefined") return null;
  try {
    const accountRaw = window.localStorage.getItem("wellness_account_auth");
    if (accountRaw) {
      const accountParsed = JSON.parse(accountRaw);
      if (accountParsed?.accessToken) return accountParsed.accessToken;
    }
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.adminToken || null;
  } catch {
    return null;
  }
}

function sopBase() {
  return "/account/sops";
}

function buildSopFormData(fields = {}) {
  const form = new FormData();
  if (fields.title !== undefined) form.append("title", String(fields.title ?? "").trim());
  if (fields.category !== undefined) {
    form.append("category", String(fields.category || "onboarding").toLowerCase());
  }
  if (fields.contentType !== undefined) {
    form.append("contentType", String(fields.contentType || "text").toLowerCase());
  }
  if (fields.audienceRole !== undefined) {
    form.append("audienceRole", String(fields.audienceRole ?? "all").trim());
  }
  if (fields.steps !== undefined) {
    const steps = Array.isArray(fields.steps) ? fields.steps : [];
    form.append("steps", JSON.stringify(steps));
  }
  if (fields.linkUrl !== undefined) form.append("linkUrl", String(fields.linkUrl ?? "").trim());
  if (fields.author !== undefined) form.append("author", String(fields.author ?? "").trim());
  if (fields.status !== undefined) form.append("status", String(fields.status || "active"));
  if (fields.file instanceof File) form.append("file", fields.file);
  if (fields.thumbnailFile instanceof File) form.append("thumbnailFile", fields.thumbnailFile);
  return form;
}

function buildSopJson(fields = {}) {
  const payload = {};
  if (fields.title !== undefined) payload.title = String(fields.title ?? "").trim();
  if (fields.category !== undefined) payload.category = String(fields.category || "onboarding").toLowerCase();
  if (fields.contentType !== undefined) {
    payload.contentType = String(fields.contentType || "text").toLowerCase();
  }
  if (fields.audienceRole !== undefined) {
    payload.audienceRole = String(fields.audienceRole ?? "all").trim();
  }
  if (fields.steps !== undefined) payload.steps = fields.steps;
  if (fields.linkUrl !== undefined) payload.linkUrl = String(fields.linkUrl ?? "").trim();
  if (fields.author !== undefined) payload.author = String(fields.author ?? "").trim();
  if (fields.status !== undefined) payload.status = String(fields.status || "active");
  return payload;
}

export async function adminListSops(token, { page = 1, limit = 50, status, category, audienceRole, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (category) q.set("category", category);
  if (audienceRole) q.set("audienceRole", audienceRole);
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
    const hasFile = fields?.file instanceof File || fields?.thumbnailFile instanceof File;
    const body = hasFile ? buildSopFormData(fields) : buildSopJson(fields);
    // Express JSON body parsers don't auto-parse nested JSON arrays in multipart;
    // for multipart we send steps as JSON string and backend normalizeSteps handles strings.
    // For create with text + no file, send JSON so steps stays an array.
    if (hasFile && Array.isArray(fields.steps)) {
      // already appended as JSON string in buildSopFormData
    }
    const { data } = await api.post(sopBase(), body, {
      headers: authHeader(token),
    });
    return data.sop;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateSop(token, id, fields) {
  try {
    const hasFile = fields?.file instanceof File || fields?.thumbnailFile instanceof File;
    const body = hasFile ? buildSopFormData(fields) : buildSopJson(fields);
    const { data } = await api.patch(`${sopBase()}/${encodeURIComponent(id)}`, body, {
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
