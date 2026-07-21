import api, { authHeader, normalizeApiError } from "../../api.js";

function healUsersBase(userId) {
  return `/admin/heal-users/${userId}/physical-exercises`;
}

export async function adminListUserPhysicalExercises(token, userId) {
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

export async function adminAssignPhysicalExercises(token, userId, { exerciseIds }) {
  try {
    const { data: body } = await api.post(
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

export async function adminRemovePhysicalExercise(token, userId, assignmentId) {
  try {
    await api.delete(`${healUsersBase(userId)}/${assignmentId}`, {
      headers: authHeader(token),
    });
    return { status: true };
  } catch (error) {
    normalizeApiError(error);
  }
}
