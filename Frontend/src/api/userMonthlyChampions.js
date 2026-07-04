import api, { authHeader, normalizeApiError } from "../api.js";

function base() {
  return "/user/monthly-champions";
}

export async function userListMonthlyChampions(token, { monthYear } = {}) {
  const q = new URLSearchParams();
  if (monthYear) q.set("monthYear", monthYear);
  try {
    const { data } = await api.get(`${base()}?${q}`, { headers: authHeader(token) });
    return {
      monthYear: data.monthYear ?? null,
      monthlyChampions: Array.isArray(data.monthlyChampions) ? data.monthlyChampions : [],
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function userGetMyMonthlyChampionHistory(token) {
  try {
    const { data } = await api.get(`${base()}/mine`, { headers: authHeader(token) });
    return Array.isArray(data.monthlyChampions) ? data.monthlyChampions : [];
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function userGetMonthlyChampionById(token, id) {
  try {
    const { data } = await api.get(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
    return data.monthlyChampion ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function userListMonthlyChampionComments(token, postId) {
  try {
    const { data } = await api.get(`${base()}/${encodeURIComponent(postId)}/comments`, {
      headers: authHeader(token),
    });
    return Array.isArray(data.comments) ? data.comments : [];
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function userCreateMonthlyChampionComment(token, postId, comment) {
  try {
    const { data } = await api.post(
      `${base()}/${encodeURIComponent(postId)}/comments`,
      { comment: String(comment ?? "").trim() },
      { headers: authHeader(token) }
    );
    return data.comment;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function userDeleteMonthlyChampionComment(token, postId, commentId) {
  try {
    await api.delete(`${base()}/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`, {
      headers: authHeader(token),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}
