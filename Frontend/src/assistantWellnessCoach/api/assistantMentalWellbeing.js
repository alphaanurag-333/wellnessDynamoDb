import assistantApi, { authHeader, normalizeApiError } from "./assistantApi.js";

function healUsersBase(userId) {
  return `/assistant/heal-users/${userId}/mental-wellbeing`;
}

export async function assistantListUserMentalWellbeing(token, userId) {
  try {
    const { data: body } = await assistantApi.get(healUsersBase(userId), {
      headers: authHeader(token),
    });
    return {
      assignments: body.assignments ?? [],
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantAssignMentalWellbeing(token, userId, { mentalWellbeingIds }) {
  try {
    const { data: body } = await assistantApi.post(
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

export async function assistantRemoveMentalWellbeing(token, userId, assignmentId) {
  try {
    await assistantApi.delete(`${healUsersBase(userId)}/${assignmentId}`, {
      headers: authHeader(token),
    });
    return { status: true };
  } catch (error) {
    normalizeApiError(error);
  }
}
