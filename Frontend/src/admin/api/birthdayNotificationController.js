import api, { authHeader, normalizeApiError } from "../../api.js";

function base() {
  return "/admin/birthday-notifications";
}

export async function adminListBirthdayNotifications(
  token,
  { page = 1, limit = 10, status, notificationDate, search } = {}
) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (notificationDate) q.set("notificationDate", notificationDate);
  if (search?.trim()) q.set("search", search.trim());
  try {
    const { data } = await api.get(`${base()}?${q}`, { headers: authHeader(token) });
    return {
      birthdayNotifications: data.birthdayNotifications ?? [],
      pagination: data.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetBirthdayNotificationById(token, id) {
  try {
    const { data } = await api.get(`${base()}/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
    return { notification: data.birthdayNotification, user: data.user };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminResendBirthdayNotification(token, id) {
  try {
    const { data } = await api.post(`${base()}/${encodeURIComponent(id)}/resend`, {}, {
      headers: authHeader(token),
    });
    return {
      notification: data.birthdayNotification,
      push: data.push,
      message: data.message,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminRunBirthdayJob(token, { dateOnly } = {}) {
  try {
    const { data } = await api.post(
      `${base()}/jobs/run`,
      dateOnly ? { dateOnly } : {},
      { headers: authHeader(token) }
    );
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}
