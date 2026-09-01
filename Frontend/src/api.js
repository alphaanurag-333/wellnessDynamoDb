import axios from "axios";

// Prefer local backend during development so the site reflects Admin → Configs changes.
// Override with VITE_API_URL when you need the remote API.
// const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_BASE = "https://wellness-development.developmentalphawizz.com";
// const API_BASE = "https://wellness.developmentalphawizz.com:5005";
// const API_BASE = "https://wellness-aws.developmentalphawizz.com:5001";

export function getApiBase() {
  return API_BASE;
}

const api = axios.create({
  baseURL: `${API_BASE}/api`,
});

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
