import api, { authHeader, normalizeApiError } from "../../api.js";

function healUsersBase(userId) {
  return `/admin/heal-users/${userId}/reminders`;
}

export async function adminListUserReminders(token, userId) {
  try {
    const { data: body } = await api.get(healUsersBase(userId), {
      headers: authHeader(token),
    });
    return { reminders: body.reminders ?? [] };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateUserReminder(token, userId, payload) {
  try {
    const { data: body } = await api.post(healUsersBase(userId), payload, {
      headers: authHeader(token),
    });
    return { reminder: body.reminder ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateUserReminder(token, userId, reminderId, payload) {
  try {
    const { data: body } = await api.put(`${healUsersBase(userId)}/${reminderId}`, payload, {
      headers: authHeader(token),
    });
    return { reminder: body.reminder ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminToggleUserReminder(token, userId, reminderId, isActive) {
  try {
    const { data: body } = await api.patch(
      `${healUsersBase(userId)}/${reminderId}/toggle`,
      isActive !== undefined ? { isActive } : {},
      { headers: authHeader(token) }
    );
    return { reminder: body.reminder ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteUserReminder(token, userId, reminderId) {
  try {
    await api.delete(`${healUsersBase(userId)}/${reminderId}`, {
      headers: authHeader(token),
    });
    return { status: true };
  } catch (error) {
    normalizeApiError(error);
  }
}
