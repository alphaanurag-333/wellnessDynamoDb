import api, { authHeader, normalizeApiError } from "../../api.js";

function healUsersBase(userId) {
  return `/admin/heal-users/${userId}/mental-wellbeing`;
}

export async function adminListUserMentalWellbeing(token, userId) {
  try {
    const { data: body } = await api.get(healUsersBase(userId), {
      headers: authHeader(token),
    });
    return {
      assignments: body.assignments ?? [],
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminAssignMentalWellbeing(token, userId, { mentalWellbeingIds }) {
  try {
    const { data: body } = await api.post(
      healUsersBase(userId),
      { mentalWellbeingIds },
      { headers: authHeader(token) }
    );
    return {
      assignments: body.assignments ?? [],
      skippedInvalid: body.skippedInvalid ?? [],
      skippedDuplicate: body.skippedDuplicate ?? [],
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminRemoveMentalWellbeing(token, userId, assignmentId) {
  try {
    await api.delete(`${healUsersBase(userId)}/${assignmentId}`, {
      headers: authHeader(token),
    });
    return { status: true };
  } catch (error) {
    normalizeApiError(error);
  }
}
