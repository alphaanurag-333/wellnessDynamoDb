import api, { authHeader, normalizeApiError } from "../../api.js";

function bannersBase() {
  return "/admin/banners";
}

export async function adminListBanners(token, { page = 1, limit = 50, status, search, bannerType } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  if (bannerType && String(bannerType).trim()) q.set("bannerType", String(bannerType).trim());
  try {
    const { data } = await api.get(`${bannersBase()}?${q}`, { headers: authHeader(token) });
    return {
      banners: Array.isArray(data.banners) ? data.banners : [],
      pagination: data.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetBannerById(token, id) {
  try {
    const { data } = await api.get(`${bannersBase()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
    return data.banner;
  } catch (error) {
    normalizeApiError(error);
  }
}

function appendBannerFormData(fd, fields) {
  if (fields.title !== undefined) fd.append("title", String(fields.title ?? "").trim());
  if (fields.description !== undefined) fd.append("description", String(fields.description ?? "").trim());
  if (fields.status !== undefined) fd.append("status", String(fields.status || "active"));
  if (fields.bannerType !== undefined) fd.append("bannerType", String(fields.bannerType || "main"));
}

export async function adminCreateBanner(token, fields, file, mobileFile) {
  const hasFiles = file instanceof File || mobileFile instanceof File;
  if (hasFiles) {
    const fd = new FormData();
    appendBannerFormData(fd, {
      title: fields.title,
      description: fields.description,
      status: fields.status || "active",
      bannerType: fields.bannerType || "main",
    });
    if (file instanceof File) fd.append("file", file);
    if (mobileFile instanceof File) fd.append("mobileImage", mobileFile);
    try {
      const { data } = await api.post(bannersBase(), fd, { headers: authHeader(token) });
      return data.banner;
    } catch (error) {
      normalizeApiError(error);
    }
  }

  try {
    const { data } = await api.post(
      bannersBase(),
      {
        title: String(fields.title ?? "").trim(),
        description: String(fields.description ?? "").trim(),
        image: String(fields.image ?? "").trim(),
        mobileImage: String(fields.mobileImage ?? "").trim(),
        status: String(fields.status || "active"),
        bannerType: String(fields.bannerType || "main"),
      },
      { headers: authHeader(token) }
    );
    return data.banner;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateBanner(token, id, fields, file, mobileFile) {
  const hasFiles = file instanceof File || mobileFile instanceof File;
  if (hasFiles) {
    const fd = new FormData();
    appendBannerFormData(fd, fields);
    if (file instanceof File) fd.append("file", file);
    if (mobileFile instanceof File) fd.append("mobileImage", mobileFile);
    try {
      const { data } = await api.patch(`${bannersBase()}/${encodeURIComponent(id)}`, fd, {
        headers: authHeader(token),
      });
      return data.banner;
    } catch (error) {
      normalizeApiError(error);
    }
  }

  const payload = {};
  if (fields.title !== undefined) payload.title = String(fields.title).trim();
  if (fields.description !== undefined) payload.description = String(fields.description).trim();
  if (fields.status !== undefined) payload.status = String(fields.status);
  if (fields.bannerType !== undefined) payload.bannerType = String(fields.bannerType || "main");
  if (fields.image !== undefined) payload.image = String(fields.image).trim();
  if (fields.mobileImage !== undefined) payload.mobileImage = String(fields.mobileImage).trim();

  try {
    const { data } = await api.patch(`${bannersBase()}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(token),
    });
    return data.banner;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteBanner(token, id) {
  try {
    await api.delete(`${bannersBase()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
  } catch (error) {
    normalizeApiError(error);
  }
}
