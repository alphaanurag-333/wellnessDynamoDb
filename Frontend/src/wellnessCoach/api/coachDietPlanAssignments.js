import coachApi, { authHeader, normalizeApiError } from "./coachApi.js";

function healUsersBase(userId) {
  return `/coach/heal-users/${userId}/diet-plan-assignments`;
}

export async function coachListUserDietPlanAssignments(token, userId) {
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

export async function coachCreateDietPlanAssignment(token, userId, { startDate, planIds, note }) {
  try {
    const { data: body } = await coachApi.post(
      healUsersBase(userId),
      { startDate, planIds, note },
      { headers: authHeader(token) }
    );
    return { assignment: body.assignment ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachDeleteDietPlanAssignment(token, userId, assignmentId) {
  try {
    await coachApi.delete(`${healUsersBase(userId)}/${assignmentId}`, {
      headers: authHeader(token),
    });
    return { status: true };
  } catch (error) {
    normalizeApiError(error);
  }
}
