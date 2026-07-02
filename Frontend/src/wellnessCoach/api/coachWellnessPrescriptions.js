import coachApi, { authHeader, normalizeApiError } from "./coachApi.js";

function healUsersBase(userId) {
  return `/coach/heal-users/${userId}/wellness-prescriptions`;
}

export async function coachListUserWellnessPrescriptions(token, userId) {
  try {
    const { data: body } = await coachApi.get(healUsersBase(userId), {
      headers: authHeader(token),
    });
    return {
      assignments: body.assignments ?? [],
      recommended: body.recommended ?? null,
      history: body.history ?? [],
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachCreateWellnessPrescription(token, userId, { date, prescriptionIds, customPoints }) {
  try {
    const { data: body } = await coachApi.post(
      healUsersBase(userId),
      { date, prescriptionIds, customPoints },
      { headers: authHeader(token) }
    );
    return { assignment: body.assignment ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachDeleteWellnessPrescription(token, userId, assignmentId) {
  try {
    await coachApi.delete(`${healUsersBase(userId)}/${assignmentId}`, {
      headers: authHeader(token),
    });
    return { status: true };
  } catch (error) {
    normalizeApiError(error);
  }
}
