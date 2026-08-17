import api, { normalizeApiError } from "../api.js";

export const ACCOUNT_AUTH_STORAGE_KEY = "wellness_account_auth";

/** UI view-as id → backend roleKey */
export const UI_TO_ROLE_KEY = {
  admin: "admin",
  wc: "wellness_coach",
  awc: "assistant_wellness_coach",
  trainee: "trainee",
  support: "support",
};

export const ROLE_KEY_TO_UI = {
  admin: "admin",
  wellness_coach: "wc",
  assistant_wellness_coach: "awc",
  trainee: "trainee",
  support: "support",
};

export function readAccountAuth() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACCOUNT_AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.accessToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeAccountAuth(payload) {
  if (typeof window === "undefined") return;
  if (!payload?.accessToken) {
    window.localStorage.removeItem(ACCOUNT_AUTH_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(ACCOUNT_AUTH_STORAGE_KEY, JSON.stringify(payload));
}

export function clearAccountAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCOUNT_AUTH_STORAGE_KEY);
}

export function getAccountToken() {
  return readAccountAuth()?.accessToken || null;
}

function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function accountLogin({ email, password, activeRole }) {
  try {
    const body = { email, password };
    if (activeRole) body.activeRole = UI_TO_ROLE_KEY[activeRole] || activeRole;
    const { data } = await api.post("/account/auth/login", body);
    const stored = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      account: data.account,
    };
    writeAccountAuth(stored);
    return stored;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function accountRefresh(activeRole) {
  const current = readAccountAuth();
  if (!current?.refreshToken) throw new Error("Missing refresh token");
  try {
    const body = { refreshToken: current.refreshToken };
    if (activeRole) body.activeRole = UI_TO_ROLE_KEY[activeRole] || activeRole;
    const { data } = await api.post("/account/auth/refresh-token", body);
    const stored = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken || current.refreshToken,
      account: data.account || current.account,
    };
    writeAccountAuth(stored);
    return stored;
  } catch (error) {
    clearAccountAuth();
    normalizeApiError(error);
  }
}

export async function accountSwitchRole(activeRoleUiOrKey) {
  const token = getAccountToken();
  if (!token) throw new Error("Not authenticated");
  const activeRole = UI_TO_ROLE_KEY[activeRoleUiOrKey] || activeRoleUiOrKey;
  try {
    const { data } = await api.post(
      "/account/auth/switch-role",
      { activeRole },
      { headers: authHeader(token) },
    );
    const stored = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      account: data.account,
    };
    writeAccountAuth(stored);
    return stored;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function accountMe() {
  const token = getAccountToken();
  if (!token) return null;
  try {
    const { data } = await api.get("/account/auth/me", { headers: authHeader(token) });
    const current = readAccountAuth() || {};
    const stored = { ...current, account: data.account };
    writeAccountAuth(stored);
    return data.account;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function accountUpdateMe(fields = {}, file) {
  const token = getAccountToken();
  if (!token) throw new Error("Not authenticated");

  try {
    let body;
    let headers = authHeader(token);

    if (file) {
      const form = new FormData();
      if (fields.bio !== undefined) form.append("bio", fields.bio ?? "");
      if (fields.name !== undefined) form.append("name", fields.name ?? "");
      if (fields.phone !== undefined) form.append("phone", fields.phone ?? "");
      if (fields.phoneCountryCode !== undefined) {
        form.append("phoneCountryCode", fields.phoneCountryCode ?? "");
      }
      if (fields.designation !== undefined) form.append("designation", fields.designation ?? "");
      form.append("file", file);
      body = form;
    } else {
      body = {};
      if (fields.bio !== undefined) body.bio = fields.bio;
      if (fields.name !== undefined) body.name = fields.name;
      if (fields.phone !== undefined) body.phone = fields.phone;
      if (fields.phoneCountryCode !== undefined) body.phoneCountryCode = fields.phoneCountryCode;
      if (fields.designation !== undefined) body.designation = fields.designation;
      if (fields.profileImage !== undefined) body.profileImage = fields.profileImage;
      headers = { ...headers, "Content-Type": "application/json" };
    }

    const { data } = await api.patch("/account/auth/me", body, { headers });
    const current = readAccountAuth() || {};
    const stored = { ...current, account: data.account };
    writeAccountAuth(stored);
    return data.account;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function accountChangePassword({ currentPassword, newPassword }) {
  const token = getAccountToken();
  if (!token) throw new Error("Not authenticated");
  try {
    const { data } = await api.patch(
      "/account/auth/me/password",
      { currentPassword, newPassword },
      { headers: authHeader(token) },
    );
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function accountListHealUsers({ page = 1, limit = 20, search } = {}) {
  const token = getAccountToken();
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (search) q.set("search", search);
  try {
    const { data } = await api.get(`/account/heal-users?${q}`, {
      headers: authHeader(token),
    });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function accountListAccounts(params = {}) {
  const token = getAccountToken();
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== "") q.set(k, String(v));
  });
  try {
    const { data } = await api.get(`/account/accounts?${q}`, {
      headers: authHeader(token),
    });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function accountGrantMembership(accountId, membership) {
  const token = getAccountToken();
  try {
    const { data } = await api.post(
      `/account/accounts/${encodeURIComponent(accountId)}/memberships`,
      membership,
      { headers: authHeader(token) },
    );
    return data.account;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function accountRevokeMembership(accountId, roleKey) {
  const token = getAccountToken();
  try {
    const { data } = await api.delete(
      `/account/accounts/${encodeURIComponent(accountId)}/memberships/${encodeURIComponent(roleKey)}`,
      { headers: authHeader(token) },
    );
    return data.account;
  } catch (error) {
    normalizeApiError(error);
  }
}
