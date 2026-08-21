import axios from "axios";
import {
  hydrateAdminProfile,
  hydrateStoreFromApiResponse,
} from "./store/hydrateFromApi.js";

// Prefer local backend during development so panel picks up unpaid onboard fixes.
// Override with VITE_API_URL when you need the remote API.
// const API_BASE = "http://localhost:5000"; 
const API_BASE =  "https://wellness-development.developmentalphawizz.com";
// const API_BASE = "https://wellness.developmentalphawizz.com:5005";
// const API_BASE = "https://wellness-aws.developmentalphawizz.com:5001";
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
    return;
  }
  window.localStorage.setItem(ACCOUNT_AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
}

let refreshPromise = null;

async function refreshAccountToken() {
  if (refreshPromise) return refreshPromise;

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
        writeAccountAuth(null);
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
