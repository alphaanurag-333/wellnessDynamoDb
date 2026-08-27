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

export async function sendTeamReminder({ accountIds, message } = {}) {
  try {
    const { data } = await api.post(
      "/account/dashboard/team-reminders",
      { accountIds, message },
      { headers: authHeader() },
    );
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function sendTeamWhatsAppReminder({ accountIds, message } = {}) {
  try {
    const { data } = await api.post(
      "/account/dashboard/team-reminders/whatsapp",
      { accountIds, message },
      { headers: authHeader() },
    );
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

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

export async function setTeamMemberPassword(id, { password, newPassword } = {}) {
  const nextPassword = password ?? newPassword;
  try {
    const { data } = await api.patch(
      `/account/accounts/${encodeURIComponent(id)}/password`,
      { password: nextPassword },
      { headers: authHeader() },
    );
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function setTeamMemberTotp(id, { totpRequired }) {
  try {
    const { data } = await api.patch(
      `/account/accounts/${encodeURIComponent(id)}/totp`,
      { totpRequired: Boolean(totpRequired) },
      { headers: authHeader() },
    );
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function regenerateTeamMemberTotp(id) {
  try {
    const { data } = await api.post(
      `/account/accounts/${encodeURIComponent(id)}/totp/regenerate`,
      {},
      { headers: authHeader() },
    );
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function updateTeamMember(id, payload) {
  try {
    const { data } = await api.patch(`/account/accounts/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(),
    });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

/** PATCH /account/accounts/:id — upload or replace profile photo (multipart field: file). */
export async function updateTeamMemberProfileImage(id, profileFile) {
  if (!(profileFile instanceof File)) {
    throw new Error("Profile image file is required");
  }
  const form = new FormData();
  form.append("file", profileFile);
  try {
    const { data } = await api.patch(`/account/accounts/${encodeURIComponent(id)}`, form, {
      headers: authHeader(),
    });
    return data.account;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function deleteTeamMember(id) {
  try {
    const { data } = await api.post(
      `/account/access/members/${encodeURIComponent(id)}/delete`,
      {},
      { headers: authHeader() },
    );
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function listTeamParentOptions() {
  try {
    const roles = ["wellness_coach", "assistant_wellness_coach"];
    const responses = await Promise.all(
      roles.map((roleKey) =>
        api.get("/account/accounts", {
          headers: authHeader(),
          params: { roleKey, status: "active", limit: 100 },
        }),
      ),
    );
    return responses.flatMap(({ data }) =>
      Array.isArray(data.accounts) ? data.accounts : [],
    );
  } catch (error) {
    normalizeApiError(error);
  }
}
