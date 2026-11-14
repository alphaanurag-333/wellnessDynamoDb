import axios from "axios";
import {
  hydrateAdminProfile,
  hydrateStoreFromApiResponse,
} from "./store/hydrateFromApi.js";
import {
  announcePanelSessionExpired,
  clearPanelSession,
  getPanelSessionExpiryReason,
} from "./utils/panelSession.js";


export function isPrivateLanHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)
  );
}

/**
 * When Admin is opened as http://192.168.x.x:5174 on another device, env
 * "localhost:5000" would hit that device — use the page host:5000 instead.
 */
function resolveApiBase() {
  const fromEnv = String(
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) || "",
  )
    .trim()
    .replace(/\/$/, "");

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    const pageIsLan =
      hostname !== "localhost" &&
      hostname !== "127.0.0.1" &&
      isPrivateLanHost(hostname);
    const envIsLoopback =
      !fromEnv || /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:|\/|$)/i.test(fromEnv);
    if (pageIsLan && envIsLoopback) {
      return `${protocol}//${hostname}:5000`;
    }
  }

  return fromEnv || "http://localhost:5000";
}

const API_BASE = resolveApiBase();

const ACCOUNT_AUTH_STORAGE_KEY = "wellness_account_auth";

export function getApiBase() {
  return API_BASE;
}

const api = axios.create({
  baseURL: `${API_BASE}/api`,
});

function readAccountAuth() {
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

function writeAccountAuth(nextAuth) {
  if (typeof window === "undefined") return;
  if (!nextAuth?.accessToken) {
    window.localStorage.removeItem(ACCOUNT_AUTH_STORAGE_KEY);
    clearPanelSession();
    return;
  }
  window.localStorage.setItem(ACCOUNT_AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
}

function isAuthBypassUrl(url) {
  const requestUrl = String(url || "");
  return (
    requestUrl.includes("/account/auth/login") ||
    requestUrl.includes("/account/auth/otp") ||
    requestUrl.includes("/account/auth/refresh-token")
  );
}

function endExpiredPanelSession(reason) {
  writeAccountAuth(null);
  announcePanelSessionExpired(reason);
}

let refreshPromise = null;

async function refreshAccountToken() {
  if (refreshPromise) return refreshPromise;

  const expiryReason = getPanelSessionExpiryReason();
  if (expiryReason && expiryReason !== "missing") {
    endExpiredPanelSession(expiryReason);
    throw new Error("Session expired");
  }

  const current = readAccountAuth();
  const refreshToken = current?.refreshToken;
  if (!refreshToken) {
    throw new Error("Missing refresh token");
  }

  refreshPromise = axios
    .post(`${API_BASE}/api/account/auth/refresh-token`, { refreshToken })
    .then(({ data }) => {
      const updated = {
        accessToken: data?.accessToken,
        refreshToken: data?.refreshToken || refreshToken,
        account: data?.account || current.account,
      };
      writeAccountAuth(updated);
      if (updated.account) hydrateAdminProfile(updated.account);
      return updated.accessToken;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

api.interceptors.request.use((config) => {
  const stored = readAccountAuth();
  const expiryReason = stored?.accessToken ? getPanelSessionExpiryReason() : null;
  if (expiryReason && expiryReason !== "missing" && !isAuthBypassUrl(config?.url)) {
    endExpiredPanelSession(expiryReason);
    return Promise.reject(new Error("Session expired"));
  }
  const latestToken = stored?.accessToken;
  const existingAuth = config.headers?.Authorization || config.headers?.authorization;
  if (latestToken && !existingAuth) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${latestToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    hydrateStoreFromApiResponse(response);
    return response;
  },
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config;
    const requestUrl = String(originalRequest?.url || "");

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !requestUrl.includes("/account/auth/login") &&
      !requestUrl.includes("/account/auth/refresh-token")
    ) {
      originalRequest._retry = true;
      try {
        const newToken = await refreshAccountToken();
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        endExpiredPanelSession("idle");
      }
    }

    return Promise.reject(error);
  },
);

export function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function normalizeApiError(error) {
  const data = error?.response?.data;
  const status = error?.response?.status;
  const message =
    data?.message ||
    data?.error ||
    error?.message ||
    (status ? `Request failed (${status})` : "Request failed");
  const err = new Error(message);
  err.status = status;
  err.body = data;
  throw err;
}

export default api;
