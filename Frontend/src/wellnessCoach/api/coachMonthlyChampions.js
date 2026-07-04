import coachApi, { authHeader, normalizeApiError } from "./coachApi.js";

function base() {
  return "/coach/monthly-champions";
}

export async function coachListMonthlyChampions(token, { page = 1, limit = 20, monthYear } = {}) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (monthYear) q.set("monthYear", monthYear);
  try {
    const { data } = await coachApi.get(`${base()}?${q}`, { headers: authHeader(token) });
    return {
      monthlyChampionPosts: Array.isArray(data.monthlyChampionPosts) ? data.monthlyChampionPosts : [],
      monthYear: data.monthYear ?? null,
      pagination: data.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachGetMonthlyChampionById(token, id) {
  try {
    const { data } = await coachApi.get(`${base()}/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
    return data.monthlyChampionPost;
  } catch (error) {
    normalizeApiError(error);
  }
}
