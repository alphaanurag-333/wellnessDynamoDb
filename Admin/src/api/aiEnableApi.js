import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

function aiEnableBase() {
  return "/admin/ai-enable";
}

function tokenOrStored(token) {
  return token || getAccountToken();
}

export async function adminListAiEnable(token) {
  try {
    const { data } = await api.get(aiEnableBase(), {
      headers: authHeader(tokenOrStored(token)),
    });
    return {
      coaches: Array.isArray(data.coaches) ? data.coaches : [],
      assistants: Array.isArray(data.assistants) ? data.assistants : [],
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateAiEnable(token, id, enabled) {
  try {
    const { data } = await api.patch(
      `${aiEnableBase()}/${encodeURIComponent(id)}`,
      { enabled: Boolean(enabled) },
      { headers: authHeader(tokenOrStored(token)) },
    );
    return data.person;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminBulkUpdateAiEnable(token, group, enabled) {
  try {
    const { data } = await api.patch(
      `${aiEnableBase()}/bulk`,
      { group, enabled: Boolean(enabled) },
      { headers: authHeader(tokenOrStored(token)) },
    );
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}
