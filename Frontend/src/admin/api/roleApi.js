import api, { authHeader, normalizeApiError } from "../../api.js";

function roleBase() {
  return "/admin/roles";
}

export async function adminListRoles(token, { page = 1, limit = 100, status, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data } = await api.get(`${roleBase()}?${q}`, { headers: authHeader(token) });
    return {
      roles: Array.isArray(data.roles) ? data.roles : [],
      pagination: data.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetRoleById(token, id) {
  try {
    const { data } = await api.get(`${roleBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
    return data.role;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateRole(token, fields) {
  try {
    const { data } = await api.post(
      roleBase(),
      {
        name: String(fields.name ?? "").trim(),
        slug: fields.slug ? String(fields.slug).trim() : undefined,
        permissions: Array.isArray(fields.permissions) ? fields.permissions : [],
        status: fields.status || "active",
      },
      { headers: authHeader(token) }
    );
    return data.role;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateRole(token, id, fields) {
  const payload = {};
  if (fields.name !== undefined) payload.name = String(fields.name).trim();
  if (fields.slug !== undefined) payload.slug = String(fields.slug).trim();
  if (fields.permissions !== undefined) payload.permissions = fields.permissions;
  if (fields.status !== undefined) payload.status = fields.status;

  try {
    const { data } = await api.patch(`${roleBase()}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(token),
    });
    return data.role;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteRole(token, id) {
  try {
    await api.delete(`${roleBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetPermissionCatalog(token) {
  try {
    const { data } = await api.get("/admin/permissions", { headers: authHeader(token) });
    return {
      groups: Array.isArray(data.groups) ? data.groups : [],
      permissions: Array.isArray(data.permissions) ? data.permissions : [],
    };
  } catch (error) {
    normalizeApiError(error);
  }
}
