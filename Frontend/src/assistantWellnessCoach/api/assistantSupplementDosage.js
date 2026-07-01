import assistantApi, { authHeader, normalizeApiError } from "./assistantApi.js";

function healUsersBase(userId) {
  return `/assistant/heal-users/${userId}/supplement-dosages`;
}

export async function assistantListUserSupplementDosages(token, userId) {
  try {
    const { data: body } = await assistantApi.get(healUsersBase(userId), {
      headers: authHeader(token),
    });
    return {
      dosages: body.dosages ?? [],
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantCreateSupplementDosage(token, userId, payload) {
  try {
    const { data: body } = await assistantApi.post(healUsersBase(userId), payload, {
      headers: authHeader(token),
    });
    return {
      dosage: body.dosage ?? null,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantStopSupplementDosage(token, userId, dosageId) {
  try {
    await assistantApi.delete(`${healUsersBase(userId)}/${dosageId}`, {
      headers: authHeader(token),
    });
    return { status: true };
  } catch (error) {
    normalizeApiError(error);
  }
}
