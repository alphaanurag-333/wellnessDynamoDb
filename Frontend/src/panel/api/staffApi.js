import axios from "axios";
import { getApiBase } from "../../api.js";

// Unified Staff RBAC Panel (M7) axios client — same shape as `api.js` /
// `coachApi.js` / `assistantApi.js`, pointed at `/api/staff/*` and keyed by
// its own storage slot so `/panel/login` never clashes with a legacy portal
// session in the same browser.
const STAFF_AUTH_STORAGE_KEY = "wellness_staff_auth";

const staffApi = axios.create({
  baseURL: `${getApiBase()}/api`,
});

function readStoredAuth() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STAFF_AUTH_STORAGE_KEY);
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
  if (!nextAuth?.staffToken || !nextAuth?.refreshToken || !nextAuth?.staffAccount) {
    window.localStorage.removeItem(STAFF_AUTH_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STAFF_AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
}

let refreshPromise = null;

async function refreshStaffToken() {
  if (refreshPromise) return refreshPromise;

  const current = readStoredAuth();
  const refreshToken = current?.refreshToken;
  if (!refreshToken) {
    throw new Error("Missing refresh token");
  }

  refreshPromise = axios
    .post(`${getApiBase()}/api/staff/auth/refresh-token`, { refreshToken })
    .then(({ data }) => {
      const updated = {
        ...current,
        staffToken: data?.accessToken,
        refreshToken: data?.refreshToken || refreshToken,
      };
      writeStoredAuth(updated);
      return updated.staffToken;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

staffApi.interceptors.request.use((config) => {
  // Legacy layouts (AdminLayout/WellnessCoachLayout/AssistantWellnessCoachLayout)
  // call `staffGetMe(theirOwnToken)` to keep the shared PanelSidebar/PanelHeader
  // fed with unified account data — never clobber an explicitly-passed
  // Authorization header with whatever (possibly unrelated/stale) token
  // happens to be sitting in `wellness_staff_auth` on this browser.
  if (config.headers?.Authorization) return config;
  const stored = readStoredAuth();
  const latestToken = stored?.staffToken;
  if (latestToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${latestToken}`;
  }
  return config;
});

staffApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config;
    const requestUrl = String(originalRequest?.url || "");

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !requestUrl.includes("/staff/auth/login") &&
      !requestUrl.includes("/staff/auth/refresh-token")
    ) {
      originalRequest._retry = true;
      try {
        const newToken = await refreshStaffToken();
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return staffApi(originalRequest);
      } catch {
        writeStoredAuth(null);
      }
    }

    if (status === 403 && typeof window !== "undefined") {
      const message = error?.response?.data?.message || "You don't have permission to do that.";
      window.dispatchEvent(new CustomEvent("panel:forbidden", { detail: { message, url: requestUrl } }));
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
    data?.message || data?.error || error?.message || (status ? `Request failed (${status})` : "Request failed");
  const err = new Error(message);
  err.status = status;
  err.body = data;
  throw err;
}

export default staffApi;
