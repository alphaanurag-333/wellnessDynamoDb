import api, { normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";
import {
  fetchAccessMembers,
  setAccessMemberRole,
} from "./accessApi.js";

function authHeader() {
  const token = getAccountToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export { fetchAccessMembers as fetchTeamMembers, setAccessMemberRole };

export async function fetchTeamMember(id) {
  try {
    const { data } = await api.get(`/account/access/members/${encodeURIComponent(id)}`, {
      headers: authHeader(),
    });
    return data.member;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveTeamMemberPermissions(id, { grants, reset } = {}) {
  try {
    const { data } = await api.patch(
      `/account/access/members/${encodeURIComponent(id)}/permissions`,
      reset ? { reset: true } : { grants },
      { headers: authHeader() },
    );
    return data.member;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function createTeamMember(payload) {
  try {
    const { data } = await api.post("/account/accounts", payload, { headers: authHeader() });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function listCoachOptions() {
  try {
    const { data } = await api.get("/account/accounts", {
      headers: authHeader(),
      params: { roleKey: "wellness_coach", status: "active", limit: 100 },
    });
    return Array.isArray(data.accounts) ? data.accounts : [];
  } catch (error) {
    normalizeApiError(error);
  }
}
