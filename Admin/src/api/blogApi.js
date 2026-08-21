import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";
import {
  editorFromBlogConfig,
  mapBlogConfig,
  mapBlogMedia,
  mapBlogPost,
} from "../data/blogsConfigData.js";

function tokenOrStored(token) {
  return token || getAccountToken();
}

export async function adminGetBlogConfig(token) {
  try {
    const { data } = await api.get("/admin/blog-config", {
      headers: authHeader(tokenOrStored(token)),
    });
    return mapBlogConfig(data.data);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminEnsureBlogConfig(token) {
  const existing = await adminGetBlogConfig(token);
  if (existing) return existing;
  try {
    const { data } = await api.post("/admin/blog-config", {}, {
      headers: authHeader(tokenOrStored(token)),
    });
    return mapBlogConfig(data.data);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateBlogConfig(token, fields = {}) {
  const payload = {};
  if (fields.appOn !== undefined) payload.appOn = Boolean(fields.appOn);
  if (fields.webOn !== undefined) payload.webOn = Boolean(fields.webOn);
  try {
    const { data } = await api.patch("/admin/blog-config", payload, {
      headers: authHeader(tokenOrStored(token)),
    });
    return mapBlogConfig(data.data);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminListBlogPosts(token, { page = 1, limit = 50, status, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data } = await api.get(`/admin/blog-posts?${q}`, {
      headers: authHeader(tokenOrStored(token)),
    });
    const items = (Array.isArray(data.posts) ? data.posts : [])
      .map((row) => mapBlogPost(row))
      .filter(Boolean);
    return {
      items,
      pagination: data.pagination ?? { page, limit, total: items.length, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateBlogPost(token, fields, files = {}) {
  const headers = authHeader(tokenOrStored(token));
  const coverFile = files.coverFile instanceof File ? files.coverFile : null;
  const payload = {
    title: fields.title ?? "",
    description: fields.description ?? "",
    status: fields.status || (fields.live === false ? "inactive" : "active"),
    sortOrder: fields.sortOrder,
    webVisible: fields.webVisible !== false,
    appVisible: fields.appVisible !== false,
  };
  try {
    if (coverFile) {
      const fd = new FormData();
      fd.append("title", payload.title);
      fd.append("description", payload.description);
      fd.append("status", payload.status);
      fd.append("webVisible", String(payload.webVisible));
      fd.append("appVisible", String(payload.appVisible));
      if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== "") {
        fd.append("sortOrder", String(payload.sortOrder));
      }
      fd.append("coverFile", coverFile);
      const { data } = await api.post("/admin/blog-posts", fd, { headers });
      return mapBlogPost(data.post);
    }
    const { data } = await api.post("/admin/blog-posts", payload, { headers });
    return mapBlogPost(data.post);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateBlogPost(token, id, fields, files = {}) {
  const headers = authHeader(tokenOrStored(token));
  const coverFile = files.coverFile instanceof File ? files.coverFile : null;
  try {
    if (coverFile) {
      const fd = new FormData();
      if (fields.title !== undefined) fd.append("title", String(fields.title ?? "").trim());
      if (fields.description !== undefined) fd.append("description", String(fields.description ?? "").trim());
      if (fields.status !== undefined) fd.append("status", String(fields.status));
      else if (fields.live !== undefined) fd.append("status", fields.live ? "active" : "inactive");
      if (fields.webVisible !== undefined) fd.append("webVisible", String(Boolean(fields.webVisible)));
      if (fields.appVisible !== undefined) fd.append("appVisible", String(Boolean(fields.appVisible)));
      fd.append("coverFile", coverFile);
      const { data } = await api.patch(`/admin/blog-posts/${encodeURIComponent(id)}`, fd, { headers });
      return mapBlogPost(data.post);
    }
    const payload = {};
    if (fields.title !== undefined) payload.title = String(fields.title ?? "").trim();
    if (fields.description !== undefined) payload.description = String(fields.description ?? "").trim();
    if (fields.status !== undefined) payload.status = String(fields.status);
    else if (fields.live !== undefined) payload.status = fields.live ? "active" : "inactive";
    if (fields.webVisible !== undefined) payload.webVisible = Boolean(fields.webVisible);
    if (fields.appVisible !== undefined) payload.appVisible = Boolean(fields.appVisible);
    if (fields.sortOrder !== undefined) payload.sortOrder = fields.sortOrder;
    const { data } = await api.patch(`/admin/blog-posts/${encodeURIComponent(id)}`, payload, { headers });
    return mapBlogPost(data.post);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteBlogPost(token, id) {
  try {
    await api.delete(`/admin/blog-posts/${encodeURIComponent(id)}`, {
      headers: authHeader(tokenOrStored(token)),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminReorderBlogPosts(token, orderedIds) {
  try {
    const { data } = await api.put("/admin/blog-posts/reorder", { orderedIds }, {
      headers: authHeader(tokenOrStored(token)),
    });
    return (Array.isArray(data.posts) ? data.posts : [])
      .map((row) => mapBlogPost(row))
      .filter(Boolean);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminListBlogMedia(token, { page = 1, limit = 50, status, owner, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (owner) q.set("owner", owner);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data } = await api.get(`/admin/blog-media?${q}`, {
      headers: authHeader(tokenOrStored(token)),
    });
    const items = (Array.isArray(data.media) ? data.media : [])
      .map((row) => mapBlogMedia(row))
      .filter(Boolean);
    return {
      items,
      pagination: data.pagination ?? { page, limit, total: items.length, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateBlogMedia(token, fields, files = {}) {
  const headers = authHeader(tokenOrStored(token));
  const file = files.file instanceof File ? files.file : null;
  try {
    const fd = new FormData();
    fd.append("title", String(fields.title || "Blog cover").trim() || "Blog cover");
    if (fields.owner) fd.append("owner", String(fields.owner));
    if (fields.status) fd.append("status", String(fields.status));
    else if (fields.live !== undefined) fd.append("status", fields.live ? "active" : "inactive");
    if (file) fd.append("file", file);
    const { data } = await api.post("/admin/blog-media", fd, { headers });
    return mapBlogMedia(data.media);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateBlogMedia(token, id, fields, files = {}) {
  const headers = authHeader(tokenOrStored(token));
  const file = files.file instanceof File ? files.file : null;
  try {
    if (file) {
      const fd = new FormData();
      if (fields.title !== undefined) fd.append("title", String(fields.title ?? "").trim());
      if (fields.owner !== undefined) fd.append("owner", String(fields.owner ?? "").trim());
      if (fields.status !== undefined) fd.append("status", String(fields.status));
      else if (fields.live !== undefined) fd.append("status", fields.live ? "active" : "inactive");
      fd.append("file", file);
      const { data } = await api.patch(`/admin/blog-media/${encodeURIComponent(id)}`, fd, { headers });
      return mapBlogMedia(data.media);
    }
    const payload = {};
    if (fields.title !== undefined) payload.title = String(fields.title ?? "").trim();
    if (fields.owner !== undefined) payload.owner = String(fields.owner ?? "").trim();
    if (fields.status !== undefined) payload.status = String(fields.status);
    else if (fields.live !== undefined) payload.status = fields.live ? "active" : "inactive";
    const { data } = await api.patch(`/admin/blog-media/${encodeURIComponent(id)}`, payload, { headers });
    return mapBlogMedia(data.media);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteBlogMedia(token, id) {
  try {
    await api.delete(`/admin/blog-media/${encodeURIComponent(id)}`, {
      headers: authHeader(tokenOrStored(token)),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}

export { editorFromBlogConfig, mapBlogConfig, mapBlogMedia, mapBlogPost };
