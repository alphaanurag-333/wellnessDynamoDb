import axios from "axios";
import { getApiBase } from "../../api.js";

const COACH_AUTH_STORAGE_KEY = "wellness_coach_auth";

const coachApi = axios.create({
  baseURL: `${getApiBase()}/api`,
});

function readStoredAuth() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COACH_AUTH_STORAGE_KEY);
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
  if (!nextAuth?.coachToken || !nextAuth?.refreshToken || !nextAuth?.coach) {
    window.localStorage.removeItem(COACH_AUTH_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(COACH_AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
}

let refreshPromise = null;

async function refreshCoachToken() {
  if (refreshPromise) return refreshPromise;

  const current = readStoredAuth();
  const refreshToken = current?.refreshToken;
  if (!refreshToken) {
    throw new Error("Missing refresh token");
  }

  refreshPromise = axios
    .post(`${getApiBase()}/api/coach/auth/refresh-token`, { refreshToken })
    .then(({ data }) => {
      const updated = {
        ...current,
        coachToken: data?.accessToken,
        refreshToken: data?.refreshToken || refreshToken,
      };
      writeStoredAuth(updated);
      return updated.coachToken;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

coachApi.interceptors.request.use((config) => {
  const stored = readStoredAuth();
  const latestToken = stored?.coachToken;
  if (latestToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${latestToken}`;
  }
  return config;
});

coachApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config;
    const requestUrl = String(originalRequest?.url || "");

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !requestUrl.includes("/coach/auth/login") &&
      !requestUrl.includes("/coach/auth/refresh-token")
    ) {
      originalRequest._retry = true;
      try {
        const newToken = await refreshCoachToken();
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return coachApi(originalRequest);
      } catch {
        writeStoredAuth(null);
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
    data?.message || data?.error || error?.message || (status ? `Request failed (${status})` : "Request failed");
  const err = new Error(message);
  err.status = status;
  err.body = data;
  throw err;
}

export default coachApi;
