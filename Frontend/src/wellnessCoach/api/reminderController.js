import coachApi, { authHeader, normalizeApiError } from "./coachApi.js";

function healUsersBase(userId) {
  return `/coach/heal-users/${userId}/reminders`;
}

export async function coachListUserReminders(token, userId) {
  try {
    const { data: body } = await coachApi.get(healUsersBase(userId), {
      headers: authHeader(token),
    });
    return { reminders: body.reminders ?? [] };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachCreateUserReminder(token, userId, payload) {
  try {
    const { data: body } = await coachApi.post(healUsersBase(userId), payload, {
      headers: authHeader(token),
    });
    return { reminder: body.reminder ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachUpdateUserReminder(token, userId, reminderId, payload) {
  try {
    const { data: body } = await coachApi.put(`${healUsersBase(userId)}/${reminderId}`, payload, {
      headers: authHeader(token),
    });
    return { reminder: body.reminder ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachToggleUserReminder(token, userId, reminderId, isActive) {
  try {
    const { data: body } = await coachApi.patch(
      `${healUsersBase(userId)}/${reminderId}/toggle`,
      isActive !== undefined ? { isActive } : {},
      { headers: authHeader(token) }
    );
    return { reminder: body.reminder ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachDeleteUserReminder(token, userId, reminderId) {
  try {
    await coachApi.delete(`${healUsersBase(userId)}/${reminderId}`, {
      headers: authHeader(token),
    });
    return { status: true };
  } catch (error) {
    normalizeApiError(error);
  }
}
