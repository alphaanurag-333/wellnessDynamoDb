import staffApi, { authHeader, normalizeApiError } from "./staffApi.js";

export async function fetchStaffAccounts(token, { page, limit, status, search, roleId, accountType } = {}) {
  try {
    const { data } = await staffApi.get("/staff/accounts", {
      headers: authHeader(token),
      params: { page, limit, status, search, roleId, accountType },
    });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchStaffAccountById(token, id) {
  try {
    const { data } = await staffApi.get(`/staff/accounts/${id}`, { headers: authHeader(token) });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function createStaffAccount(token, accountType, fields) {
  try {
    const { data } = await staffApi.post(
      "/staff/accounts",
      { ...fields, accountType },
      { headers: authHeader(token) },
    );
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function updateStaffAccount(token, id, updates) {
  try {
    const { data } = await staffApi.patch(`/staff/accounts/${id}`, updates, { headers: authHeader(token) });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function deleteStaffAccount(token, id) {
  try {
    const { data } = await staffApi.delete(`/staff/accounts/${id}`, { headers: authHeader(token) });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}
