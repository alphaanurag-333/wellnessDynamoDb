import staffApi, { authHeader, normalizeApiError } from "./staffApi.js";

export async function fetchStaffRoles(token, { page, limit, status, search, accountType } = {}) {
  try {
    const { data } = await staffApi.get("/staff/roles", {
      headers: authHeader(token),
      params: { page, limit, status, search, accountType },
    });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchStaffRoleById(token, id) {
  try {
    const { data } = await staffApi.get(`/staff/roles/${id}`, { headers: authHeader(token) });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function createStaffRole(token, { name, slug, permissions, status, accountTypes }) {
  try {
    const { data } = await staffApi.post(
      "/staff/roles",
      { name, slug, permissions, status, accountTypes },
      { headers: authHeader(token) },
    );
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function updateStaffRole(token, id, updates) {
  try {
    const { data } = await staffApi.patch(`/staff/roles/${id}`, updates, { headers: authHeader(token) });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function deleteStaffRole(token, id) {
  try {
    const { data } = await staffApi.delete(`/staff/roles/${id}`, { headers: authHeader(token) });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}
