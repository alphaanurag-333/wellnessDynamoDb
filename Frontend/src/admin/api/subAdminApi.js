import api, { authHeader, normalizeApiError } from "../../api.js";

function subAdminBase() {
  return "/admin/sub-admins";
}

function appendSubAdminFields(fd, fields) {
  if (fields.name !== undefined) fd.append("name", String(fields.name ?? "").trim());
  if (fields.email !== undefined) fd.append("email", String(fields.email ?? "").trim());
  if (fields.password !== undefined && fields.password !== "") {
    fd.append("password", String(fields.password));
  }
  if (fields.phone !== undefined) fd.append("phone", String(fields.phone ?? "").trim());
  if (fields.roleId !== undefined) fd.append("roleId", String(fields.roleId ?? ""));
  if (fields.status !== undefined) fd.append("status", String(fields.status || "active"));
}

export async function adminListSubAdmins(token, { page = 1, limit = 20, status, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data } = await api.get(`${subAdminBase()}?${q}`, { headers: authHeader(token) });
    return {
      admins: Array.isArray(data.admins) ? data.admins : [],
      pagination: data.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetSubAdminById(token, id) {
  try {
    const { data } = await api.get(`${subAdminBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
    return data.admin;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateSubAdmin(token, fields, file) {
  const body = {
    name: String(fields.name ?? "").trim(),
    email: String(fields.email ?? "").trim(),
    password: String(fields.password ?? ""),
    phone: String(fields.phone ?? "").trim(),
    roleId: fields.roleId,
    status: fields.status || "active",
  };

  if (file instanceof File) {
    const fd = new FormData();
    appendSubAdminFields(fd, body);
    fd.append("file", file);
    try {
      const { data } = await api.post(subAdminBase(), fd, { headers: authHeader(token) });
      return data.admin;
    } catch (error) {
      normalizeApiError(error);
    }
  }

  try {
    const { data } = await api.post(subAdminBase(), body, { headers: authHeader(token) });
    return data.admin;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateSubAdmin(token, id, fields, file) {
  const payload = {};
  if (fields.name !== undefined) payload.name = String(fields.name).trim();
  if (fields.phone !== undefined) payload.phone = String(fields.phone).trim();
  if (fields.roleId !== undefined) payload.roleId = fields.roleId;
  if (fields.status !== undefined) payload.status = fields.status;
  if (fields.password) payload.password = String(fields.password);

  if (file instanceof File || Object.keys(payload).length > 0) {
    if (file instanceof File) {
      const fd = new FormData();
      appendSubAdminFields(fd, payload);
      fd.append("file", file);
      try {
        const { data } = await api.patch(`${subAdminBase()}/${encodeURIComponent(id)}`, fd, {
          headers: authHeader(token),
        });
        return data.admin;
      } catch (error) {
        normalizeApiError(error);
      }
    }

    try {
      const { data } = await api.patch(`${subAdminBase()}/${encodeURIComponent(id)}`, payload, {
        headers: authHeader(token),
      });
      return data.admin;
    } catch (error) {
      normalizeApiError(error);
    }
  }

  throw new Error("At least one field or profile image is required for update");
}

export async function adminUpdateSubAdminStatus(token, id, status) {
  try {
    const { data } = await api.patch(
      `${subAdminBase()}/${encodeURIComponent(id)}/status`,
      { status },
      { headers: authHeader(token) }
    );
    return data.admin;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteSubAdmin(token, id) {
  try {
    await api.delete(`${subAdminBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}
