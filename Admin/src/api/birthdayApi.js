import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

const POSTS_BASE = "/admin/birthday-posts";
const NOTIFS_BASE = "/admin/birthday-notifications";
const PAGE_SIZE = 20;

function tokenOrStored(token) {
  return token || getAccountToken();
}

export function todayDateOnly() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatClock(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function mapBirthdayPost(row) {
  if (!row) return null;
  const id = row.id || row._id;
  if (!id) return null;
  return {
    id,
    userId: row.userId || "",
    postDate: String(row.postDate || "").trim(),
    message: String(row.message || "").trim(),
    name: String(row.user?.name || "").trim() || "Unknown",
    profileImage: row.user?.profileImage || "",
    commentCount: Number(row.commentCount) || 0,
    live: row.status !== "inactive",
    status: row.status === "inactive" ? "inactive" : "active",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapBirthdayNotification(row) {
  if (!row) return null;
  const id = row.id || row._id;
  if (!id) return null;
  const status = String(row.status || "pending").toLowerCase();
  const normalized =
    status === "sent" || status === "failed" || status === "pending" ? status : "pending";
  return {
    id,
    userId: row.userId || "",
    notificationDate: String(row.notificationDate || "").trim(),
    message: String(row.message || "").trim(),
    name: String(row.user?.name || "").trim() || "Unknown",
    profileImage: row.user?.profileImage || "",
    role: row.user?.role || row.user?.activeRole || "Client",
    status: normalized,
    time: formatClock(row.sentAt || row.updatedAt || row.createdAt),
    sentAt: row.sentAt || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function adminListBirthdayPosts(
  token,
  { page = 1, limit = PAGE_SIZE, status, postDate } = {},
) {
  const params = { page, limit };
  if (status) params.status = status;
  if (String(postDate || "").trim()) params.postDate = String(postDate).trim();
  try {
    const { data } = await api.get(POSTS_BASE, {
      params,
      headers: authHeader(tokenOrStored(token)),
    });
    const items = (Array.isArray(data.birthdayPosts) ? data.birthdayPosts : [])
      .map(mapBirthdayPost)
      .filter(Boolean);
    return {
      items,
      pagination: data.pagination || { page, limit, total: items.length, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateBirthdayPost(token, id, fields = {}) {
  const payload = {};
  if (fields.message !== undefined) payload.message = String(fields.message || "").trim();
  if (fields.status !== undefined) payload.status = String(fields.status);
  else if (fields.live !== undefined) payload.status = fields.live ? "active" : "inactive";
  try {
    const { data } = await api.patch(`${POSTS_BASE}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(tokenOrStored(token)),
    });
    return mapBirthdayPost(data.birthdayPost);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminListBirthdayNotifications(
  token,
  { page = 1, limit = PAGE_SIZE, status, notificationDate, search } = {},
) {
  const params = { page, limit };
  if (status) params.status = status;
  if (String(notificationDate || "").trim()) {
    params.notificationDate = String(notificationDate).trim();
  }
  if (String(search || "").trim()) params.search = String(search).trim();
  try {
    const { data } = await api.get(NOTIFS_BASE, {
      params,
      headers: authHeader(tokenOrStored(token)),
    });
    const items = (Array.isArray(data.birthdayNotifications) ? data.birthdayNotifications : [])
      .map(mapBirthdayNotification)
      .filter(Boolean);
    return {
      items,
      pagination: data.pagination || { page, limit, total: items.length, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminResendBirthdayNotification(token, id) {
  try {
    const { data } = await api.post(
      `${NOTIFS_BASE}/${encodeURIComponent(id)}/resend`,
      {},
      { headers: authHeader(tokenOrStored(token)) },
    );
    return {
      message: data?.message || "Birthday notification resent",
      notification: mapBirthdayNotification(data?.birthdayNotification),
      push: data?.push || null,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminRunBirthdayJob(token, { dateOnly } = {}) {
  const body = {};
  if (String(dateOnly || "").trim()) body.dateOnly = String(dateOnly).trim();
  try {
    const { data } = await api.post(`${NOTIFS_BASE}/jobs/run`, body, {
      headers: authHeader(tokenOrStored(token)),
    });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export { PAGE_SIZE as BIRTHDAY_PAGE_SIZE };
