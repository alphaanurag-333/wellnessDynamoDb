import api, { authHeader, normalizeApiError } from "../../api.js";

function base() {
  return "/admin/monthly-champions";
}

export async function adminListMonthlyChampions(token, { page = 1, limit = 10, status, monthYear } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (monthYear) q.set("monthYear", monthYear);
  try {
    const { data } = await api.get(`${base()}?${q}`, { headers: authHeader(token) });
    return {
      monthlyChampionPosts: data.monthlyChampionPosts ?? [],
      pagination: data.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetMonthlyChampionById(token, id) {
  try {
    const { data } = await api.get(`${base()}/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
    return data.monthlyChampionPost;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateMonthlyChampion(token, id, fields) {
  try {
    const { data } = await api.patch(`${base()}/${encodeURIComponent(id)}`, fields, {
      headers: authHeader(token),
    });
    return data.monthlyChampionPost;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteMonthlyChampionComment(token, postId, commentId) {
  try {
    await api.delete(
      `${base()}/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
      { headers: authHeader(token) }
    );
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminRunMonthlyChampionJob(token, { monthYear } = {}) {
  try {
    const { data } = await api.post(
      `${base()}/jobs/run`,
      monthYear ? { monthYear } : {},
      { headers: authHeader(token) }
    );
    return data.result;
  } catch (error) {
    normalizeApiError(error);
  }
}
