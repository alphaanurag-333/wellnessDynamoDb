import api, { normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

function authHeader() {
  const token = getAccountToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchAccessCatalog() {
  try {
    const { data } = await api.get("/account/access/catalog", { headers: authHeader() });
    return data.catalog;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchAccessRoles() {
  try {
    const { data } = await api.get("/account/access/roles", { headers: authHeader() });
    return Array.isArray(data.roles) ? data.roles : [];
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchAccessPolicies() {
  try {
    const { data } = await api.get("/account/access/policies", { headers: authHeader() });
    return Array.isArray(data.policies) ? data.policies : [];
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function createAccessPolicy(payload) {
  try {
    const { data } = await api.post("/account/access/policies", payload, { headers: authHeader() });
    return data.policy;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function updateAccessPolicy(id, payload) {
  try {
    const { data } = await api.patch(`/account/access/policies/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(),
    });
    return data.policy;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function deleteAccessPolicy(id) {
  try {
    await api.delete(`/account/access/policies/${encodeURIComponent(id)}`, { headers: authHeader() });
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function attachAccessPolicy(id, payload) {
  try {
    const { data } = await api.post(
      `/account/access/policies/${encodeURIComponent(id)}/attachments`,
      payload,
      { headers: authHeader() },
    );
    return data.policy;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function createAccessRole(payload) {
  try {
    const { data } = await api.post("/account/access/roles", payload, { headers: authHeader() });
    return data.role;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function updateAccessRole(id, payload) {
  try {
    const { data } = await api.patch(`/account/access/roles/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(),
    });
    return data.role;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function deleteAccessRole(id) {
  try {
    await api.delete(`/account/access/roles/${encodeURIComponent(id)}`, { headers: authHeader() });
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchAccessMembers({ search, roleKey, consoleRoleId, page = 1, limit = 20 } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (search) q.set("search", search);
  if (consoleRoleId) q.set("consoleRoleId", consoleRoleId);
  else if (roleKey) q.set("roleKey", roleKey);
  try {
    const { data } = await api.get(`/account/access/members?${q}`, { headers: authHeader() });
    return {
      members: Array.isArray(data.members) ? data.members : [],
      pagination: data.pagination,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function setAccessMemberRole(accountId, roleOrPayload) {
  try {
    const payload =
      roleOrPayload && typeof roleOrPayload === "object"
        ? roleOrPayload
        : { roleKey: roleOrPayload };
    const { data } = await api.patch(
      `/account/access/members/${encodeURIComponent(accountId)}/role`,
      payload,
      { headers: authHeader() },
    );
    return data.account;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchAccessApprovals({ status = "pending", page = 1, limit = 50 } = {}) {
  const q = new URLSearchParams();
  q.set("status", status);
  q.set("page", String(page));
  q.set("limit", String(limit));
  try {
    const { data } = await api.get(`/account/access/approvals?${q}`, { headers: authHeader() });
    return {
      requests: Array.isArray(data.requests) ? data.requests : [],
      pagination: data.pagination,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function approveAccessRequest(id) {
  try {
    const { data } = await api.post(
      `/account/access/approvals/${encodeURIComponent(id)}/approve`,
      {},
      { headers: authHeader() },
    );
    return data.request;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function rejectAccessRequest(id) {
  try {
    const { data } = await api.post(
      `/account/access/approvals/${encodeURIComponent(id)}/reject`,
      {},
      { headers: authHeader() },
    );
    return data.request;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchAccessAuditLog({ search, kind, page = 1, limit = 50 } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (search) q.set("search", search);
  if (kind) q.set("kind", kind);
  try {
    const { data } = await api.get(`/account/access/audit-log?${q}`, { headers: authHeader() });
    return {
      entries: Array.isArray(data.entries) ? data.entries : [],
      pagination: data.pagination,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

/** Convert role.grants map → local grants state keyed by roleKey or role id */
export function rolesToGrantsState(roles) {
  const out = {};
  for (const role of roles || []) {
    const key = role.roleKey || role.id;
    out[key] = role.grants == null ? null : { ...role.grants };
  }
  return out;
}

export function rolesToViewsState(roles) {
  const out = {};
  for (const role of roles || []) {
    const key = role.roleKey || role.id;
    out[key] = Array.isArray(role.navSections) ? [...role.navSections] : [];
  }
  return out;
}

export function rolesToParentsState(roles) {
  const byId = Object.fromEntries((roles || []).map((r) => [r.id, r]));
  const out = {};
  for (const role of roles || []) {
    const key = role.roleKey || role.id;
    const parent = role.inheritsFromRoleId ? byId[role.inheritsFromRoleId] : null;
    out[key] = parent ? parent.roleKey || parent.id : null;
  }
  return out;
}
