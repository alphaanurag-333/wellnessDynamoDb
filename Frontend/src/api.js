import axios from "axios";

const API_BASE = "http://localhost:5000";
// const API_BASE = "https://wellness-development.developmentalphawizz.com";
//  const API_BASE = "https://wellness.developmentalphawizz.com:5005";
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
