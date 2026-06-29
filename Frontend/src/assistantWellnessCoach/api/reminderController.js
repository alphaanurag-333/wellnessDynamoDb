import assistantApi, { authHeader, normalizeApiError } from "./assistantApi.js";

function healUsersBase(userId) {
  return `/assistant/heal-users/${userId}/reminders`;
}

export async function assistantListUserReminders(token, userId) {
  try {
    const { data: body } = await assistantApi.get(healUsersBase(userId), {
      headers: authHeader(token),
    });
    return { reminders: body.reminders ?? [] };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantCreateUserReminder(token, userId, payload) {
  try {
    const { data: body } = await assistantApi.post(healUsersBase(userId), payload, {
      headers: authHeader(token),
    });
    return { reminder: body.reminder ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantUpdateUserReminder(token, userId, reminderId, payload) {
  try {
    const { data: body } = await assistantApi.put(`${healUsersBase(userId)}/${reminderId}`, payload, {
      headers: authHeader(token),
    });
    return { reminder: body.reminder ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantToggleUserReminder(token, userId, reminderId, isActive) {
  try {
    const { data: body } = await assistantApi.patch(
      `${healUsersBase(userId)}/${reminderId}/toggle`,
      isActive !== undefined ? { isActive } : {},
      { headers: authHeader(token) }
    );
    return { reminder: body.reminder ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantDeleteUserReminder(token, userId, reminderId) {
  try {
    await assistantApi.delete(`${healUsersBase(userId)}/${reminderId}`, {
      headers: authHeader(token),
    });
    return { status: true };
  } catch (error) {
    normalizeApiError(error);
  }
}
