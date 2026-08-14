import api, { normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

function authHeader() {
  const token = getAccountToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function formatRelativeTime(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const diffMs = Date.now() - then;
  if (diffMs < 0) return "just now";

  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week}w ago`;
  return new Date(iso).toLocaleDateString();
}

export function mapInboxItem(item) {
  if (!item) return null;
  return {
    id: item.id,
    icon: item.icon || "🔔",
    kind: item.kind || "System",
    kindKey: item.kindKey || "system",
    time: formatRelativeTime(item.createdAt),
    createdAt: item.createdAt,
    title: item.title || "",
    from: item.from || "System",
    unread: Boolean(item.unread),
    href: item.href || null,
    subjectUserId: item.subjectUserId || null,
  };
}

export async function fetchAdminInbox({ page = 1, limit = 30, unreadOnly = false } = {}) {
  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (unreadOnly) params.set("unread", "true");

    const { data } = await api.get(`/account/inbox?${params}`, { headers: authHeader() });
    const notifications = (data.notifications || []).map(mapInboxItem).filter(Boolean);
    return {
      notifications,
      pagination: data.pagination || null,
      unreadCount: notifications.filter((n) => n.unread).length,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchAdminInboxUnreadCount() {
  try {
    const { data } = await api.get("/account/inbox/unread-count", { headers: authHeader() });
    return Number(data.unreadCount) || 0;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function markAdminInboxItemRead(id) {
  try {
    const { data } = await api.patch(`/account/inbox/${encodeURIComponent(id)}/read`, null, {
      headers: authHeader(),
    });
    return mapInboxItem(data.notification);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function markAllAdminInboxRead() {
  try {
    const { data } = await api.post("/account/inbox/read-all", null, { headers: authHeader() });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}
