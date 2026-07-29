import api, { authHeader, normalizeApiError } from "../../api.js";

function teamBase() {
  return "/admin/team";
}

function appendTeamFields(fd, fields) {
  if (fields.name !== undefined) fd.append("name", String(fields.name ?? "").trim());
  if (fields.email !== undefined) fd.append("email", String(fields.email ?? "").trim());
  if (fields.password !== undefined && fields.password !== "") {
    fd.append("password", String(fields.password));
  }
  if (fields.phone !== undefined) fd.append("phone", String(fields.phone ?? "").trim());
  if (fields.roleId !== undefined) fd.append("roleId", String(fields.roleId ?? ""));
  if (fields.status !== undefined) fd.append("status", String(fields.status || "active"));
  if (fields.parentAccountId !== undefined) {
    fd.append("parentAccountId", fields.parentAccountId == null ? "" : String(fields.parentAccountId));
  }
  if (fields.specializationId !== undefined) {
    fd.append(
      "specializationId",
      fields.specializationId == null ? "" : String(fields.specializationId)
    );
  }
  if (fields.referralCode !== undefined) {
    fd.append("referralCode", fields.referralCode == null ? "" : String(fields.referralCode));
  }
  if (fields.approvalStatus !== undefined) {
    fd.append("approvalStatus", String(fields.approvalStatus || ""));
  }
}

export async function adminListTeamMembers(token, { page = 1, limit = 20, status, search, roleId } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (roleId) q.set("roleId", roleId);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data } = await api.get(`${teamBase()}?${q}`, { headers: authHeader(token) });
    return {
      members: Array.isArray(data.members) ? data.members : [],
      pagination: data.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminListTeamRoleOptions(token) {
  try {
    const { data } = await api.get(`${teamBase()}/roles`, { headers: authHeader(token) });
    return Array.isArray(data.roles) ? data.roles : [];
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminListTeamParents(token) {
  try {
    const { data } = await api.get(`${teamBase()}/parents`, { headers: authHeader(token) });
    return Array.isArray(data.parents) ? data.parents : [];
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetTeamMemberById(token, id) {
  try {
    const { data } = await api.get(`${teamBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
    return data.member;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateTeamMember(token, fields, file) {
  const body = {
    name: String(fields.name ?? "").trim(),
    email: String(fields.email ?? "").trim(),
    password: String(fields.password ?? ""),
    phone: String(fields.phone ?? "").trim(),
    roleId: fields.roleId,
    status: fields.status || "active",
    parentAccountId: fields.parentAccountId || "",
    specializationId: fields.specializationId || "",
    referralCode: fields.referralCode || "",
    approvalStatus: fields.approvalStatus || "",
  };

  if (file instanceof File) {
    const fd = new FormData();
    appendTeamFields(fd, body);
    fd.append("file", file);
    try {
      const { data } = await api.post(teamBase(), fd, { headers: authHeader(token) });
      return data.member;
    } catch (error) {
      normalizeApiError(error);
    }
  }

  try {
    const { data } = await api.post(teamBase(), body, { headers: authHeader(token) });
    return data.member;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateTeamMember(token, id, fields, file) {
  const payload = {};
  if (fields.name !== undefined) payload.name = String(fields.name).trim();
  if (fields.phone !== undefined) payload.phone = String(fields.phone).trim();
  if (fields.roleId !== undefined) payload.roleId = fields.roleId;
  if (fields.status !== undefined) payload.status = fields.status;
  if (fields.password) payload.password = String(fields.password);
  if (fields.parentAccountId !== undefined) {
    payload.parentAccountId = fields.parentAccountId || "";
  }
  if (fields.specializationId !== undefined) {
    payload.specializationId = fields.specializationId || "";
  }
  if (fields.referralCode !== undefined) payload.referralCode = fields.referralCode || "";
  if (fields.approvalStatus !== undefined) payload.approvalStatus = fields.approvalStatus || "";

  if (file instanceof File || Object.keys(payload).length > 0) {
    if (file instanceof File) {
      const fd = new FormData();
      appendTeamFields(fd, payload);
      fd.append("file", file);
      try {
        const { data } = await api.patch(`${teamBase()}/${encodeURIComponent(id)}`, fd, {
          headers: authHeader(token),
        });
        return data.member;
      } catch (error) {
        normalizeApiError(error);
      }
    }

    try {
      const { data } = await api.patch(`${teamBase()}/${encodeURIComponent(id)}`, payload, {
        headers: authHeader(token),
      });
      return data.member;
    } catch (error) {
      normalizeApiError(error);
    }
  }

  throw new Error("At least one field or profile image is required for update");
}

export async function adminUpdateTeamMemberStatus(token, id, status) {
  try {
    const { data } = await api.patch(
      `${teamBase()}/${encodeURIComponent(id)}/status`,
      { status },
      { headers: authHeader(token) }
    );
    return data.member;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteTeamMember(token, id) {
  try {
    await api.delete(`${teamBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}
