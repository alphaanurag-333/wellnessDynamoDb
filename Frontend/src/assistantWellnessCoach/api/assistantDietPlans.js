import assistantApi, { authHeader, normalizeApiError } from "./assistantApi.js";

function healUsersBase(userId) {
  return `/assistant/heal-users/${userId}/diet-plans`;
}

export async function assistantListUserDietPlans(token, userId) {
  try {
    const { data: body } = await assistantApi.get(healUsersBase(userId), {
      headers: authHeader(token),
    });
    return {
      dietPlans: body.dietPlans ?? [],
      recommended: body.recommended ?? null,
      history: body.history ?? [],
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantUploadDietPlan(token, userId, { file, title, note }) {
  try {
    const fd = new FormData();
    fd.append("file", file);
    if (title !== undefined && title !== null) fd.append("title", String(title));
    if (note !== undefined && note !== null) fd.append("note", String(note));

    const { data: body } = await assistantApi.post(healUsersBase(userId), fd, {
      headers: {
        ...authHeader(token),
        "Content-Type": "multipart/form-data",
      },
    });
    return { dietPlan: body.dietPlan ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantDeleteDietPlan(token, userId, planId) {
  try {
    await assistantApi.delete(`${healUsersBase(userId)}/${planId}`, {
      headers: authHeader(token),
    });
    return { status: true };
  } catch (error) {
    normalizeApiError(error);
  }
}
