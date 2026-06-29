import api, { authHeader, normalizeApiError } from "../../api.js";

function dietPlansBase() {
  return "/admin/diet-plans";
}

export async function adminListUserDietPlans(token, userId) {
  try {
    const { data: body } = await api.get(`${dietPlansBase()}/users/${userId}`, {
      headers: authHeader(token),
    });
    return {
      user: body.user ?? null,
      dietPlans: body.dietPlans ?? [],
      recommended: body.recommended ?? null,
      history: body.history ?? [],
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteDietPlan(token, planId) {
  try {
    await api.delete(`${dietPlansBase()}/${planId}`, {
      headers: authHeader(token),
    });
    return { status: true };
  } catch (error) {
    normalizeApiError(error);
  }
}
