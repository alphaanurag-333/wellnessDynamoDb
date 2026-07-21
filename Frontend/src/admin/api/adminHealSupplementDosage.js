import api, { authHeader, normalizeApiError } from "../../api.js";

function healUsersBase(userId) {
  return `/admin/heal-users/${userId}/supplement-dosages`;
}

export async function adminListUserSupplementDosages(token, userId) {
  try {
    const { data: body } = await api.get(healUsersBase(userId), {
      headers: authHeader(token),
    });
    return {
      dosages: body.dosages ?? [],
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateSupplementDosage(token, userId, payload) {
  try {
    const { data: body } = await api.post(healUsersBase(userId), payload, {
      headers: authHeader(token),
    });
    return {
      dosage: body.dosage ?? null,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminStopSupplementDosage(token, userId, dosageId) {
  try {
    await api.delete(`${healUsersBase(userId)}/${dosageId}`, {
      headers: authHeader(token),
    });
    return { status: true };
  } catch (error) {
    normalizeApiError(error);
  }
}
