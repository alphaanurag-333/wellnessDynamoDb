import coachApi, { authHeader, normalizeApiError } from "./coachApi.js";

function healUsersBase(userId) {
  return `/coach/heal-users/${userId}/mental-wellbeing`;
}

export async function coachListUserMentalWellbeing(token, userId) {
  try {
    const { data: body } = await coachApi.get(healUsersBase(userId), {
      headers: authHeader(token),
    });
    return {
      assignments: body.assignments ?? [],
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachAssignMentalWellbeing(token, userId, { mentalWellbeingIds }) {
  try {
    const { data: body } = await coachApi.post(
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

export async function coachRemoveMentalWellbeing(token, userId, assignmentId) {
  try {
    await coachApi.delete(`${healUsersBase(userId)}/${assignmentId}`, {
      headers: authHeader(token),
    });
    return { status: true };
  } catch (error) {
    normalizeApiError(error);
  }
}
