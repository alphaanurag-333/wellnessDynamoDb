import assistantApi, { authHeader, normalizeApiError } from "./assistantApi.js";

function healUsersBase(userId) {
  return `/assistant/heal-users/${userId}/wellness-prescriptions`;
}

export async function assistantListUserWellnessPrescriptions(token, userId) {
  try {
    const { data: body } = await assistantApi.get(healUsersBase(userId), {
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

export async function assistantCreateWellnessPrescription(token, userId, { date, prescriptionIds, customPoints }) {
  try {
    const { data: body } = await assistantApi.post(
      healUsersBase(userId),
      { date, prescriptionIds, customPoints },
      { headers: authHeader(token) }
    );
    return { assignment: body.assignment ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantDeleteWellnessPrescription(token, userId, assignmentId) {
  try {
    await assistantApi.delete(`${healUsersBase(userId)}/${assignmentId}`, {
      headers: authHeader(token),
    });
    return { status: true };
  } catch (error) {
    normalizeApiError(error);
  }
}
