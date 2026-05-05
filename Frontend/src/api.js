import axios from "axios";

const API_BASE = "http://localhost:5000";
// const API_BASE = "https://wellness.developmentalphawizz.com:5001";
const AUTH_STORAGE_KEY = "wellness_admin_auth";

export function getApiBase() {
  return API_BASE;
}

const api = axios.create({
  baseURL: `${API_BASE}/api`,
});

function readStoredAuth() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredAuth(nextAuth) {
  if (typeof window === "undefined") return;
  if (!nextAuth?.adminToken || !nextAuth?.refreshToken || !nextAuth?.admin) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
}

let refreshPromise = null;

async function refreshAdminToken() {
  if (refreshPromise) return refreshPromise;

  const current = readStoredAuth();
  const refreshToken = current?.refreshToken;
  if (!refreshToken) {
    throw new Error("Missing refresh token");
  }

  refreshPromise = axios
    .post(`${API_BASE}/api/admin/auth/refresh`, { refreshToken })
    .then(({ data }) => {
      const updated = {
        ...current,
        adminToken: data?.token,
        refreshToken: data?.refreshToken || refreshToken,
      };
      writeStoredAuth(updated);
      return updated.adminToken;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

api.interceptors.request.use((config) => {
  const stored = readStoredAuth();
  const latestToken = stored?.adminToken;
  if (latestToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${latestToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config;
    const requestUrl = String(originalRequest?.url || "");

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !requestUrl.includes("/admin/auth/login") &&
      !requestUrl.includes("/admin/auth/refresh")
    ) {
      originalRequest._retry = true;
      try {
        const newToken = await refreshAdminToken();
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        writeStoredAuth(null);
      }
    }

    return Promise.reject(error);
  }
);

export function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function normalizeApiError(error) {
  const data = error?.response?.data;
  const status = error?.response?.status;
  const message =
    data?.message || data?.error || error?.message || (status ? `Request failed (${status})` : "Request failed");
  const err = new Error(message);
  err.status = status;
  err.body = data;
  throw err;
}

export default api;