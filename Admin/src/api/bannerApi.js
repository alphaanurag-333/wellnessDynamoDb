import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

const BASE = "/admin/banners";

function tokenOrStored(token) {
  return token || getAccountToken();
}

function asBool(value, fallback = false) {
  if (value === true || value === false) return value;
  const next = String(value ?? "").trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(next)) return true;
  if (["false", "0", "no", "off"].includes(next)) return false;
  return fallback;
}

export function mapBanner(row) {
  if (!row) return null;
  const id = row.id || row._id;
  if (!id) return null;
  const image = row.image || "";
  const mobileImage = row.mobileImage || "";
  const split = asBool(row.split, Boolean(image && mobileImage && image !== mobileImage));
  return {
    id,
    title: String(row.title || "").trim(),
    description: String(row.description || "").trim(),
    type: String(row.bannerType || row.type || "main").trim(),
    placement: String(row.placement || "").trim(),
    cta: String(row.ctaLabel || row.cta || "").trim(),
    ctaLink: String(row.ctaLink || "").trim(),
    image,
    mobileImage,
    split,
    uploaded: Boolean(image),
    webUploaded: Boolean(image),
    mobileUploaded: Boolean(mobileImage),
    appOn: asBool(row.appOn, true),
    webOn: asBool(row.webOn, true),
    shown: row.status !== "inactive",
    live: row.status !== "inactive",
    status: row.status === "inactive" ? "inactive" : "active",
    sortOrder: Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : 9999,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function editorFromBanner(row, fallback = {}) {
  const mapped = mapBanner(row);
  if (!mapped) return fallback;
  return {
    ...fallback,
    id: mapped.id,
    type: mapped.type,
    split: mapped.split,
    placement: mapped.placement || fallback.placement || "",
    headline: mapped.title,
    body: mapped.description,
    cta: mapped.cta,
    ctaLink: mapped.ctaLink,
    image: mapped.image,
    mobileImage: mapped.mobileImage,
    uploaded: mapped.uploaded,
    webUploaded: mapped.webUploaded,
    mobileUploaded: mapped.mobileUploaded,
    appOn: mapped.appOn,
    webOn: mapped.webOn,
    imageFile: null,
    mobileFile: null,
  };
}

function appendFields(form, fields) {
  if (fields.title !== undefined) form.append("title", String(fields.title || "").trim());
  if (fields.description !== undefined) form.append("description", String(fields.description || "").trim());
  if (fields.bannerType !== undefined || fields.type !== undefined) {
    form.append("bannerType", String(fields.bannerType || fields.type || "").trim());
  }
  if (fields.placement !== undefined) form.append("placement", String(fields.placement || "").trim());
  if (fields.ctaLabel !== undefined || fields.cta !== undefined) {
    form.append("ctaLabel", String(fields.ctaLabel ?? fields.cta ?? "").trim());
  }
  if (fields.ctaLink !== undefined) form.append("ctaLink", String(fields.ctaLink || "").trim());
  if (fields.split !== undefined) form.append("split", String(Boolean(fields.split)));
  if (fields.appOn !== undefined) form.append("appOn", String(Boolean(fields.appOn)));
  if (fields.webOn !== undefined) form.append("webOn", String(Boolean(fields.webOn)));
  if (fields.sortOrder !== undefined) form.append("sortOrder", String(fields.sortOrder));
  if (fields.status !== undefined) form.append("status", String(fields.status));
  else if (fields.shown !== undefined) form.append("status", fields.shown ? "active" : "inactive");
  else if (fields.live !== undefined) form.append("status", fields.live ? "active" : "inactive");
}

function jsonFields(fields) {
  const payload = {};
  if (fields.title !== undefined) payload.title = String(fields.title || "").trim();
  if (fields.description !== undefined) payload.description = String(fields.description || "").trim();
  if (fields.bannerType !== undefined || fields.type !== undefined) {
    payload.bannerType = String(fields.bannerType || fields.type || "").trim();
  }
  if (fields.placement !== undefined) payload.placement = String(fields.placement || "").trim();
  if (fields.ctaLabel !== undefined || fields.cta !== undefined) {
    payload.ctaLabel = String(fields.ctaLabel ?? fields.cta ?? "").trim();
  }
  if (fields.ctaLink !== undefined) payload.ctaLink = String(fields.ctaLink || "").trim();
  if (fields.split !== undefined) payload.split = Boolean(fields.split);
  if (fields.appOn !== undefined) payload.appOn = Boolean(fields.appOn);
  if (fields.webOn !== undefined) payload.webOn = Boolean(fields.webOn);
  if (fields.sortOrder !== undefined) payload.sortOrder = fields.sortOrder;
  if (fields.status !== undefined) payload.status = String(fields.status);
  else if (fields.shown !== undefined) payload.status = fields.shown ? "active" : "inactive";
  else if (fields.live !== undefined) payload.status = fields.live ? "active" : "inactive";
  return payload;
}

export async function adminListBanners(token, { page = 1, limit = 50, status, search, bannerType } = {}) {
  const params = { page, limit };
  if (status) params.status = status;
  if (bannerType) params.bannerType = bannerType;
  if (String(search || "").trim()) params.search = String(search).trim();
  try {
    const { data } = await api.get(BASE, {
      params,
      headers: authHeader(tokenOrStored(token)),
    });
    const items = (Array.isArray(data.banners) ? data.banners : []).map(mapBanner).filter(Boolean);
    return {
      items,
      pagination: data.pagination || { page, limit, total: items.length, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateBanner(token, fields, files = {}) {
  const headers = authHeader(tokenOrStored(token));
  const imageFile = files.imageFile instanceof File ? files.imageFile : files.file instanceof File ? files.file : null;
  const mobileFile = files.mobileFile instanceof File ? files.mobileFile : files.mobileImage instanceof File ? files.mobileImage : null;
  try {
    const form = new FormData();
    appendFields(form, fields);
    if (imageFile) form.append("file", imageFile);
    if (mobileFile) form.append("mobileImage", mobileFile);
    const { data } = await api.post(BASE, form, { headers });
    return mapBanner(data.banner);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateBanner(token, id, fields = {}, files = {}) {
  const headers = authHeader(tokenOrStored(token));
  const imageFile = files.imageFile instanceof File ? files.imageFile : files.file instanceof File ? files.file : null;
  const mobileFile = files.mobileFile instanceof File ? files.mobileFile : files.mobileImage instanceof File ? files.mobileImage : null;
  try {
    let payload = jsonFields(fields);
    if (imageFile || mobileFile) {
      payload = new FormData();
      appendFields(payload, fields);
      if (imageFile) payload.append("file", imageFile);
      if (mobileFile) payload.append("mobileImage", mobileFile);
    }
    const { data } = await api.patch(`${BASE}/${encodeURIComponent(id)}`, payload, { headers });
    return mapBanner(data.banner);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminReorderBanners(token, orderedIds) {
  try {
    const { data } = await api.put(
      `${BASE}/reorder`,
      { orderedIds },
      { headers: authHeader(tokenOrStored(token)) },
    );
    return (Array.isArray(data.banners) ? data.banners : []).map(mapBanner).filter(Boolean);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteBanner(token, id) {
  try {
    await api.delete(`${BASE}/${encodeURIComponent(id)}`, {
      headers: authHeader(tokenOrStored(token)),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}
