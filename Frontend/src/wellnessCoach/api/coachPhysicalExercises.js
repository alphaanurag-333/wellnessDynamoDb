import coachApi, { authHeader, normalizeApiError } from "./coachApi.js";

function healUsersBase(userId) {
  return `/coach/heal-users/${userId}/physical-exercises`;
}

export async function coachListUserPhysicalExercises(token, userId) {
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

export async function coachAssignPhysicalExercises(token, userId, { exerciseIds }) {
  try {
    const { data: body } = await coachApi.post(
      healUsersBase(userId),
      { exerciseIds },
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

export async function coachRemovePhysicalExercise(token, userId, assignmentId) {
  try {
    await coachApi.delete(`${healUsersBase(userId)}/${assignmentId}`, {
      headers: authHeader(token),
    });
    return { status: true };
  } catch (error) {
    normalizeApiError(error);
  }
}
