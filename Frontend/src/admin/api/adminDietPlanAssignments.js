import api, { authHeader, normalizeApiError } from "../../api.js";

function healUsersBase(userId) {
  return `/admin/heal-users/${userId}/diet-plan-assignments`;
}

export async function adminListUserDietPlanAssignments(token, userId) {
  try {
    const { data: body } = await api.get(healUsersBase(userId), {
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

export async function adminCreateDietPlanAssignment(token, userId, { startDate, planIds, note }) {
  try {
    const { data: body } = await api.post(
      healUsersBase(userId),
      { startDate, planIds, note },
      { headers: authHeader(token) }
    );
    return { assignment: body.assignment ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteDietPlanAssignment(token, userId, assignmentId) {
  try {
    await api.delete(`${healUsersBase(userId)}/${assignmentId}`, {
      headers: authHeader(token),
    });
    return { status: true };
  } catch (error) {
    normalizeApiError(error);
  }
}
