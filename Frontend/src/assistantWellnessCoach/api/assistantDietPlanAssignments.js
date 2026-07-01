import assistantApi, { authHeader, normalizeApiError } from "./assistantApi.js";

function healUsersBase(userId) {
  return `/assistant/heal-users/${userId}/diet-plan-assignments`;
}

export async function assistantListUserDietPlanAssignments(token, userId) {
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

export async function assistantCreateDietPlanAssignment(token, userId, { startDate, planIds, note }) {
  try {
    const { data: body } = await assistantApi.post(
      healUsersBase(userId),
      { startDate, planIds, note },
      { headers: authHeader(token) }
    );
    return { assignment: body.assignment ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantDeleteDietPlanAssignment(token, userId, assignmentId) {
  try {
    await assistantApi.delete(`${healUsersBase(userId)}/${assignmentId}`, {
      headers: authHeader(token),
    });
    return { status: true };
  } catch (error) {
    normalizeApiError(error);
  }
}
