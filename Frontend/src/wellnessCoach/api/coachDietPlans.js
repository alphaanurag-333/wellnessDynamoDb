import coachApi, { authHeader, normalizeApiError } from "./coachApi.js";

function healUsersBase(userId) {
  return `/coach/heal-users/${userId}/diet-plans`;
}

export async function coachListUserDietPlans(token, userId) {
  try {
    const { data: body } = await coachApi.get(healUsersBase(userId), {
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

export async function coachUploadDietPlan(token, userId, { file, title, note }) {
  try {
    const fd = new FormData();
    fd.append("file", file);
    if (title !== undefined && title !== null) fd.append("title", String(title));
    if (note !== undefined && note !== null) fd.append("note", String(note));

    const { data: body } = await coachApi.post(healUsersBase(userId), fd, {
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

export async function coachDeleteDietPlan(token, userId, planId) {
  try {
    await coachApi.delete(`${healUsersBase(userId)}/${planId}`, {
      headers: authHeader(token),
    });
    return { status: true };
  } catch (error) {
    normalizeApiError(error);
  }
}
