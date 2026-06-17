import axios from "axios";
import { getApiBase } from "../../api.js";

const ASSISTANT_AUTH_STORAGE_KEY = "wellness_assistant_auth";

const assistantApi = axios.create({
  baseURL: `${getApiBase()}/api`,
});

function readStoredAuth() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ASSISTANT_AUTH_STORAGE_KEY);
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
  if (!nextAuth?.assistantToken || !nextAuth?.refreshToken || !nextAuth?.assistant) {
    window.localStorage.removeItem(ASSISTANT_AUTH_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(ASSISTANT_AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
}

let refreshPromise = null;

async function refreshAssistantToken() {
  if (refreshPromise) return refreshPromise;

  const current = readStoredAuth();
  const refreshToken = current?.refreshToken;
  if (!refreshToken) {
    throw new Error("Missing refresh token");
  }

  refreshPromise = axios
    .post(`${getApiBase()}/api/assistant/auth/refresh-token`, { refreshToken })
    .then(({ data }) => {
      const updated = {
        ...current,
        assistantToken: data?.accessToken,
        refreshToken: data?.refreshToken || refreshToken,
      };
      writeStoredAuth(updated);
      return updated.assistantToken;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

assistantApi.interceptors.request.use((config) => {
  const stored = readStoredAuth();
  const latestToken = stored?.assistantToken;
  if (latestToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${latestToken}`;
  }
  return config;
});

assistantApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config;
    const requestUrl = String(originalRequest?.url || "");

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !requestUrl.includes("/assistant/auth/login") &&
      !requestUrl.includes("/assistant/auth/refresh-token")
    ) {
      originalRequest._retry = true;
      try {
        const newToken = await refreshAssistantToken();
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return assistantApi(originalRequest);
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

export default assistantApi;
