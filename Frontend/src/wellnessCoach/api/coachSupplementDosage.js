import coachApi, { authHeader, normalizeApiError } from "./coachApi.js";

function healUsersBase(userId) {
  return `/coach/heal-users/${userId}/supplement-dosages`;
}

export async function coachListUserSupplementDosages(token, userId) {
  try {
    const { data: body } = await coachApi.get(healUsersBase(userId), {
      headers: authHeader(token),
    });
    return {
      dosages: body.dosages ?? [],
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachCreateSupplementDosage(token, userId, payload) {
  try {
    const { data: body } = await coachApi.post(healUsersBase(userId), payload, {
      headers: authHeader(token),
    });
    return {
      dosage: body.dosage ?? null,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachStopSupplementDosage(token, userId, dosageId) {
  try {
    await coachApi.delete(`${healUsersBase(userId)}/${dosageId}`, {
      headers: authHeader(token),
    });
    return { status: true };
  } catch (error) {
    normalizeApiError(error);
  }
}
